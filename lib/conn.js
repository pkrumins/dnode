var EventEmitter = require('events').EventEmitter;
var Scrubber = require('./scrubber');
var Lazy = require('lazy');

var clients = {};

module.exports = Conn;
Conn.prototype = new EventEmitter;
function Conn (stream, wrapper) {
    var self = this;
    self.stream = stream;
    
    self.once = function (name, cb) {
        self.on(name, function f () {
            self.removeListener(name, f);
            cb.apply(self, arguments);
        });
    };
    
    var scrubber = new Scrubber;
    self.end = function () {
        stream.end();
        stream.destroy();
    };
    
    self.remote = {};
    do {
        self.id = Math.floor(
            Math.random() * Math.pow(2,32)
        ).toString(16);
    } while (clients[self.id]);
    clients[self.id] = self.remote;
    
    // share an object or a function that builds an object
    self.instance = typeof(wrapper) == 'function'
        ? new wrapper(self.remote, self)
        : wrapper
    ;
    
    Lazy(stream).lines.forEach(function (line) {
        var msg = null;
        try { msg = JSON.parse(line) }
        catch (err) { sendError(err) }
        
        if (msg) {
            try { handleRequest(msg) }
            catch (err) { sendError(err) }
        }
    });
    
    stream.on('connect', function () {
        self.emit('connect');
        self.sendRequest('methods', [ self.instance ]);
    });
    
    stream.on('end', function () {
        self.emit('end');
        delete clients[self.id];
    });
    
    // emitted by recon
    stream.on('drop', function () {
        self.emit('drop');
    });
    
    self.sendRequest = function (method, args) {
        if (stream.readyState != 'open') {
            console.log('stream.readyState == ' + stream.readyState);
            return;
        }
        //scrubber is the place to start investigating!
        var scrub = scrubber.scrub(args);
        
        var writeRes = stream.write(JSON.stringify({
            method : method,
            arguments : scrub.arguments,
            callbacks : scrub.callbacks,
            links : scrub.links
        }) + '\n');
    };
    
    var wrapped = {};
    function handleRequest (req) {
        var args = scrubber.unscrub(req, function (id) {
            if (!(id in wrapped)) {
                // create a new function only if one hasn't already been created
                // for a particular id
                wrapped[id] = function () {
                    self.sendRequest(id, [].slice.apply(arguments));
                };
            }
            return wrapped[id];
        });

        if (req.method == 'methods') {
            handleMethods(args[0]);
        }
        else if (req.method == 'error') {
            var methods = args[0];
            self.emit('remoteError', methods);
        }
        else if (req.method == 'ping' && typeof args[0] == 'function') {
            args[0]();
        }
        else if (typeof req.method == 'string') {
                
            if (self.instance.propertyIsEnumerable(req.method)) {
                apply(self.instance[req.method], self.instance, args);
            }
            else {
                console.warn('Request for non-enumerable method: ' + req.method);
            }
        }
        else if (typeof req.method == 'number') {
            apply(scrubber.callbacks[req.method], self.instance, args);
        }
    }
    
    function handleMethods (methods) {
        if (typeof methods != 'object') {
            methods = {};
        }
        
        // copy since assignment discards the previous refs
        Object.keys(self.remote).forEach(function (key) {
            delete self.remote[key];
        });
        
        Object.keys(methods).forEach(function (key) {
            self.remote[key] = methods[key];
        });
        
        self.emit('remote', self.remote);
        self.emit('ready');
    }
    
    function apply(f, obj, args) {
        try {
            f.apply(obj, args);
        }
        catch (err) { sendError(err) }
    }
    
    function sendError (err) {
        self.emit('localError', err);
        self.sendRequest('error', [ obscureStack(err) ]);
    }
};

function obscureStack (err) {
    if (err.name && err.message && err.type) {
        // Omit stack and arguments, since those could leak sensitive data.
        // This needs to be Error type so that it displays right in error
        // message.
        var e = new Error(err.message);
        e.name = err.name;
        e.type = err.type;
        e.stack = err.name + ": " + err.message
            + "\n    [stack trace obscured for security]";
        return e;
    }
    else {
        return err;
    }
}

