var DNode = require('dnode');
var RemoteEmitter = require('dnode/events');

exports['remote emitters'] = function (assert) {
    var port = Math.floor(Math.random() * 40000 + 10000);
    
    function Moo () {
        this.moo = function () { this.emit('moo') };
        this.rem0 = new RemoteEmitter;
        
        this.once('attach', function (self) {
            self.tie('rem0');
            self.rem1 = self.tie(new RemoteEmitter);
            setTimeout(function () {
                self.rem0.emit('tied');
                self.rem1.emit('tied');
            }, 100);
        });
    }
    Moo.prototype = new RemoteEmitter;
    var moo = new Moo;
    
    var server = DNode(function (client, conn) {
        return moo.attach(conn);
    }).listen(port);
    
    var got = { moo : false, tied : [ false, false ] };
    
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
            assert.equal(remote.rem0.tie, undefined, 'Clients can see .tie');
            assert.equal(remote.rem1.tie, undefined, 'Clients can see .tie');
            
            remote.rem0.subscribe(function (ev) {
                ev.on('tied', function () {
                    got.tied[0] = true;
                });
            });
            
            remote.rem1.subscribe(function (ev) {
                ev.on('tied', function () {
                    got.tied[1] = true;
                });
            });
            
            setTimeout(function () {
                remote.moo();
            }, 1000);
        });
    });
    
    setTimeout(function () {
        assert.ok(got.moo);
        assert.ok(got.tied[0]);
        assert.ok(got.tied[1]);
        server.end();
    }, 2000);
};

