var DNode = require('dnode')
,	sys = require('sys')

exports.simple = function (assert) {
    var port = Math.floor(Math.random() * 40000 + 10000);
    
    var server = DNode({
        timesTen : function (n,reply) {
            assert.equal(n.number, 5);
            reply(n.number * 10);
        }
    ,   print : function (n,reply) {
				console.log(n);
            reply(sys.inspect(n));
        }
    }).listen(port);
    
    server.on('ready', function () {
        DNode.connect(port, function (remote, conn) {
            assert.equal(conn.stream.remoteAddress, '127.0.0.1');
            var args = {
            	number: 5
            ,	func: function hello(){}
            }
            remote.timesTen(args, function (m) {
                assert.equal(m, 50, '5 * 10 == 50');
                server.close();

            });
        });
    });
};
