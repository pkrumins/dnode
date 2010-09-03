var DNode = require('dnode');
var sys = require('sys');

exports.simple = function (assert) {
    var port = Math.floor(Math.random() * 40000 + 10000);
    
    var server = DNode({
        one : function () {
            throw 'string throw'
        },
        two : function () {
            undefined.name
        },
        error : function (err) {
            console.log('err = ' + sys.inspect(err));
        },
    }).listen(port, { printErrors : false });
    
    var errNum = 0;
    server.on('ready', function () {
        DNode({
            error : function (err) {
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
            }
        }).connect(port, function (remote) {
            remote.one();
            remote.two();
        });
    });
    
    setTimeout(function () {
        assert.equal(errNum, 2);
        server.end();
    }, 200);
};
