/**
 * Created by SergeyA on 10/23/2015.
 */


var Promise = require('native-promise-only');
var scrapper = require('github-scraper');
var superagent = require('superagent');

if(typeof basicUrl === 'undefined')
return console.log('Please provide the neo4j address');

var createUserNodeUrl = basicUrl + 'index/node/User?uniqueness=create_or_fail';



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
    
    var nodeData = {
        key: 'login',
        value: login,
        properties:{
            login : login
        }
    };
    
    return new Promise(function(resolve, reject){
                            superagent.post(createUserNodeUrl).auth(userId, pwd).send(nodeData).end(create_node_response(resolve, reject));
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

scrapeUserFollowees('sAbakumoff', function(followers){
                    followers.forEach(function(f){
                                      createUserNode(f).then(function(res){console.log('created node', res)}, function(err){console.log('error', err)});
                                      });
                    });

