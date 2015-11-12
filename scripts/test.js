var Promise = require('native-promise-only');



function delay(n){
	return new Promise(function(resolve, reject){
		setTimeout(()=>resolve(n), n * 100);
	}).then(n=>Promise.resolve(n * 5));
}

//delay(2).then(p=>console.log(p));

var wait = delay => new Promise(resolve => setTimeout(resolve, delay));
wait(1000).then();