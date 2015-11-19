var Promise = require('native-promise-only');
var superagent = require('superagent');
var colors = require('colors');
var dataCenter = require('./dataCenter.js');

var basicUrl = 'http://localhost/db/data';
var userId = 'neo4j'; 

if(typeof pwd === 'undefined')
  return console.log('Please provide the neo4j password!');


var entityStatus = {
    created : 0x0,
    processed : 0x1,
    handled : 0x10
};


// node --harmony githubCrawler org

if(process.argv.length >  2){//keep it simple for now
    orgLoop();
}
else{
    usersLoop();
}

var wait = delay => new Promise(resolve => setTimeout(resolve, delay));

function loop(selectQuery, processFunc){
    executeCypherQuery(selectQuery).then((res)=>{
        var data = res.results[0].data;
        if(data.length && data[0].row.length){
            var nextLogin = data[0].row[0].login;
            processFunc(nextLogin).then(()=>loop(selectQuery, processFunc));
        }
        else{
            console.log('no records so far, wait for it...');
            wait(250).then(()=>loop(selectQuery, processFunc));
        }
        return 
    }, (err)=>console.log('error', err));
}

function usersLoop(){
    var selectUnhandledUser = buildTransactionQuery({
        statement : 'match (u:User) where u.status is null set u.status={userStatus}.handled return u limit 1;',
        parameters : {
            userStatus : entityStatus
        }
    });    
    loop(selectUnhandledUser, loginProcedure);
}

function orgLoop(){
    var selectUnhandledOrg = buildTransactionQuery({
        statement : 'match (o:Org) where o.status is null set o.status={orgStatus}.handled return o limit 1;',
        parameters : {
            orgStatus : entityStatus
        }
    });
    loop(selectUnhandledOrg, orgProcedure);  
}



function executeCypherQuery(query){
    return new Promise(function(resolve, reject){
        superagent
        .post(basicUrl + '/transaction/commit')
        .auth(userId, pwd)
        .send(query)
        .end(function(err, res){
            if(err)
                return reject(err);
            resolve(res.body);
        });    
    });
}

function buildTransactionQuery(statement){
    return {
        statements : Array.isArray(statement) ? statement : [statement]
    }
}

function orgProcedure(login){
    console.log(colors.blue('handling org ', login));

    var orgMembersHandler = members => {
        console.log(colors.green('Adding ' + members.length + ' org members'));
        var query = buildTransactionQuery({
                statement : 'MATCH (o:Org {login : {login} }) FOREACH (m IN {members} | MERGE (u:User { login : m }) MERGE u-[:MemberOf]->o)',  
                parameters : {
                    login : login,
                    members : members.map(m=>m.login)
                }
        });
        return executeCypherQuery(query);         
    }

    return dataCenter.getOrgPublicMembers(login, orgMembersHandler);
}

function loginProcedure(login){
    
    console.log(colors.blue('handling user ', login));
    
    var orgsHandler = orgs => {
        if(!orgs || !orgs.length)
            return Promise.resolve(0);
        console.log(colors.green('Adding ' + orgs.length + ' orgs...'));
        var query = buildTransactionQuery({
                statement : 'MATCH (u:User {login : {login} }) FOREACH (org IN {orgs} | MERGE (o:Org { login : org }) MERGE u-[:MemberOf]->o)',  
                parameters : {
                    login : login,
                    orgs : orgs.map(org=>org.login)
                }
        });
        return executeCypherQuery(query);            
    };

    var followersHandler = (reverse) => {
        var relationFunc = reverse ? 'MERGE u<-[:Follows]-me' : 'MERGE u-[:Follows]->me'; 
        return followers => {
            console.log(colors.green('Adding ' + followers.length + (reverse ? ' followees' : ' followers') + '...'));
            var query = buildTransactionQuery({
                statement : 'MATCH (me:User {login : {login} }) FOREACH (f IN {followers} | MERGE (u:User { login : f }) ' + relationFunc + ')',  
                parameters : {
                    login : login,
                    followers : followers.map(f=>f.login)
                }
            });
            return executeCypherQuery(query);    
        }
    }
    return  dataCenter.getUserFollowers(login, followersHandler())
            .then(()=>dataCenter.getUserFollowees(login, followersHandler(true)))
            .then(()=>dataCenter.getUserOrgs(login, orgsHandler));
}

//loginProcedure('davglass').then(()=>console.log('done'), (err)=>console.log('error', err));

