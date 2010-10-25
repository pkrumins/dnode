var DNode = require('dnode');
var sys = require('sys');

/*TODO:
	1. tidy this test.
	2. remove logging, and out of date comments.
	3. document changes.
	4. investigate logging.
*/

/*
	checklist: often, you want to know that a list of async functions have been called. 
	then the test is finished.
	pass this function a list of items and a test.
	it returns a function, check, call it with the items in turn, and it crosses it off the list.
	when the list is empty it calls test.finish()
	
	checklist([1,2,3],test)
	check(1)
	check(2)
	check(3)
		//also, call check() with no args to check the list is now empty.
		//... if it's not empty it will fail rather than just letting the test hang.
	check() 
*/

function checklist (l,test){
	var list = l.concat()
	return function check(item){
		//call with no args to assert that check list should be finished.
		//if this fails it will make the test fail like an error rather than not finish.
		if (arguments.length === 0){
			test.equal(list.length,0,"expected check to be [] but was:" + list);
			
		} else {
			var index = list.indexOf(item)
			test.ok(index != -1, "expected that list :" + sys.inspect(list) + " included " + sys.inspect(item) )
			list.splice(index,1)
			if (list.length == 0){
				test.finish();
			}
		}
	}
}

function setupServerClient(server,client,connected,errors){
	if (errors === undefined) {
		errors = false
	}
	var port = Math.floor(Math.random() * 40000 + 10000)
	,	 group = {}
	group.server = DNode(server).listen(port,{printErrors: errors, printRemoteErrors: errors})
	group.client = DNode(client)
	group.server.on('ready',function(){
		 group.client.connect(port,connected,{printErrors: errors, printRemoteErrors: errors})
	});
	return group;
}

function serverThrowsTwoErrors (){
	return {
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
}


/*~~~~~~~~~~~~~ TESTS ~~~~~~~~~~~~~~~~~~*/

exports['test emit error'] = function (test) {
  
   var errNum = 0,clientErrNum = 0;

	var group = setupServerClient(serverThrowsTwoErrors (),{},connected)
	, check = checklist(['Error','string throw','TypeError'],test)
	function connected(remote){
      remote.one();
      remote.two();
      remote.callback("ERROR MESSAGE",clientError);
			function clientError (message){
				throw new Error(message);
	  		}
		/*
			is this a good style?
			specifying callbacks by name and then defining them immediately following.
			
			+ dont worry about closing the bracket after the function
			- not visually obvious that it's an argument. 
			
			maybe should indent the function		
		*/
	}

   group.client.on('error',clientErrorHandler);

		function clientErrorHandler (err){
			  test.equal(err.name, "Error");
			  test.equal(err.message, "ERROR MESSAGE");
			  check("Error")
  		 }

  	group.server.on('error',serverErrorHandler);
  	
		function serverErrorHandler (err){
		    check(err.name || err)
		 }
    
    setTimeout(finish, 500);

		 function finish(){
			check()
		   group.server.end();
		 }
};

//test remote errors

exports['test call error for remoteError'] = function (test){

	var check = checklist(['error','remoteError'],test)
	,	theError = new Error ('INSTENSIONAL ERROR ON SERVER - test call error for remoteError')
	,	serverObj =
		{	makeError: 
			function (n,cb){
				throw theError
			}
		}
	,	clientObj = 
		{	error: 
			function (err){
				test.deepEqual(err,theError)
				check('error')
			}
		}
	,	group = setupServerClient(serverObj,clientObj,connected,false);
		function connected (server) {
			server.makeError(100)
		}

	group.client.on('remoteError',remoteError);
		function remoteError (err){
			check('remoteError');
			test.deepEqual(err,theError)
		}

   setTimeout(function () {
	  check()
	  group.server.end();
	}, 500);
}

exports['test call remoteError without error method'] = function (test){

	var errNum = 0
	,	remoteErrNum = 0
	,	check = checklist(['remoteError2'],test)
	,	theError = new Error ('INSTENSIONAL ERROR ON SERVER')
	,	serverObj =
		{	makeError: 
			function (n,cb){
				throw theError
			}
		}
	,	clientObj = {}
	,	group = setupServerClient(serverObj,clientObj,connected,false);
		function connected (server) {
			server.makeError(100)
		}

	group.client.on('remoteError',remoteError);
		function remoteError (err){
			remoteErrNum ++;
			test.deepEqual(err,theError)
			check('remoteError2');
		}

    setTimeout(function () {
			  test.equal(remoteErrNum,1,"expected recieve remoteError");
		     group.server.end();
		 }, 500);
		 
}
/*
	//clear error hander:
	server.removeAllListeners('error')
	//then all errors should throw.
	//which should be caught by test.uncaughtExceptionHandler
*/
exports['test throw error with no listeners'] = function (test){

	var errNum = 0
	,	remoteErrNum = 0
	,	check = checklist(['serverError'],test)
	,	theError = new Error ('INSTENSIONAL ERROR ON SERVER')
	,	serverObj =
		{	makeError: 
			function (n,cb){
				throw theError
			}
		}
	,	clientObj = {}
	,	group = setupServerClient(serverObj,clientObj,connected,false);
	function connected (server) {
		server.makeError(100)
	}
	group.server.removeAllListeners('error') // server errors should throw now.
	test.uncaughtExceptionHandler = function (err){
		test.deepEqual(err,theError)
		check('serverError');
	}
	//of course since the error crashes the server now, the error never gets through to the client.
	//should I actually test for this?
	//what i'm really testing is how async_testing works with dnode.

    setTimeout(function () {
			check();
        group.server.end();
    }, 500);
}

if (module == require.main) {
  require('async_testing').run(__filename, process.ARGV);
}

