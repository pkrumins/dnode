var DNode = require('dnode');


exports.simple = function (assert) {
    var port = Math.floor(Math.random() * 40000 + 10000);
    
    var server = DNode({
        timesTen : function (n,reply) {
            assert.equal(n, 50);
            reply(n * 10);
        },
        moo : function (reply) { reply(100) },
        sTimesTen : DNode.sync(function (n) {
            assert.equal(n, 5);
            return n * 10;
        }),
    }).listen(port);
    
    server.on('ready', function () {
        DNode.connect(port, function (remote, conn) {
            assert.equal(conn.stream.remoteAddress, '127.0.0.1');
            
            remote.moo(function (x) {
                assert.equal(x, 100, 'remote moo == 100');
            });
            remote.sTimesTen(5, function (m) {
                assert.equal(m, 50, '5 * 10 == 50');
                remote.timesTen(m, function (n) {
                    assert.equal(n, 500, '50 * 10 == 500');
                    server.close();
                });
            });
        });
    });
};
