/**
 * Created by SergeyA on 10/23/2015.
 */


var Promise = require('native-promise-only');
var scrapper = require('github-scraper');
var superagent = require('superagent');

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
                                status : nodeStatus.created,
                                id : res.body.metadata.id,
                                data : res.body.data
            });
        }
        if(res.status === 200){ // OK
            console.log('obtained ' + data_type + ' : ' + JSON.stringify(res.body.data));
            return void resolve({
                                status: nodeStatus.existing,
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
            return resolve(res.status);
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

function setNodeLabel(nodeId, label){
  return new Promise(function(resolve, reject){
    superagent
    .post(nodeUrl + nodeId + '/labels')
    .auth(userId, pwd)
    .send([label])
    .end(create_general_response(resolve, reject, 'set label'))
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
  });
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



function scrapePage(url){
    return new Promise(function(resolve, reject){
                       scrapper(url, function(err, data){
                                if(err){
                                    return reject(err);
                                }
                                resolve(data);
                                })
                       })
}

function err(err){
    console.log(err);
}


function scrapePaginatedData(url, page, storage, promise){
    page = page || 1;
    storage = storage || [];
    promise = promise || new Promise();

    scrapePage(url + '?page=' + page).then(function(data){
        storage.push(...data.entries);
        if(data.next_page)
            scrapePaginatedData(url, page + 1, storage, promise);
        else
            promise.resolve(storage);
    }, err);
    return promise;
}

function scrapeUserFollowers(login, cb){
    return scrapePaginatedData('/' + login+'/followers');
}

function scrapeUserFollowees(login, cb){
    return scrapePaginatedData('/' + login + '/following');
}


function traverse(login){
 
    function addFollower(user, follower_login, reverse){ 
        var addRelationFunc = reverse ?
                follower => addFollowerRelation(user, follower) :
                follower => addFollowerRelation(follower, user);
        
        return new Promise(function(resolve, reject){
            createUserNode(follower_login, userStatus.created).then(addRelationFunc, reject).then( () => { resolve(follower_login) }, reject );
        });
    }

 
    function processUser(user){
         //scrapeUserFollowers(user.data.login, (followers) => followers.forEach(follower => addFollower(user, follower)));
         scrapeUserFollowers(user.data.login, (followers) => {
            var promises = followers.map(f=>addFollower(f));
            Promise.all(promises).then()

         });
 
        scrapeUserFollowees(user.data.login, (followees) => followees.forEach(followee => addFollower(user, followee, true)));
    }
 
    function user_created(user){
 
        if(user.status === nodeStatus.created){
            // this is the new user, process normally
            setNodeLabel(user.id, 'User').then(() => processUser(user));
        }
        else if(user.status === nodeStatus.existing){
            if(user.data.status === userStatus.handled) {
                console.log('user ' + login + ' has already been handled');
                return;
            }
            else if(user.data.status === userStatus.created){
                var userDataUpdated = Object.assign({}, user.data, {status : userStatus.handled});
                setNodeProperties(user.id, userDataUpdated).then(()=>setNodeLabel(user.id, 'User')).then(() => {processUser(user)});
            }else{
                return console.log('unexpected response from server:', response);
            }
        }
 
    }
    createUserNode(login, userStatus.handled).then(user_created);
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
 traverse('sAbakumoff');

// what's up with internal server error??

