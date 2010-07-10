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
    
    // share an object or a function that builds an object
    var instance = typeof(args.wrapper) == 'function'
        ? new args.wrapper(remote)
        : args.wrapper
    ;
    if (!('methods' in instance)) {
        instance.methods = function () {
            return Object.keys(instance);
        }
    }
    
    var bufferList = new BufferList;
    sock.addListener('data', function (buf) {
        if (buf instanceof Buffer) {
            bufferList.push(buf);
            var n = buf.toString().indexOf('\n');
            while (n >= 0) {
                var i = bufferList.length - (buf.length - n);
                var line = bufferList.take(i); // up to the \n
                bufferList.advance(i + 1); // past the \n
                
                var cmd = JSON.parse(line);
                if ('method' in cmd) {
                    handleRequest(cmd);
                }
                n = buf.toString().indexOf('\n', n + 1);
            }
        }
        else if (typeof(buf) == 'string') {
            // SocketIO wrapper sends strings
            var cmd = JSON.parse(buf);
            if ('method' in cmd) {
                handleRequest(cmd);
            }
        }
    });
    
    sock.addListener('connect', function () {
        sendRequest('methods', function (methods) {
            self.emit('methods', methods);
        });
    });
    
    var handlers = {}; // id => function
    var sendID = 0;
    
    function sendRequest (method) {
        var args = [].concat.apply([],arguments).slice(1);
        var scrub = scrubber.scrub(args);
        sock.write(JSON.stringify({
            method : method,
            arguments : scrub.arguments,
            callbacks : scrub.callbacks,
        }) + '\n');
        sendID ++;
    };
    
    function handleRequest(req) {
        var args = scrubber.unscrub(req);
        
        if (req.method == 'methods') {
            args[0](instance);
        }
        else if (typeof(req.method) == 'string') {
            instance[req.method](args);
        }
        else if (typeof(req.method) == 'number') {
            scrubber.callbacks[req.method].apply(instance,args);
        }
    }
};

