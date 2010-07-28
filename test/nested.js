var DNode = require('dnode');

exports['nested'] = function (assert) {
    var EventEmitter = require('events').EventEmitter;
    
    var server1 = DNode({
        timesTen : function (n,reply) { reply(n * 10) }
    }).listen(6060);
    
    var server2 = DNode({
        timesTwenty : function (n,reply) { reply(n * 20) }
    }).listen(6061);
    
    var moo = new EventEmitter;
    
    DNode.connect(6060, function (remote1, conn1) {
        DNode.connect(6061, function (remote2, conn2) {
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
    
    setTimeout(function() {
        moo.emit('hi', 500);
    }, 200);
};
