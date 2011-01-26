var dnode = require('dnode');
var assert = require('assert');

exports.middleware = function () {
    var port = Math.floor(Math.random() * 40000 + 10000);
    /*
    var tf = setTimeout(function () {
        assert.fail('never finished');
    }, 1000);
    
    var tr = setTimeout(function () {
        assert.fail('never ready');
    }, 1000);
    */
    
    var server = dnode(function (client, conn) {
        if (!conn.zing) {
            server.close();
            conn.end();
        }
        assert.ok(conn.zing);
        assert.ok(!client.moo);
        conn.on('ready', function () {
            //clearTimeout(tr);
            assert.ok(client.moo);
        });
        this.baz = 42;
    }).listen(port);
    
    server.use(function (client, conn, next) {
        setTimeout(function () {
            conn.zing = true;
            next();
        }, 100);
    });
    
    server.use(function (client, conn, next) {
        conn.on('ready', function () {
            client.moo = true;
        });
    });
    
    server.on('ready', function () {
        dnode.connect(port, function (remote, conn) {
            //clearTimeout(tf);
            assert.ok(remote.baz);
            conn.end();
            server.close();
        });
    });
};
