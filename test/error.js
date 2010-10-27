var DNode = require('dnode');
var sys = require('sys');

exports.simple = function (assert) {
    var port = Math.floor(Math.random() * 40000 + 10000);
    
    var server = DNode(function (remote) {
        this.one = function () {
            throw 'string throw'
        };
        
        this.two = function () {
            undefined.name
        };
        
        this.three = function () {
            remote.pow();
        };
    }).listen(port);
    
    var ended = { client : false, server : false };
    
    var serverErrors = { local : [], remote : [] };
    server.on('remoteError', function (err) {
        serverErrors.remote.push(err);
    });
    server.on('localError', function (err) {
        serverErrors.local.push(err);
    });
    server.on('end', function () {
        assert.equal(serverErrors.remote.length, 1);
        assert.equal(serverErrors.local.length, 2);
        ended.server = true;
    });
    
    var errNum = 0;
    var caughtLocal = false;
    server.on('ready', function () {
        var client = DNode(function (client, conn) {
            conn.on('remoteError', function (err) {
                errNum ++;
                if (errNum == 1) {
                    assert.equal(err, 'string throw');
                }
                else if (errNum == 2) {
                    try { undefined.name }
                    catch (refErr) {
                        assert.equal(err.name, refErr.name);
                        assert.equal(err.message, refErr.message);
                        assert.equal(err.type, refErr.type);
                    }
                }
            });
            
            conn.on('localError', function (err) {
                assert.equal(err, 'Local error');
                caughtLocal = true;
            });
            
            conn.on('end', function () {
                assert.equal(clientErrors.remote.length, 2);
                assert.equal(clientErrors.local.length, 1);
                ended.client = true;
            });
                
            this.pow = function () {
                throw 'Local error';
            };
        }).connect(port, function (remote) {
            remote.one();
            remote.two();
            remote.three();
        });
        
        var clientErrors = { local : [], remote : [] };
        client.on('localError', function (err) {
            clientErrors.local.push(err);
        });
        client.on('remoteError', function (err) {
            clientErrors.remote.push(err);
        });
    });
    
    setTimeout(function () {
        assert.equal(errNum, 2);
        assert.ok(caughtLocal);
        server.end();
        setTimeout(function () {
            assert.ok(ended.server);
            assert.ok(ended.client);
        }, 50);
    }, 200);
};
