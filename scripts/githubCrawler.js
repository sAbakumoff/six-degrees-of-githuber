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


//todo : create node and set label!
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


function scrapePage(url, page){
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

function delay(ms){
    if(ms > 0)
        console.log('waiting for ' + ms + 'ms....');
    return new Promise(function(resolve){
        setTimeout(resolve, ms);
    });
}

// idea : always take 40 pages, then put off the requests by adding property to user node. 
function scrapePaginatedData(url){
    var storage = [];
    return Promise.resolve(1).then(function next(page){
        if(page > 0 && page <= 40)
            return scrapePage(url + '?page=' + page, page).then((data) => {
                storage.push(...data.entries);
                if(data.next_page)
                    return page + 1;
                else
                    return -1;
            }).then(next);
        else
            return storage;
    });
}

function scrapeUserFollowers(login){
    return scrapePaginatedData('/' + login+'/followers');
}

function scrapeUserFollowees(login){
    return scrapePaginatedData('/' + login + '/following');
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

var users = ['torvalds'];

Promise.resolve(0).then(function next(index){
    if(index < users.length)
        return traverse(users[index]).then(()=>index+1).then(next);
    else
        return 'done';
}).then(()=>console.log('done working with users'), (err)=>console.log('Promise error: ', err));

function traverse(login){

    console.log('============= handling user ' + login + ' ==================');
  
    function processUser(user){
        return scrapeUserFollowers(user.data.login)
                .then(followers => addUserFollowers(user, followers))
                .then(followers => users.push(...followers))
                
                .then(() => scrapeUserFollowees(user.data.login))
                .then(followees => addUserFollowers(user, followees, true))
                .then(followees => users.push(...followees));
    }
 
    function user_created(user){
 
        if(user.status === nodeStatus.created){
            // this is the new user, process normally
            return setNodeLabel(user.id, 'User').then(() => processUser(user));
        }
        else if(user.status === nodeStatus.existing){
            if(user.data.status === userStatus.handled) {
                console.log('user ' + login + ' has already been handled');
                return 'done';
            }
            else if(user.data.status === userStatus.created){
                var userDataUpdated = Object.assign({}, user.data, {status : userStatus.handled});
                return setNodeProperties(user.id, userDataUpdated).then(()=>setNodeLabel(user.id, 'User')).then(() => processUser(user));
            }else{
                return console.log('unexpected response from server:', response);
            }
        }
 
    }
    return createUserNode(login, userStatus.handled).then(user_created);
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

