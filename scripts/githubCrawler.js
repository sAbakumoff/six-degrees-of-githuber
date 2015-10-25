/**
 * Created by SergeyA on 10/23/2015.
 */

var dataCenter = require('./dataCenter');
var utils = require('./utils');
var Promise = require('native-promise-only');

function getUsersStarredRepositories(users){
    return users.map(function(user){
        return dataCenter.getUserStarredRepositories(user.login);
    })
}

function getReposStargazer(repos){
    return repos.map(function(repo){
        return dataCenter.getRepositoryStargazers(repo.full_name);
    })
}

var handledRepos = {};
var handledUsers = {};

var crawler = {
  start : function(userId, cb){
      if(!utils.isFunction(cb)){
          throw new Error('Invalid usage : the callback is required')
      }

      function err(err){
          console.log('The following error occured', err);
      }

      function getReposStargazers(repos, stargazersCallback){
          repos.forEach(function(repo){
              var repoId = repo.full_name;
              if(!handledRepos.hasOwnProperty(repoId)){
                  handledRepos[repoId] = true;
                  dataCenter.getRepositoryStargazers(repoId).then(stargazersCallback, err);
              }
          })
      }

      function getUsersStarredRepos(users, repositoriesCalback){
          users.forEach(function(user){
              if(!handledUsers.hasOwnProperty(user.login)){
                  handledUsers[user.login] = true;
                  dataCenter.getUserStarredRepositories(user.login).then(repositoriesCalback, err);
              }
          });
      }


      var followers = dataCenter.getUserFollowers(userId);
      followers.then(function(followers){
          getUsersStarredRepos(followers, cb);
      }, err);


      var starredRepositories = dataCenter.getUserStarredRepositories(userId);
      starredRepositories.then(function(repositores){
          getReposStargazers(repositores, function(stargazers){
              getUsersStarredRepos(stargazers, cb);
          })
      }, err)

  }
};


crawler.start('sergeyt', function(repos){
/*
   repos.forEach(function(r){
       console.log(r.full_name);
   })
*/
});


//module.exports = crawler;