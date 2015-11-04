var Promise = require('native-promise-only');

function asyncOp(page){
    return new Promise(function(resolve){
        setTimeout(()=>resolve(page * page), 250);
    });
}

function getSquares(maxNum){
    storage = [];
    return Promise.resolve(1).then(function next(page){
        if(page <= maxNum)
            return asyncOp(page).then((square) => {
                storage.push(square);
                return page + 1;
            }).then(next);
        else
            return storage;
    })    
};



getSquares(3).then(storage => console.log(storage));

