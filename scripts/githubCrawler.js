var Promise = require('native-promise-only');
var superagent = require('superagent');
var colors = require('colors');
var dataCenter = require('./dataCenter.js');

var basicUrl = 'http://localhost:7474/db/data';
var userId = 'neo4j';

if(typeof pwd === 'undefined')
  return console.log('Please provide the neo4j password!');


var userStatus = {
    created : 0x0,
    processed : 0x1,
    handled : 0x10
};

function executeCypherQuery(query){
    return new Promise(function(resolve, reject){
        superagent
        .post(basicUrl + '/cypher')
        .auth(userId, pwd)
        .send(query)
        .end(function(err, res){
            if(err)
                return reject(err);
            resolve(res.body);
        });    
    });
}

function loginProcedure(login){
    console.log(colors.blue('handling user ', login));
    var followersHandler = (reverse) => {
        var relationFunc = reverse ? 'MERGE u<-[:Follows]-me)' : 'MERGE u-[:Follows]->me)'; 
        return followers => {
            console.log(colors.green('Adding ' + followers.length + (reverse ? ' followees' : ' followers') + '...'));
            var query = {
                query : 'MATCH (me:User {login : {login} }) FOREACH (f IN {followers} | MERGE (u:User { login : f }) ' + relationFunc,  
                params : {
                    login : login,
                    followers : followers.map(f=>f.login)
                }
            }
            return executeCypherQuery(query);    
        }
    }
    var lockNodeQuery = {
        query : 'MERGE (me:User {login : {login} }) SET me.status = {userStatus}.handled',
        params : {
            login : login,
            userStatus : userStatus
        }
    }
    return executeCypherQuery(lockNodeQuery)
    .then(()=>dataCenter.getUserFollowers(login, followersHandler()))
    .then(()=>dataCenter.getUserFollowees(login, followersHandler(true)))
}

loginProcedure('sergeyt').then(()=>console.log('done'), (err)=>console.log('error', err));
