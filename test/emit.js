var DNode = require('dnode');
var EventEmitter = require('events').EventEmitter;
var sys = require('sys');

exports['event emitter test'] = function (assert) {
    var emitted = false;
    var ev = new EventEmitter;
    
    DNode.expose(ev, 'emit');
    
    ev.on('test1', function (a, b, c) {
        assert.equal(a, 1);
        assert.equal(b, 2);
        assert.equal(sys.inspect(c), sys.inspect([3,4]));
        emitted = true;
    });
    
    Server.prototype = new EventEmitter;
    function Server() {
        var self = this;
        DNode.expose(self, 'on');
        DNode.expose(self, 'removeListener');
        DNode.expose(self, 'emit');
        
        self.pass = function (name, em) {
            self.on(name, function () {
                var args = [].slice.apply(arguments);
                args.unshift(name);
                em.emit.apply(em, args);
            });
        };
        
        setTimeout(function () {
            self.emit('test1', 1, 2, [3,4]);
            self.emit('test2', 1337);
        }, 250);
        
        setTimeout(function () {
            assert.ok(emitted, 'test1 event not emitted');
        }, 500);
    }
    
    var port = Math.floor(Math.random() * 40000 + 10000);
    
    var server = DNode(Server).listen(port);
    DNode.connect(port, function (remote) {
        remote.pass('test1', ev);
        var test2_calls = 0;
        remote.on('test2', function f () {
            test2_calls ++;
            assert.ok(test2_calls == 1, 'test2 emitter not removed')
            remote.removeListener('test2', f);
            remote.emit('test2');
        });
    });
    setTimeout(function () { server.end() }, 750);
};

