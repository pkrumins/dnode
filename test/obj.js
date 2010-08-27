var DNode = require('dnode');

exports['object ref tests'] = function (assert) {
    var port = Math.floor(Math.random() * 40000 + 10000);
    
    var obj = { a : 1, b : 2, f : function (n,g) { g(n * 20) } };
    
    var server = DNode({
        getObject : function (f) { f(obj) },
    }).listen(port);
    
    server.on('ready', function () {
        DNode.connect(port, function (remote) {
            remote.getObject(function (rObj) {
                assert.equal(rObj.a, 1);
                assert.equal(rObj.b, 2);
                assert.equal(typeof rObj.f, 'function');
                rObj.a += 100; rObj.b += 100;
                assert.equal(obj.a, 1);
                assert.equal(obj.b, 2);
                assert.notEqual(obj.f, rObj.g);
                assert.equal(typeof obj.f, 'function');
                rObj.f(13, function (res) {
                    assert.equal(res, 260);
                    server.close();
                });
            });
        });
    });
};
