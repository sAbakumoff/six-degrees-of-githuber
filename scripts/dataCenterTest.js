/**
 * Created by SergeyA on 10/23/2015.
 */

var dataCenter = require('./dataCenter');

dataCenter.getStarredRepositories('rds1983', function(err, res){
       if(err){
           return void console.log(err);
       }
    console.log('fav repos:');
    res.forEach(function(repo){
        console.log(repo.full_name);
    });
});

dataCenter.getRepositoryStargazers('sergeyt/jQuery-xml2json', function(err, res){
    if(err){
        return void console.log(err);
    }
    console.log('stargazers:');
    res.forEach(function(user){
       console.log(user.login);
    });
});
