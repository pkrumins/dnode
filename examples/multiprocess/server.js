// server:
var DNode = require('dnode')
,	sys = require('sys')
,	spawn = require('child_process').spawn
,  server = DNode({
    timesTen : 
    	function (n,f) {
    		sys.puts("10 * " + n + " = " + n * 10);
     		f(n * 10) 
     	},

}).listen(6060);

server.on('ready', function () {
	cp = spawn('node', ['./client.js'])
	
	cp.on('exit',function(){
		server.end();
	});
	
	cp.stdout.on('data',
		function(data){
			sys.print('child: ' + data);
		}
	);
});

