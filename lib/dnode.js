var net = require('net');
var http = require('http');
var EventEmitter = require('events').EventEmitter;

var io = require('socket.io');

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
            else if (arg instanceof net.Server) {
                types['http.Client'] = arg;
            }
            else if (arg instanceof net.Server) {
                types['net.Client'] = arg;
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
    
    self.connect = function () {
        var types = firstTypes(arguments) || {};
        var kwargs = types.object || {};
        var stream = types['net.Stream'];
        var host = types.string || kwargs.host;
        var port = types.number || kwargs.port;
        var block = types['function'] || kwargs.block;
        
        var conn = null;
        
        if (port) {
            stream = net.createConnection(port, host);
        }
        
        var conn = new Conn({
            stream : stream,
            wrapper : wrapper,
            clients : {},
        });
        
        conn.on('remote', function (remote) {
            if (block) block.call(conn.instance, remote, conn);
        });
        
        self.end = function () { conn.end() };
        
        return self;
    };
    
    var ready = false;
    
    var conns = [];
    var clients = {};
    self.withStream = function (stream, block) {
        if (!ready) self.emit('ready');
        ready = true;
        
        var conn = new Conn({
            stream : stream,
            wrapper : wrapper,
            clients : clients,
        });
        
        conn.on('remote', function (remote) {
            if (block) block.call(conn.instance, remote, conn);
        });
        
        conn.on('connect', function () { conns.push(conn) });
        conn.on('end', function () {
            conn.end();
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
        
        if (server && server instanceof io.Listener) {
            var stream = StreamSocketIO(self.withStream);
        }
        else if (server instanceof http.Server) {
            // http server to proxy socketIO connections with
            delete kwargs.server;
            delete kwargs.protocol;
            var sock = io.listen(server, kwargs);
            StreamSocketIO(sock, self.withStream);
            ready = true;
            self.emit('ready');
        }
        else if (port) {
            server = net.createServer(self.withStream);
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

