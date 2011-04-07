var dnode = require('dnode');

exports.recon = function (assert) {
    var port = Math.floor(Math.random() * 40000 + 10000);
    var to = setTimeout(function () {
        assert.fail('never started');
    }, 10000);
    
    var multiplier = null;
    var running = false;
    function makeServer (m) {
        multipler = m;
        var s = dnode(function (remote, conn) {
            this.mult = function (n, cb) {
                cb(n * m);
                conn.end();
            };
        }).listen(port);
        return s;
    }
    var server = makeServer(10);
    
    var client = dnode.connect({
        host : 'localhost',
        port : port,
        reconnect : 100,
        block : session,
    });
    
    var res = {};
    function session (remote, conn) {
        clearTimeout(to);
        
        remote.mult(5, function (x) {
            res[multipler] = x;
            assert.eql(x, 5 * multipler);
            conn.end();
            server.close();
        });
    }
    
    var tc1 = setTimeout(function () {
        assert.fail('never got first close');
    }, 2000);
    
    var tc2 = setTimeout(function () {
        assert.fail('never got second close');
    }, 2000);
    
    server.once('close', function () {
        clearTimeout(tc1);
        server = makeServer(33);
        
        server.once('close', function () {
            clearTimeout(tc2);
            assert.eql(res, { 10 : 10 * 5,  33 : 33 * 5 });
        });
    });
};
