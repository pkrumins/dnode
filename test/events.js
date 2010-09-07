var DNode = require('dnode');
var RemoteEmitter = require('dnode/events');

exports['remote emitters'] = function (assert) {
    var port = Math.floor(Math.random() * 40000 + 10000);
    
    function Moo () {
        this.moo = function () { this.emit('moo') };
        
        this.once('attach', function (self) {
            self.rem = self.tie(new RemoteEmitter);
            setTimeout(function () { self.rem.emit('tied', 1234) }, 100);
        });
    }
    Moo.prototype = new RemoteEmitter;
    var moo = new Moo;
    
    var server = DNode(function (client, conn) {
        return moo.attach(conn);
    }).listen(port);
    
    var got = { moo : false, tied : false };
    
    server.on('ready', function () {
        DNode.connect(port, function (remote) {
            assert.throws(function () {
                remote.emit('doom');
            });
            
            remote.subscribe(function (ev) {
                ev.on('moo', function () {
                    got.moo = true;
                });
            });
            
            assert.equal(remote.tie, undefined, 'Clients can see .tie');
            assert.equal(remote.rem.tie, undefined, 'Clients can see .tie');
            
            remote.rem.subscribe(function (ev) {
                ev.on('tied', function (x) {
                    assert.equal(x, 1234);
                    got.tied = true;
                });
            });
            
            setTimeout(function () {
                remote.moo();
            }, 100);
        });
    });
    
    setTimeout(function () {
        assert.ok(got.moo);
        assert.ok(got.tied);
        server.end();
    }, 200);
};

