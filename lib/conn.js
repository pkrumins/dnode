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
    self.stream = stream;
    
    var scrubber = new Scrubber;
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
                
                var msg = null;
                try { msg = JSON.parse(line) }//more error
                catch (err) {emitError(err);}
                
                if (msg) {
                    try { handleRequest(msg) }
                    catch (err) {//error
                        console.error(
                            'Error handling request: ' + sys.inspect(msg)
                        );
                        emitError(err);
                    }
                }
                
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
            var methods = args[0];
            
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
            
            clients[self.id] = self.remote;
            
            do {
                self.id = Math.floor(
                    Math.random() * Math.pow(2,32)
                ).toString(16);
            } while (self.id in clients);
            
            self.emit('remote', self.remote);
            self.emit('ready');
            
            if (opts.ping) pingInterval(opts.ping, opts.timeout);
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
    
    function obscureStack (err){
	   var e;
    	if (err.name && err.message && err.type){
          // omit stack and arguments, since those could leak
          // sensitive data
          // this needs to be Error type so that it displays right in error message.
          e = new Error(err.message);
          e.name = err.name;
          e.type = err.type;
          e.stack = err.name + ": " + err.message + "\n	[stack trace obscured for security]"
          
          //e.stack.splice(1)
    	} else {
    		 e = err;
    	}
		return e;
    }
    
    function apply(f, obj, args) {
        try {
            f.apply(obj, args);
        }
        catch (err) {
         	self.emit('error',err);
            /*
            	If remote has a method named 'error' it will be called with the error
            	there is code above in handleRequest that responds to that,
            	but I don't think there is any code path there at the moment.
            	
            	instead if remote.error exits the error is called.
            	
            	this is a less idiomatic way of handling errors. i'm gonna re-add an error request,
            	but leave calling remote.error so the interface doesn't change.
            */
            sendRequest('error',[obscureStack(err)])
            
            if (self.remote.error) {
                self.remote.error(obscureStack(err))
            }
        }
    }
    /*
    	ping the other side of the connection
    	ping = delay untill first ping.
    	timeout = time to final ping
    */
    function pingInterval (ping, timeout) {
        var pinger = null;
        pinger = setTimeout(function f () {
            var sent = Date.now();
            var t = null;
            if (timeout) {
                t = setTimeout(
                    function () { self.emit('timeout') },
                    timeout
                );
            }
            
            sendRequest('ping', [ function () {
                var elapsed = Date.now() - sent;
                self.emit('ping', elapsed);
                if (t) clearTimeout(t);
                // setTimeout so they don't stack up
                pinger = setTimeout(f, ping);
            } ]);
            
        }, ping);
        
        self.on('end', function () {
            clearTimeout(pinger);
        });
    }
    function emitError(err){
    	self.emit('error',err);
    }    
	//printError was here, now in dnode.js

};

