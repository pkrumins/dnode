var DNode = require('dnode');

exports['bidirectional'] = function (assert) {
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
    }).listen(6060);
    
    DNode({
        x : function (f) {
            counts.x ++;
            f(20);
        }
    }).connect(6060, function (remote, conn) {
        remote.timesX(3, function (res) {
            assert.equal(res, 60, 'result of 20 * 3 == 60');
            conn.end();
            server.end();
        });
    });
    
    setTimeout(function () {
        assert.equal(counts.timesX, 1, 'timesX called once');
        assert.equal(counts.clientX, 1, 'clientX called once');
    }, 100);
};
