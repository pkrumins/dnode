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
				assert.strictEqual(n[0],1)
				assert.strictEqual(n[1],2)
				assert.strictEqual(n[2],3)
				assert.strictEqual(n[3],n)
            reply(sys.inspect(n));
        }
    }).listen(port);
    
    server.on('ready', function () {
        DNode.connect(port, function (remote, conn) {
            assert.equal(conn.stream.remoteAddress, '127.0.0.1');
            var args = [1,2,3]
            args.push(args)
				
            remote.print(args, function (m) {

                server.close();

            });
        });
    });
};
