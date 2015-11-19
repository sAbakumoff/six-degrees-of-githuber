var Promise = require('native-promise-only');
var superagent = require('superagent');
var linkParser = require('parse-link-header');

var ghUser = 'sAbakumoff';

if(typeof ghPwd === 'undefined')
    return console.log('please provide github credentials');
var colors = require('colors');

var githubEndPoint = 'https://api.github.com/';

var usersEndPoint = githubEndPoint + 'users/';
var reposEndPoint = githubEndPoint + 'repos/'
var orgsEndPoint = githubEndPoint + 'orgs/'

var followersEndPoint = user =>  usersEndPoint + user + '/followers';
var followeesEndPoint = user =>  usersEndPoint + user + '/following';
var userOrgsEndPoint = user => usersEndPoint + user+ '/orgs';

var repoStargazersEndPoint = repo => reposEndPoint + repo + '/stargazers';
var repoContributorsEndPoint = repo => reposEndPoint + repo + '/contributors';
var repoSubscribersEndPoint = repo => reposEndPoint + repo + '/subscribers';
var repoForksEndPoint = repo => reposEndPoint + repo + '/forks';

var orgMembersEndPoint = org => orgsEndPoint + org + '/public_members';

var ResultsPerPage = 100; // max number allowed by GitHub.

/*
  'x-ratelimit-limit': '5000',
  'x-ratelimit-remaining': '4998',
  'x-ratelimit-reset': '1446817687', ==> time of rate limit reset in seconds.
*/

var wait = delay => new Promise(resolve => setTimeout(resolve, delay));

function getBasicRequest(url){
    console.log(colors.green('Github request: ' + url ));
    return new Promise(function(resolve, reject){
        superagent.get(url).auth(ghUser, ghPwd).query({per_page : ResultsPerPage}).end(function(err, res){
            if(err){
                reject(err);
            }
            else{
                var remainRequests = +res.header['x-ratelimit-remaining'];
                console.log(colors.red('# of requests until limit is reached:' + remainRequests));
                resolve(res);
            }
        });
    });
}

function getPaginatedData(url, dataHandler){
    var defaultHandler = data => console.log;
    dataHandler = dataHandler || defaultHandler;
    return Promise.resolve(url).then(function next(url){
        if(url){
            return getBasicRequest(url).then(res => { 
                var nextPage = null;
                if(res.header && res.header.link){          
                    var links = linkParser(res.header.link);
                    nextPage = links.next;
                }
                return dataHandler(res.body).then(()=>next(nextPage ? nextPage.url : null));
            }, (err)=>{
                if(err.status===403){
                    var restoringTime = (+err.header['x-ratelimit-reset']) * 1000;
                    var waitTime = restoringTime - Date.now();
                    console.log(colors.red('please wait for ' + waitTime + 'ms'));
                    return wait(waitTime).then(()=>next(url));                     
                }
                return err.status;
            });
        }
        else{
            return 0;
        }
    });
}

function getPublicRepositories(url){
    url = url || githubEndPoint + 'repositories';
    return new Promise(function(resolve, reject){
        getBasicRequest(url).then(res => {
            var links = linkParser(res.header.link);
            var nextPage = links.next;
            resolve({repos : res.body, nextLink : nextPage ? nextPage.url : null});
        });
    })
}


var dataCenter = module.exports = {
    getUserFollowers : (user, dataHandler) => getPaginatedData(followersEndPoint(user), dataHandler),
    getUserFollowees : (user, dataHandler) => getPaginatedData(followeesEndPoint(user), dataHandler),
    getUserOrgs : (user, dataHandler) => getPaginatedData(userOrgsEndPoint(user), dataHandler),
    getOrgPublicMembers : (org, dataHandler) => getPaginatedData(orgMembersEndPoint(org), dataHandler),

    getRepoStargazers : repo => getPaginatedData(repoStargazersEndPoint(repo)),
    getRepoSubscribers : repo => getPaginatedData(repoSubscribersEndPoint(repo)),
    getRepoContributors : repo => getPaginatedData(repoContributorsEndPoint(repo)),
    getRepoForks : repo => getPaginatedData(repoForksEndPoint(repo)),

    

    getPublicRepositories : getPublicRepositories

};

/*function printData(data){
    console.log('next portion of data: ', data);
    return Promise.resolve(0);
}

dataCenter.getUserFollowers('abrakadabr', printData).then(console.log);*/

//var org = 'yahoo';
//getPaginatedData(orgMembersEndPoint(org)).then(data=>data.map((d)=>d.login)).then(console.log);

//dataCenter.getUserFollowers('trietptm').then(data=>data.map(u=>u.login)).then(console.log)
/*var log = console.log;
getPublicRepositories().then(resp=>resp.nextLink, log).then(log);*/




