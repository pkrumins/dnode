var net = require('net');
var http = require('http');
var EventEmitter = require('events').EventEmitter;

var io = require('socket.io');
var Traverse = require('traverse');

var Conn = require('./conn');
var StreamSocketIO = require('./stream_socketio');

var sys = require('sys');

module.exports = DNode;
module.exports.DNode = DNode;


DNode.prototype = new EventEmitter;
function DNode (wrapper) {
    if (!(this instanceof DNode)) return new DNode(wrapper);
    if (wrapper === undefined) wrapper = {};
    var self = this;
    
    /*
        this is a clever method of parsing the arguments. 
        I want to move it into another module so it can be tested
        and it's behaviour made absolutely clear.
        
        -Dominic
    */
    function firstTypes (args) {
        var args = [].concat.apply([],args);
        return args.reduce(function (types, arg) {
            if (arg instanceof http.Server) {
                types['http.Server'] = arg;
            }
            else if (arg instanceof net.Server) {
                types['net.Server'] = arg;
            }
            else if (arg instanceof net.Stream) {
                types['net.Stream'] = arg;
            }
            else if (arg instanceof io.Listener) {
                types['io.Listener'] = arg;
            }
            else {
                types[typeof arg] = arg;
            }
            return types;
        }, {});
    }
    
    function processOptions (opts){
         if (opts === undefined) {
             opts = {};
         }
         if (opts.printErrors === undefined) {
             opts.printErrors = true;
         }
         if (opts.printRemoteErrors === undefined) {
             opts.printRemoteErrors = true;
         }
         if (opts.printRemoteErrors){
             self.on('remoteError',printRemoteError);
         }
         if (opts.printErrors){
               self.on('error',printError);
         } else {
               self.on('error',function (){});
               /*
               keep current behaviour to fail silently if errors turned off.
               self.removeAllListeners('error') to get it to throw errors... 
               you probably don't want to do this outside of unit testing.
              -Dominic
               */
         }
    }
    self.connect = function () {
        var types = firstTypes(arguments) || {};
        var kwargs = types.object || {};
        var stream = types['net.Stream'];
        var host = types.string || kwargs.host;
        var port = types.number || kwargs.port;
        var block = types['function'] || kwargs.block;
        
        if (port) {
            stream = net.createConnection(port, host);
            stream.remoteAddress = host || '127.0.0.1';
            stream.remotePort = port;
        }
          processOptions(kwargs) //moving option processing into DNode from Conn.

        self.withStream(stream, kwargs, block);
        
        return self;
    };

    var ready = false;

    var conns = [];
    
    /*
    called when a new connection is made to the server.
    
    currently, oct24 2010, DNode passes opts to Conn.
    thats a code smell.

    this could probably be refactored to make the division of labor more distinct.
    but i'd want a tight test around Dnode + Conn first.
    */
    self.withStream = function (stream, opts, block) {
        if (!ready) self.emit('ready');
        ready = true;

        var conn = new Conn(stream, wrapper, opts);

        conn.on('remote', function (remote) {
            if (block) block.call(conn.instance, remote, conn);
        });
            
        conn.on('error',function(err){
                self.emit('error',err);
        });
        conn.on('remoteError',function(err){
                self.emit('remoteError',err);
        });
        conn.on('connect', function () { conns.push(conn) });
        conn.on('end', function () {
            var i = conns.indexOf(conn);
            if (i >= 0) conns.splice(i,1);
        });
    }
    
    self.end = function () {
        self.emit('error', '.end() is not defined for this action');
    };
    
    self.listen = function () {
        var types = firstTypes(arguments) || {};
        var kwargs = types.object || {};
        var server = kwargs.server
            || types['http.Server']
            || types['net.Server']
            || types['io.Listener']
            || null;
        
        var host = types.string || kwargs.host;
        var port = types.number || kwargs.port;
        var block = types['function'] || kwargs.block;
            processOptions(kwargs)//moving option processing into DNode from Conn.

        if (server instanceof io.Listener) {
            var stream = StreamSocketIO(function (stream) {
                self.withStream(stream, kwargs, block);
            });
        }
        else if (server instanceof http.Server) {
            // http server to proxy socketIO connections with
            delete kwargs.server;
            var opts = Traverse(kwargs).copy;
            delete kwargs.protocol;
            delete kwargs.printErrors;
            delete kwargs.printRemoteErrors;
            
            var sock = io.listen(server, kwargs);
            
            StreamSocketIO(sock, function (stream) {
                self.withStream(stream, opts, block);
            });
            ready = true;
            self.emit('ready');
        }
        else if (port) {
            server = net.createServer(function (stream) {
                self.withStream(stream, kwargs, block);
            });
            server.listen(port, host, function () {
                ready = true;
                self.emit('ready')
            });
        }
        else {
            throw "Not sure how to fire up this listener";
        }
        
        self.end = function () {
            conns.forEach(function (conn) { conn.end() });
            server.close();
        };
        
        self.close = self.end;
        
        return self;
    };
    
    return self;
}

// So DNode.connect and DNode().connect do the same thing:
DNode.connect = function () {
    var dnode = DNode();
    return dnode.connect.apply(dnode,[].concat.apply([],arguments));
};

// wrapper to turn synchronous functions into asynchronous ones with the
// result callback inserted as the last argument
DNode.sync = function (f) {
    return function () {
        var args = [].concat.apply([],arguments);
        var argv = args.slice(0,-1);
        var cb = args.slice(-1)[0];
        cb(f.apply(this,argv));
    };
};

// Expose prototype methods so DNode can get at them
DNode.expose = function (obj, name) {
    obj[name] = function () {
        var args = [].slice.call(arguments);
        return obj.constructor.prototype[name].apply(obj, args);
    };
};
//moved from Conn.js
 function printRemoteError (err) {
       console.error('Remote error from client ~please patch dnode/lib/dnode.js to show remote.id~');
        printError(err)
 }
 function printError (err) {
     console.error(
         (err.stack ? err.stack.toString() : err.toString())
         .replace(/^/mg, '    ') + '\n'
     );
     
 }

