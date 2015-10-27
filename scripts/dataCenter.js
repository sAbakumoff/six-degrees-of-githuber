/**
 * Created by SergeyA on 10/23/2015.
 */

var superagent = require('superagent');
var Promise = require('native-promise-only');

var basicUrl = 'Fill with your Neo4J Url';
var nodeUrl = basicUrl + 'node/';
var indexUrl = basicUrl + 'schema/index/';
var userId = 'Fill with your Neo4J User';
var pwd = 'Fill with your Neo4J Credentials';

function end(err, res){
    console.log('response status', res.status);
    console.log('ID of the node', res.body.metadata.id);
    //console.log('res', res);
    var reject = function(c){};
    var resolve = reject;
    if(err)
        return void reject( err );
    if (res.error) {
        return void reject( res.error );
    }
    if (res.body && res.body.error){
        reject(res.body.error);
    }
    if (res.body) {
        return void resolve( res.body );
    }
    reject('Unexpected course of events');
}

var log = function(x){
    console.log();
}

function create_node_response(resolve, reject){
    return function(err, res){
        if(err){
            return void reject(err);
        }
        if(res.status === 201){ // created
            return void resolve(res.body.metadata.id);
        }
        return void reject(res.status);
    }
    
}

function createUserNode(login){
    return new Promise(function(resolve, reject){
                       superagent.post(basicUrl + 'index/node/login_index?uniqueness=create_or_fail').auth(userId, pwd).send({
                                                                                                          key:'login',
                                                                                                          value : login,
                                                                                                          properties:{
                                                                                                                login : login
                                                                                                          }
                                                                                                          }).end(create_node_response(resolve, reject));
                       });
}

function createFollowRelationship(followerNodeId, followeegNodeId){
    var relation = {
        to : nodeUrl + followeegNodeId,
        type : 'follow'
    };
    return new Promise(function(resolve, reject){
                       superagent.post(nodeUrl + followerNodeId + '/relationships').auth(userId, pwd).send(relation).end(create_node_response(resolve, reject));
                       });
}

function err_response(err){
    console.log(err);
}

createUserNode('agent007').then(function(id){
                           return createFollowRelationship(id, 3);
                           
                           }, err_response).then(function(id){console.log('created relation id', id)}, err_response);

//create index: schema/index/label_1445033990455_1
//superagent.post(indexUrl + 'login_index').auth(userId, pwd).send({property_keys: ["login"] }).end(end);


// status : 201 means created, status 409 means conflict, pretty easy.
/* superagent.post(basicUrl + 'index/node/login_index?uniqueness=create_or_fail').auth(userId, pwd).send({
                                                                                                      key:'login',
                                                                                                      value : 'williams',
                                                                                                      properties:{
                                                                                                 login : 'williams'
                                                                                                      }
                                                                                                }).end(end);


*/
/*var utils = require('./utils');

var githubApiUrl = 'https://api.github.com/';

function response(err, res, resolve, reject){
    if(err)
        return void reject( err );
    if (res.error) {
        return void reject( res.error );
    }
    if (res.body) {
        return void resolve( res.body );
    }
    reject('Unexpected course of events');
}

function userRequest(userId, request){
    return new Promise(function (resolve, reject) {
        if(userId && !utils.isString(userId)){
            return void reject('invalid user name');
        }
        var requestUrl = githubApiUrl + 'users/' + userId + '/' + request;
        console.log('user request:', requestUrl);
        superagent(requestUrl)
            .query({page:1, per_page:10, client_id:client_id, client_secret:client_secret})
            .set('User-Agent', 'six-degrees-of-githuber')
            .end(function (err, res) {
                response(err, res, resolve, reject);
            });
    });
}

function repoRequest(repoId, request, cb){
    return new Promise(function (resolve, reject) {
        if (repoId && !utils.isString(repoId)) {
            return void reject( 'invalid repo name' );
        }
        var requestUrl = githubApiUrl + 'repos/' + repoId + '/' + request;
        console.log('repo request:', requestUrl);
        superagent(requestUrl)
            .query({page:1, per_page:10, client_id:client_id, client_secret:client_secret})
            .set('User-Agent', 'six-degrees-of-githuber')
            .end(function (err, res) {
                response(err, res, resolve, reject);
            });
    });
}


var dataCenter = {
    getUserStarredRepositories : function(userId){
        return userRequest(userId, 'starred');
    },
    getUserFollowers : function(userId){
        return userRequest(userId, 'followers');
    },
    getRepositoryStargazers : function(repoId){
        return repoRequest(repoId, 'stargazers');
    }
};

module.exports = dataCenter;*/
