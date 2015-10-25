/**
 * Created by SergeyA on 10/23/2015.
 */

var superagent = require('superagent');
var Promise = require('native-promise-only');
var utils = require('./utils');

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

module.exports = dataCenter;
