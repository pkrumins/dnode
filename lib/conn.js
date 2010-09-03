var EventEmitter = require('events').EventEmitter;
var Scrubber = require('./scrubber');
var BufferList = require('bufferlist');
var Buffer = require('buffer').Buffer;

var sys = require('sys');

var clients = {};

module.exports = Conn;
Conn.prototype = new EventEmitter;
function Conn (stream, wrapper, opts) {
    var self = this;
    var scrubber = new Scrubber;
    
    if (opts === undefined) {
        opts = {};
    }
    if (opts.printErrors === undefined) {
        opts.printErrors = true;
    }
    if (opts.printRemoteErrors === undefined) {
        opts.printRemoteErrors = true;
    }
    
    self.end = function () {
        stream.end();
        stream.destroy();
    };
    
    self.remote = {};
    
    // share an object or a function that builds an object
    self.instance = typeof(wrapper) == 'function'
        ? new wrapper(self.remote, self)
        : wrapper
    ;
    
    var bufferList = new BufferList;
    stream.on('data', function (buf) {
        if (buf instanceof Buffer) {
            bufferList.push(buf);
            var n = buf.toString().indexOf('\n');
            while (n >= 0) {
                var i = bufferList.length - (buf.length - n);
                var line = bufferList.take(i); // up to the \n
                bufferList.advance(i + 1); // past the \n
                
                var msg = JSON.parse(line);
                handleRequest(msg);
                n = buf.toString().indexOf('\n', n + 1);
            }
        }
        else if (typeof(buf) == 'string') {
            // SocketIO wrapper sends strings
            var msg = JSON.parse(buf);
            handleRequest(msg);
        }
    });
    
    stream.on('connect', function () {
        self.emit('connect');
        sendRequest('methods', [self.instance]);
    });
    
    stream.on('end', function () {
        self.emit('end');
        delete clients[self.id];
    });
    
    function sendRequest (method, args) {
        var scrub = scrubber.scrub(args);
        stream.write(JSON.stringify({
            method : method,
            arguments : scrub.arguments,
            callbacks : scrub.callbacks,
        }) + '\n');
    };
    
    var wrapped = {};
    function handleRequest(req) {
        var args = scrubber.unscrub(req, function (id) {
            if (!(id in wrapped)) {
                // create a new function only if one hasn't already been created
                // for a particular id
                wrapped[id] = function () {
                    sendRequest(id, [].slice.apply(arguments));
                };
            }
            return wrapped[id];
        });
        
        if (req.method == 'methods') {
            // copy since assignment discards the previous refs
            Object.keys(self.remote).forEach(function (key) {
                delete self.remote[key];
            });
            
            Object.keys(args[0]).forEach(function (key) {
                self.remote[key] = args[0][key];
            });
            
            clients[self.id] = self.remote;
            
            do {
                self.id = Math.floor(
                    Math.random() * Math.pow(2,32)
                ).toString(16);
            } while (self.id in clients);
            
            self.emit('remote', self.remote);
            self.emit('ready');
        }
        else if (req.method == 'error') {
            self.emit('remoteError', args[0], self.remote);
            if (opts.printRemoteErrors) {
                console.error('Remote error from client ' + self.id + ':');
                printError(err);
            }
        }
        else if (typeof(req.method) == 'string') {
            if (self.instance.propertyIsEnumerable(req.method)) {
                apply(self.instance[req.method], self.instance, args);
            }
            else {
                console.warn('Request for non-enumerable method: ' + req.method);
            }
        }
        else if (typeof(req.method) == 'number') {
            apply(scrubber.callbacks[req.method], self.instance, args);
        }
    }
    
    function apply(f, obj, args) {
        try {
            f.apply(obj, args);
        }
        catch (err) {
            if (opts.printErrors) {
                console.error('Server error with client ' + self.id + ':');
                printError(err);
            }
            if (self.remote.error) {
                self.remote.error(err.toString());
            }
        }
    }
    
    function printError (err) {
        console.error(
            (err.stack ? err.stack.toString() : err.toString())
            .replace(/^/mg, '    ') + '\n'
        );
    }
};

