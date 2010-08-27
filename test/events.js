var DNode = require('dnode');
var RemoteEmitter = require('dnode/events');

exports['remote emitters'] = function (assert) {
    var port = Math.floor(Math.random() * 40000 + 10000);
    
    function Moo () {
        this.moo = function () {
            console.log('emit moo');
            this.emit('moo!');
        };
    }
    Moo.prototype = new RemoteEmitter;
    var moo = new Moo;
    
    var server = DNode(function (client, conn) {
        return moo.attach(conn);
    }).listen(port);
    
    var gotMoo = false;
    
    server.on('ready', function () {
        DNode.connect(port, function (remote) {
            assert.throws(function () {
                remote.emit('doom');
            });
            
            remote.subscribe(function (ev) {
                ev.on('moo', function () {
                    gotMoo = true;
                    server.end();
                });
            });
            
            setTimeout(function () {
                remote.moo();
            }, 100);
        });
    });
    
    setTimeout(function () {
        assert.ok(gotMoo);
    }, 200);
};

