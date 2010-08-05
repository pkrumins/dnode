var net = require('net');
var EventEmitter = require('events').EventEmitter;

var io = require('socket.io');

var Conn = require('dnode/conn');
var SocketIOConn = require('dnode/socketio_conn');

module.exports = DNode;
module.exports.DNode = DNode;

DNode.prototype = new EventEmitter;
function DNode (wrapper) {
    if (!(this instanceof DNode)) return new DNode(wrapper);
    if (wrapper === undefined) wrapper = {};
    var self = this;
    
    function firstTypes (args) {
        var types = {};
        [].concat.apply([],args).forEach(function (arg) {
            var t = typeof(arg);
            if (!(t in types)) types[t] = arg;
        });
        return types;
    }
    
    self.connect = function () {
        var types = firstTypes(arguments) || {};
        var kwargs = types.object || {};
        var host = types.string || kwargs.host;
        var port = types.number || kwargs.port;
        var block = types['function'] || kwargs.block;
        
        // This will support different transport protocols like listen().
        // For now...
        var conn = new Conn({
            stream : net.createConnection(port, host),
            wrapper : wrapper,
            clients : {},
        });
        
        conn.on('remote', function (remote) {
            if (block) block.call(conn.instance, remote, conn);
        });
        
        self.end = function () { conn.end() };
        
        return self;
    };
    
    self.listen = function () {
        var types = firstTypes(arguments) || {};
        var kwargs = types.object || {};
        var proto = kwargs.protocol || 'socket';
        var block = types['function'] || kwargs.block;
        
        var clientId = 0;
        var clients = {};
        
        if (proto == 'socket') {
            var host = types.string || kwargs.host;
            var port = types.number || kwargs.port;
            
            var conns = [];
            var server = net.createServer(function (stream) {
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
                
            });
            server.listen(port, host);
            
            self.end = function () {
                conns.forEach(function (conn) { conn.end() });
                server.close();
            };
            
            self.close = self.end; // I can never remember which to use
            
        }
        else if (proto == 'socket.io') {
            // http server to proxy socketIO connections with
            var server = kwargs.server;
            delete kwargs.server;
            delete kwargs.protocol;
            var conn = new SocketIOConn({
                socketIO : io.listen(server, kwargs),
                wrapper : wrapper,
                clients : clients,
            });
            
            conn.on('remote', function (remote) {
                if (block) block.call(conn.instance, remote, conn);
            });
            
            self.end = function () { conn.end() };
        }
        else {
            throw 'Unsupported protocol: ' + proto;
        }
        
        return self;
    };
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

