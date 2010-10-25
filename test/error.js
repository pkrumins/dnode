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
    
    var errNum = 0;
    var caughtLocal = false;
    server.on('ready', function () {
        DNode(function (client, conn) {
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
            
            this.pow = function () {
                throw 'Local error';
            };
        }).connect(port, function (remote) {
            remote.one();
            remote.two();
            remote.three();
        });
    });
    
    setTimeout(function () {
        assert.equal(errNum, 2);
        assert.ok(caughtLocal);
        server.end();
    }, 200);
};
