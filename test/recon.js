var dnode = require('dnode');

exports.recon = function (assert) {
    var port = Math.floor(Math.random() * 40000 + 10000);
    var to = setTimeout(function () {
        assert.fail('never started');
    }, 10000);
    
    var server1 = dnode(function (remote, conn) {
        this.decify = function (n, cb) {
            cb(n * 10);
            conn.end();
        };
    }).listen(port);
    
    var client = dnode.connect(
        'localhost', port, { reconnect : 10 },
        function (remote, conn) {
            clearTimeout(to);
            
            remote.decify(5, function (x) {
                assert.eql(x, 50);
                setTimeout(function () {
                    server1.close();
                }, 50);
                
                setTimeout(function () {
                    var server2 = dnode({
                        decify : function (n, cb) { cb(n * 0.1) }
                    }).listen(port);
                    
                    remote.decify(5, function (x) {
                        assert.eql(x, 0.5);
                        client.end();
                        conn.end();
                        server2.close();
                    });
                }, 500);
            });
        }
    );
};
