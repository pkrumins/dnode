var EventEmitter = require('events').EventEmitter;
var Scrubber = require('./scrubber');
var BufferList = require('bufferlist');
var Buffer = require('buffer').Buffer;

var sys = require('sys');

module.exports = Conn;
Conn.prototype = new EventEmitter;
function Conn (args) {
    var self = this;
    var sock = args.stream;
    var remote = {};
    var scrubber = new Scrubber;
    
    self.clients = args.clients;
    
    self.end = function () {
        sock.end();
        sock.destroy();
    };
    
    // share an object or a function that builds an object
    self.instance = typeof(args.wrapper) == 'function'
        ? new args.wrapper(remote,self)
        : args.wrapper
    ;
    
    var bufferList = new BufferList;
    sock.on('data', function (buf) {
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
    
    sock.on('connect', function () {
        self.emit('connect');
        sendRequest('methods', [self.instance]);
    });
    
    sock.on('disconnect', function () {
        delete self.clients[self.clientId];
        self.emit('end'); // to keep things simple
    });
    
    sock.on('end', function () {
        delete self.clients[self.clientId];
        self.emit('end');
    });
    
    function sendRequest (method, args) {
        var scrub = scrubber.scrub(args);
        sock.write(JSON.stringify({
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
            Object.keys(args[0]).forEach(function (key) {
                remote[key] = args[0][key];
            });
            
            self.clients[self.clientId] = remote;
            
            do { // generate an unused clientId
                // note: clientId is deprecated, use id
                self.id = self.clientId = Math.floor(
                    Math.random() * Math.pow(2,32)
                ).toString(16);
            } while (self.clientId in self.clients);
            
            self.emit('remote', remote);
            self.emit('ready');
        }
        else if (typeof(req.method) == 'string') {
            self.instance[req.method].apply(self.instance,args);
        }
        else if (typeof(req.method) == 'number') {
            scrubber.callbacks[req.method].apply(self.instance,args);
        }
    }
};

