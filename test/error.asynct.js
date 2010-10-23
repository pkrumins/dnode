var DNode = require('dnode');
var sys = require('sys');

function setupServerClient(server,client,connected){
	var port = Math.floor(Math.random() * 40000 + 10000)
	,	 group = {}
	group.server = DNode(server).listen(port,{printErrors: false})
	group.client = DNode(client)
	group.server.on('ready',function(){
		 group.client.connect(port,connected,{printErrors: false})
	});
	return group;
}
/*function test_emit_error_group(){


}*/
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
	   		//console.log("CALLBACK L :" + arg);
	     		cb(arg);
	     }
     }
	,	clientObj = {}
	,	group = setupServerClient(serverObj,clientObj,connected);
	
	function connected(remote){
      remote.one();
      remote.two();
		//console.log("ECPECT ERROR AFTER THIS");
      remote.callback("ERROR MESSAGE",
      	function (message){
//			console.log("THROW ERROR (" + message + ")");
      	
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
       	test.ok(false,"did not expect:" + err);
       }
    }
    
    setTimeout(function () {
        test.equal(errNum, 2,"expected 2 error on server, got " + errNum);
        test.equal(clientErrNum, 1,"expected 1 error on client");
        group.server.end();
        test.finish();
    }, 500);
    
    //tidy this test.
    //also test that process.on('uncaughtException',...) works.
};

//test remote errors

if (module == require.main) {
  require('async_testing').run(__filename, process.ARGV);
}

