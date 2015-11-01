/**
 * Created by SergeyA on 10/23/2015.
 */


var Promise = require('native-promise-only');
var scrapper = require('github-scraper');
var superagent = require('superagent');
if(typeof basicUrl === 'undefined')
return console.log('Please provide the neo4j address');

var createUserNodeUrl = basicUrl + 'index/node/User?uniqueness=get_or_create';

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
                       .put(basicUrl + 'node/' + nodeId + '/properties')
                       .auth(userId, pwd)
                       .send(properties)
                       .end(create_general_response(resolve, reject, 'set props'));
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

function addUsersRelation(fromId, toId, type){
    var relationData = {
        to : basicUrl + 'node/' + toId,
        type : type
    };
    var addRelationUrl = basicUrl + 'node/' + fromId + '/relationships';
    return new Promise(function(resolve, reject){
                       superagent
                       .post(addRelationUrl)
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

function scrapePaginatedData(url, cb, page){
    page = page || 1;
    scrapePage(url + '?page=' + page).then(
                                           function(data){
                                           cb(data.entries);
                                           if(data.next_page)
                                           scrapePaginatedData(url, cb, page + 1);
                                           },err);
}

function scrapeUserFollowers(login, cb){
    scrapePaginatedData(login+'/followers', cb);
}

function scrapeUserFollowees(login, cb){
    scrapePaginatedData(login + '/following', cb);
}



(function traverse(login){
 
    function addFollower(user, follower_login, reverse){
 
        var addRelationFunc = reverse ?
                follower => addUsersRelation(user.id, follower.id, 'follow') :
                follower => addUsersRelation(follower.id, user.id, 'follow' );
 
        createUserNode(follower_login, userStatus.created)
 
        .then(addRelationFunc)
 
        .then( () => { traverse(follower_login) } );
    }

 
    function processUser(user){
        scrapeUserFollowers(user.data.login, (followers) => followers.forEach(follower => addFollower(user, follower)));
 
        scrapeUserFollowees(user.data.login, (followees) => followees.forEach(followee => addFollower(user, followee, true)));
    }
 
    function user_created(user){
 
        if(user.status === nodeStatus.created){
            // this is the new user, process normally
            processUser(user);
 
        }
        else if(user.status === nodeStatus.existing){
            if(user.data.status === userStatus.handled) {
                console.log('user ' + login + ' has already been handled');
                return;
            }
            else if(user.data.status === userStatus.created){
                var userDataUpdated = Object.assign({}, user.data, {status : userStatus.handled});
                setNodeProperties(user.id, userDataUpdated).then(() => {processUser(user)});
            }else{
                return console.log('unexpected response from server:', response);
            }
        }
 
    }
    createUserNode(login, userStatus.handled).then(user_created);
 })('sAbakumoff');


