var DNode = require('dnode');

exports['nested'] = function (assert) {
    var port = Math.floor(Math.random() * 40000 + 10000);
    
    var EventEmitter = require('events').EventEmitter;
    
    var server1 = DNode({
        timesTen : function (n,reply) { reply(n * 10) }
    }).listen(port);
    
    var server2 = DNode({
        timesTwenty : function (n,reply) { reply(n * 20) }
    }).listen(port + 1);
    
    var moo = new EventEmitter;
    
    // Don't worry, real code does't look like this:
    server1.on('ready', function () {
        server2.on('ready', function () {
            DNode.connect(port, function (remote1, conn1) {
                DNode.connect(port + 1, function (remote2, conn2) {
                    moo.on('hi', function (x) {
                        remote1.timesTen(x, function (res) {
                            assert.equal(res, 5000, 'emitted value times ten');
                            remote2.timesTwenty(res, function (res2) {
                                assert.equal(res2, 100000, 'result times twenty');
                                server1.close(); server2.close();
                            });
                        });
                    });
                    remote2.timesTwenty(5, function (n) {
                        assert.equal(n, 100);
                        remote1.timesTen(0.1, function (n) {
                            assert.equal(n, 1);
                        });
                    });
                });
            });
        });
    });
    
    setTimeout(function() {
        moo.emit('hi', 500);
    }, 200);
};
