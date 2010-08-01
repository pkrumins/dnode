var DNode = require('dnode');
var EventEmitter = require('events').EventEmitter;
var sys = require('sys');

exports['event emitter test'] = function (assert) {
    var emitted = false;
    var ev = new EventEmitter;
    ev.emit = ev.emit; // expose to dnode
    ev.on('test', function (a, b, c) {
        assert.equal(a, 1);
        assert.equal(b, 2);
        assert.equal(sys.inspect(c), sys.inspect([3,4]));
        emitted = true;
    });
    
    Server.prototype = new EventEmitter;
    function Server() {
        var self = this;
        self.on = self.on;
        
        self.pass = function (name, em) {
            self.on(name, function () {
                var args = [].slice.apply(arguments);
                args.unshift(name);
                em.emit.apply(em, args);
            });
        };
        
        setTimeout(function () {
            self.emit('test', 1, 2, [3,4]);
        }, 250);
        
        setTimeout(function () {
            assert.ok(emitted, 'test event not emitted');
        }, 500);
    }
    
    var port = Math.floor(Math.random() * 40000 + 10000);
    
    var server = DNode(Server).listen(port);
    DNode.connect(port, function (remote) {
        remote.pass('test', ev);
    });
    setTimeout(function () { server.end() }, 750);
};

