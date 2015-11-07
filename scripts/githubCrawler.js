/**
 * Created by SergeyA on 10/23/2015.
 */


var Promise = require('native-promise-only');
var superagent = require('superagent');
var colors = require('colors');

var basicUrl = 'http://localhost:7474/db/data/';
var userId = 'neo4j';

if(typeof pwd === 'undefined')
  return console.log('Please provide the neo4j password!');


var userNodeIndexLabel = 'User';
var followRelationIndexLabel = 'Follow';
var repositoryIndexLabel = 'Repository';
var starRelationIndexLabel = 'Starred';
// etc.

var uniquenessSetting = '/?uniqueness=get_or_create';

var createUserNodeUrl = basicUrl + 'index/node/' + userNodeIndexLabel + uniquenessSetting;
var createFollowRelationUrl =  basicUrl + 'index/relationship/' + followRelationIndexLabel +  uniquenessSetting;

var indexUrl = basicUrl + 'schema/index/';
var nodeUrl = basicUrl + 'node/';


var userStatus = {
    handled : 0,
    created : 1
};

var nodeStatus = {
    created : 0,
    existing : 1
}

function create_node_response(resolve, reject, data_type){
    data_type = data_type || 'node';
    return function(err, res){
        if(err){
            console.log('error creating ' + data_type + ' : ' + err.status);
            if(err.status == 500){
              console.log('internal server errror', err);
              process.exit(1); // terminate the process entirely!
            }
            return void reject(err);
        }
        if(res.status === 201){ // created
            console.log('created ' + data_type + ' : ' + JSON.stringify(res.body.data));
            return void resolve({
                                id : res.body.metadata.id,
                                data : res.body.data
            });
        }
        if(res.status === 200){ // OK
            console.log('obtained ' + data_type + ' : ' + JSON.stringify(res.body.data));
            return void resolve({
                                id : res.body.metadata.id,
                                data : res.body.data
            });
        }
        console.log('error creating ' + data_type + ' : ' + res.status);
        return void reject(res);
    }
}

function create_general_response(resolve, reject, action){
    return function(err, res){
        if(err){
            console.log(action + ' failed :  ' + err.status);
            return reject(err);
        }
        else{
            console.log(action + ' succeded');
            return resolve(res.body);
        }
    }
}

function setNodeProperties(nodeId, properties){
  return new Promise(function(resolve, reject){
    superagent
    .put(nodeUrl + nodeId + '/properties')
    .auth(userId, pwd)
    .send(properties)
    .end(create_general_response(resolve, reject, 'set props'));
  });
}


//todo : create node and set label!
function setNodeLabel(node, label){
  return new Promise(function(resolve, reject){
    superagent
    .post(nodeUrl + node.id + '/labels')
    .auth(userId, pwd)
    .send([label])
    .end(function(err, res){
        if(err)
            return reject(err);
        resolve(node);
    })
  });
}

function createUserNode(login, status){
  var nodeData = {
    key: 'login',
    value: login,
    properties:{
      login : login,
      status : status
    }
  };
    
  return new Promise(function(resolve, reject){
    superagent
    .post(createUserNodeUrl)
    .auth(userId, pwd)
    .send(nodeData)
    .end(create_node_response(resolve, reject, 'user'));
  }).then(userNode=>setNodeLabel(userNode, 'User'))
}


function addFollowerRelation(follower, followee){
  var relationData = {
    key : 'login',
    value : follower.id + '-' + followee.id,
    start : nodeUrl + follower.id,
    end : nodeUrl + followee.id,
    type : 'follow'
  };
  
  return new Promise(function(resolve, reject){
    superagent
    .post(createFollowRelationUrl)
    .auth(userId, pwd)
    .send(relationData)
    .end(create_node_response(resolve, reject, 'relation'));
  });
}


function addUserFollowers(user, followers, reverse){
    var addRelationFunc = reverse ?
        follower => addFollowerRelation(user, follower) :
        follower => addFollowerRelation(follower, user);   
    
    return Promise.resolve(0).then(function next(index){
        if(index < followers.length)
            return createUserNode(followers[index], userStatus.created).then(addRelationFunc).then(()=>index+1).then(next);
        else
            return followers;

    });
}

var ghWorker = require('./dataCenter.js');

var users = ['mohamedmansour'];

var len = 100;

Promise.resolve(0).then(function next(index){
    if(index < len)
        return traverse(users[index]).then(()=>next(index+1));
    else
        return 0;
}).then(()=>console.log(colors.blue('done working with users')), (err)=>console.log('Promise error: ', err));

function traverse(login){

    console.log(colors.blue('Handling user ' + login));
  
    function processUser(user){
        var userDataUpdated = Object.assign({}, user.data, {status : userStatus.handled});
        
        return ghWorker.getUserFollowers(user.data.login)
                .then(followers => followers.map(f=>f.login))
                .then(followers => addUserFollowers(user, followers))
                .then(followers => users.push(...followers))
                
                .then(() => ghWorker.getUserFollowees(user.data.login))
                .then(followees => followees.map(f=>f.login))
                .then(followees => addUserFollowers(user, followees, true))
                .then(followees => users.push(...followees))
                
                .then(() => setNodeProperties(user.id, userDataUpdated));
    }
 
    function user_created(user){
            if(user.data.status === userStatus.handled) {
                console.log('user ' + login + ' has already been handled');
                return 0;
            }
            else{
                return processUser(user);
            } 
    }
    return createUserNode(login, userStatus.created).then(user_created);
 }

 function createIndex(indexLabel, indexKeys){
  return new Promise(function(resolve, reject){
    superagent
    .post(indexUrl + indexLabel)
    .auth(userId, pwd)
    .send({property_keys: indexKeys })
    .end(create_general_response(resolve, reject, 'creating ' + indexLabel + ' action'));
  });
 }

 //createIndex(userNodeIndexLabel, ['login']).then(()=>createIndex(followRelationIndexLabel, ['login'])).then(()=>{console.log('that is all folks!')});
 //traverse('0xd4d');

// what's up with internal server error??

