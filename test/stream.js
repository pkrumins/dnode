var DNode = require('dnode');
var net = require('net');

exports.stream = function (assert) {
    var port = Math.floor(Math.random() * 40000 + 10000);
    var netServer = net.createServer(port);
    var netClient = net.createClient(port);
    
    var server = DNode({
        meow : function f (g) { g('cats') }
    }).listen(server);
    
    var times = 0;
    DNode.connect(netClient, function (remote) {
        remote.meow(function (cats) {
            times ++;
            assert.equal(cats, 'cats');
        });
    });
    
    setTimeout(function () {
        assert.equal(times, 1);
    }, 200);
};
