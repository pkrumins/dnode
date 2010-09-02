var DNode = require('dnode');
var net = require('net');
var sys = require('sys');

exports.stream = function (assert) {
    var port = Math.floor(Math.random() * 40000 + 10000);
    
    var server = DNode({
        meow : function f (g) { g('cats') }
    });
    
    var netServer = net.createServer(function (stream) {
        server.withStream(stream);
    })
    netServer.listen(port, 'localhost');
    
    var netClient = net.createConnection(port);
    
    var times = 0;
    server.on('ready', function () {
        DNode.connect(netClient, function (remote) {
            remote.meow(function (cats) {
                times ++;
                assert.equal(cats, 'cats');
            });
        });
    });
    
    setTimeout(function () {
        assert.equal(times, 1);
        netClient.end();
        netServer.close();
    }, 200);
};
