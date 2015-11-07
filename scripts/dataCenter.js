var Promise = require('native-promise-only');
var superagent = require('superagent');
if(ghPwd === undefined)
    return console.log('please provide github credentials');
var colors = require('colors');

var githubEndPoint = 'https://api.github.com/';

var userEndPoint = githubEndPoint + 'users/';

var followersEndPoint = user =>  userEndPoint + user + '/followers';
var followeesEndPoint = user =>  userEndPoint + user + '/following';

function getLastLinkPage(linkHeader){
    if(!linkHeader || Object.prototype.toString.call(linkHeader)!='[object String]')
        return 1;
    var re = /\&page=(\d+)/;
    var links = linkHeader.split(',');
    for(var li=0; li<links.length; li++){
        var link = links[li];
         if(link.indexOf('rel="last"') > 0){
            return (re.exec(link)[1]);
        }   
    }
    return 1;
}

/*
  'x-ratelimit-limit': '5000',
  'x-ratelimit-remaining': '4998',
  'x-ratelimit-reset': '1446817687', ==> time to wait??
*/

function getBasicRequest(url, page_number, per_page){
    per_page = per_page || 100;
    page_number = page_number || 1;
    console.log(colors.green('Github request: ' + url + '?page='+page_number + '&per_page=' + per_page));
    return new Promise(function(resolve, reject){
        superagent.get(url).query({per_page : per_page, page : page_number}).auth(ghUser, ghPwd).end(function(err, res){
            if(err){
                reject(err);
            }
            else{
                var remainRequests = +res.header['x-ratelimit-remaining'];
                console.log(colors.red('# of requests until limit is reached:' + remainRequests));
                if(remainRequests === 0){
                    var restoringTime = (+res.header['x-ratelimit-reset']) * 1000;
                    var waitTime = restoringTime - Date.now();
                    console.log(colors.red('please wait for ' + waitTime + 'ms'));
                    setTimeout(()=>resolve(res), waitTime); 
                }
                else{
                    resolve(res);
                }
            }
        });
    });
}

function getPageTotal(url, per_page){
    return getBasicRequest(url, 1, per_page).then(res=>getLastLinkPage(res.header.link));
}

function getPaginatedData(url){
    var data = [];
    var worker = page_total => Promise.resolve(1).then(function next(page){
        if(page <= page_total){
            return getBasicRequest(url, page).then(res=>{
                data.push(...res.body);
                return next(page + 1);
            });
        }
        else{
            return data;
        }
    });
    return getPageTotal(url).then(worker);
}

module.exports = {
    getUserFollowers : user => getPaginatedData(followersEndPoint(user)),
    getUserFollowees : user => getPaginatedData(followeesEndPoint(user))
};

/*var user = 'torvalds';
getPaginatedData(followersEndPoint(user)).then(data=>data.map((d)=>d.login)).then(console.log);*/



