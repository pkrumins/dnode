var DNode = require('dnode');
var sys = require('sys');

exports['circular refs'] = function (assert) {
    var port = Math.floor(Math.random() * 40000 + 10000);
    
    var server = DNode({
        sendObj : function (ref, f) {
            assert.equal(ref.a, 1);
            assert.equal(ref.b, 2);
            assert.equal(
                sys.inspect(ref.c),
                sys.inspect(ref)
            );
            
            ref.d = ref.c;
            
            f(ref);
        },
    }).listen(port);
    
    server.on('ready', function () {
        DNode.connect(port, function (remote) {
            var obj = { a : 1, b : 2 };
            obj.c = obj;
            
            remote.sendObj(obj, function (ref) {
                assert.equal(ref.a, 1);
                assert.equal(ref.b, 2);
                assert.equal(
                    sys.inspect(ref.c),
                    sys.inspect(ref)
                );
                assert.equal(
                    sys.inspect(ref.d),
                    sys.inspect(ref)
                );
            });
        });
    });
};
