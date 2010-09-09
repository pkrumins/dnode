var DNode = require('dnode');
var sys = require('sys');

exports['bidirectional'] = function (assert) {
    var port = Math.floor(Math.random() * 40000 + 10000);
    
    var counts = { timesX : 0, clientX : 0, x : 0 };
    
    var server = DNode(function (client) {
        this.timesX = function (n,f) {
            assert.equal(n, 3, "timesX's n == 3");
            counts.timesX ++;
            client.x(function (x) {
                assert.equal(x, 20, 'client.x == 20');
                counts.clientX ++;
                f(n * x);
            });
        }; 
    }).listen(port);
    
    server.on('ready', function () {
        DNode({
            x : function (f) {
                counts.x ++;
                f(20);
            }
        }).connect(port, function (remote, conn) {
            remote.timesX(3, function (res) {
                assert.equal(res, 60, 'result of 20 * 3 == 60');
            });
        });
    });
        
    setTimeout(function () {
        assert.equal(counts.timesX, 1, 'timesX called once');
        assert.equal(counts.clientX, 1, 'clientX called once');
        server.end();
    }, 300);
};
