var DNode = require('dnode');
var sys = require('sys');

/*TODO:
	1. tidy this test.
	2. remove logging, and out of date comments.
	3. document changes.
	4. investigate logging.
*/

function setupServerClient(server,client,connected,errors){
	if (errors === undefined) {
		errors = false
	}
	var port = Math.floor(Math.random() * 40000 + 10000)
	,	 group = {}
	group.server = DNode(server).listen(port,{printErrors: errors})
	group.client = DNode(client)
	group.server.on('ready',function(){
		 group.client.connect(port,connected,{printErrors: errors})
	});
	return group;
}
exports['test emit error'] = function (test) {
  
   var errNum = 0,clientErrNum = 0;

	var serverObj = {
			one : function () {
	         throw 'string throw'
	     }
		,	two : function () {
	         undefined.name
	     }
		,	callback : function (arg,cb){
	     		cb(arg);
	     }
     }
	,	clientObj = {}
	,	group = setupServerClient(serverObj,clientObj,connected);
	
	function connected(remote){
      remote.one();
      remote.two();
      remote.callback("ERROR MESSAGE",
      	function (message){
      	
  				throw new Error(message);
     		}
		);
	}    

   group.client.on('error',clientErrorHandler);
    function clientErrorHandler (err){
       clientErrNum ++;
       if (errNum == 1) {
           test.equal(err.name, "Error");
           test.equal(err.message, "ERROR MESSAGE");
       }
    }

  	group.server.on('error',serverErrorHandler);
    function serverErrorHandler (err){
       errNum ++;
       if (errNum == 1) {
           test.equal(err, 'string throw');
       } else if (errNum == 2) {
           try { undefined.name }
           catch (refErr) {
               test.equal(err.name, refErr.name);
               test.equal(err.message, refErr.message);
               test.equal(err.type, refErr.type);
           }
       } else {
       	test.ok(false,"did not expect:" + err
       	 + "stack :\n"
       	 +	err.stack ? err.stack.join("\n") : "...no stack");
       }
    }
    
    setTimeout(function () {
        test.equal(errNum, 2,"expected 2 error on server, got " + errNum);
        test.equal(clientErrNum, 1,"expected 1 error on client");
        group.server.end();
        test.finish();
    }, 500);
};

//test remote errors

exports['test call error for remoteError'] = function (test){

	var errNum = 0
	,	remoteErrNum = 0
	,	theError = new Error ('INSTENSIONAL ERROR ON SERVER')
	,	serverObj =
		{	makeError: 
			function (n,cb){
			console.log("MAKE ERROR");
				throw theError
			}
		}
	,	clientObj = 
		{	error: 
			function (err){
				console.log("method: error");
				errNum ++;
				test.deepEqual(err,theError)
			}
		}
	,	group = setupServerClient(serverObj,clientObj,connected,false);
	function connected (server) {
		console.log("CONNECTED");
		server.makeError(100)
	}

	group.client.on('remoteError',remoteError);
	function remoteError (err){
		remoteErrNum ++;
		console.log("XXXXXXXXXXXXXX: " + err.message)
		console.log("RECIEVE REMOTE ERROR: " + err.message)
		console.log("RECIEVE REMOTE FROM: " + remote)
		test.deepEqual(err,theError)
	}
    setTimeout(function () {
		  test.equal(errNum,1);
		  test.equal(remoteErrNum,1,"expected recieve remoteError");
        group.server.end();
        test.finish();
    }, 500);

}


exports['test call remoteError without error'] = function (test){

	var errNum = 0
	,	remoteErrNum = 0
	,	theError = new Error ('INSTENSIONAL ERROR ON SERVER')
	,	serverObj =
		{	makeError: 
			function (n,cb){
			console.log("MAKE ERROR");
				throw theError
			}
		}
	,	clientObj = {}
	,	group = setupServerClient(serverObj,clientObj,connected,false);
	function connected (server) {
		console.log("CONNECTED");
		server.makeError(100)
	}

	group.client.on('remoteError',remoteError);
	function remoteError (err){
		remoteErrNum ++;
		console.log("XXXXXXXXXXXXXX: " + err.message)
		console.log("RECIEVE REMOTE ERROR: " + err.message)
		console.log("RECIEVE REMOTE FROM: " + remote)
		test.deepEqual(err,theError)
	}
    setTimeout(function () {
		  test.equal(remoteErrNum,1,"expected recieve remoteError");
        group.server.end();
        test.finish();
    }, 500);

}


/*
	//clear error hander:
	server.removeAllListeners('error')
	//then all errors should throw.
	//which should be caught by test.uncaughtExceptionHandler
*/

if (module == require.main) {
  require('async_testing').run(__filename, process.ARGV);
}

