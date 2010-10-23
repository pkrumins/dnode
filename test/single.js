var DNode = require('dnode');


exports.simple = function (assert) {
    var port = Math.floor(Math.random() * 40000 + 10000);
    
    var server = DNode({
        timesTen : function (n,reply) {
            assert.equal(n.number, 5);
            reply(n.number * 10);
        }
    }).listen(port);
    
    server.on('ready', function () {
    	console.log("SERVER READY\n");
        DNode.connect(port, function (remote, conn) {
	    	console.log("\nCLIENT CONNECT\n");
            assert.equal(conn.stream.remoteAddress, '127.0.0.1');
            var args = {
            	number: 5
            ,	func: function hello(){}
            }
            remote.timesTen(args, function (m) {
                assert.equal(m, 50, '5 * 10 == 50');
                /*remote.timesTen(m, function (n) {
                    assert.equal(n, 500, '50 * 10 == 500');
                    server.close();
                });*/
                server.close();

            });
        });
    });
};
