var EventEmitter = require('events').EventEmitter;
var Scrubber = require('dnode/scrubber').Scrubber;
var BufferList = require('bufferlist').BufferList;
var Buffer = require('buffer').Buffer;

exports.Conn = Conn;
Conn.prototype = new EventEmitter;
function Conn (args) {
    var self = this;
    var sock = args.stream;
    var remote = {};
    var scrubber = new Scrubber;
    
    this.clients = args.clients;
    
    this.broadcast = function (f) {
        if (typeof(f) == 'string') {
            var args = [].slice.apply(arguments);
            f = function (client) {
                client[args[0]].apply(client,args.slice(1));
            };
        }
        
        Object.keys(this.clients).forEach(function (key) {
            f(self.clients[key]);
        });
    };
    
    // share an object or a function that builds an object
    this.instance = typeof(args.wrapper) == 'function'
        ? new args.wrapper(remote,self)
        : args.wrapper
    ;
    
    var bufferList = new BufferList;
    sock.addListener('data', function (buf) {
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
    
    sock.addListener('connect', function () {
        self.emit('connect');
        sendRequest('methods', Object.keys(self.instance));
    });
    
    sock.addListener('disconnect', function () {
        delete self.clients[self.clientId];
        self.emit('disconnect');
    });
    
    function sendRequest (method, args) {
        var scrub = scrubber.scrub(args);
        sock.write(JSON.stringify({
            method : method,
            arguments : scrub.arguments,
            callbacks : scrub.callbacks,
        }) + '\n');
    };
    
    function handleRequest(req) {
        var args = scrubber.unscrub(req, function (id) {
            return function () {
                sendRequest(id, [].slice.apply(arguments));
            };
        });
        
        if (req.method == 'methods') {
            self.emit('methods', args);
            args.forEach(function (method) {
                remote[method] = function () {
                    var argv = [].slice.apply(arguments);
                    sendRequest(method, argv);
                };
            });
            
            do { // generate an unused clientId
                self.clientId = Math.floor(
                    Math.random() * Math.pow(2,32)
                ).toString(16);
            } while (self.clientId in self.clients);
            self.clients[self.clientId] = remote;
            
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

