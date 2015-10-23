/**
 * Created by SergeyA on 10/23/2015.
 */

var superagent = require('superagent');

var githubApiUrl = 'https://api.github.com/';

var proto = Object.prototype;

function isFunction(value) {
    return proto.toString.call(value) === '[object Function]';
}

function isString(value) {
    return proto.toString.call(value) === '[object String]';
}

function response(err, res, cb){
    if(err)
        return void cb( err );
    if (res.error) {
        return void cb( res.error );
    }
    if (res.body) {
        return void cb( null, res.body );
    }
    throw Error('Unexpected course of events');
}

function userRequest(userId, request, cb){
    if(!isFunction(cb))
        throw new Error('The callback is required');
    if(userId && !isString(userId)){
        cb('invalid user name');
    }
    var requestUrl = githubApiUrl + 'users/' + userId + '/' + request;
    superagent(requestUrl).end(function(err, res){
        response(err, res, cb);
    });
}

function repoRequest(repoId, request, cb){
    if(!isFunction(cb))
        throw new Error('The callback is required');
    if(repoId && !isString(repoId)){
        cb('invalid repo name');
    }
    var requestUrl = githubApiUrl + 'repos/' + repoId + '/' + request;
    superagent(requestUrl).end(function(err, res){
        response(err, res, cb);
    });
}


var dataCenter = {
    getUserStarredRepositories : function(userId, cb){
        userRequest(userId, 'starred', cb);
    },
    getUserFollowers : function(userId, cb){
        userRequest(userId, 'followers', cb);
    },
    getRepositoryStargazers : function(repoId, cb){
        repoRequest(repoId, 'stargazers', cb);
    }
};

module.exports = dataCenter;
