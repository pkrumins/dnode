var net = require('net');
var sys = require('sys');
var BufferList = require('bufferlist').BufferList;
var EventEmitter = require('events').EventEmitter;
var io = require('socket.io');

exports.DNode = DNode;
function DNode (wrapper) {
    if (!(this instanceof DNode)) return new DNode(wrapper);
    if (wrapper == undefined) wrapper = {};
    var dnode = this;
    
    // share an object or a function that returns an object
    var f = wrapper instanceof Function
        ? wrapper
        : function () { return wrapper }
    ;
    
    function firstType (args, type) {
        return [].concat.apply([],args).filter(function (x) {
            return typeof(x) == type
        })[0];
    }
    
    this.connect = function () {
        var kwargs = firstType(arguments,'object') || {};
        var host = firstType(arguments,'string') || kwargs.host;
        var port = firstType(arguments,'number') || kwargs.port;
        var block = firstType(arguments,'function') || kwargs.block;
        
        var conn = new DNodeConn({
            stream : net.createConnection(port, host),
            instance : f(),
        });
        conn.addListener('remote', function (remote) {
            block.call(remote, conn, remote);
        });
    };
    
    this.listen = function () {
        var kwargs = firstType(arguments,'object') || {};
        var proto = kwargs.protocol || 'socket';
        
        if (proto == 'socket') {
            var host = firstType(arguments,'string') || kwargs.host;
            var port = firstType(arguments,'number') || kwargs.port;
            
            net.createServer(function (stream) {
                var conn = new DNodeConn({
                    stream : stream,
                    instance : f(),
                });
            }).listen(port, host);
        }
        else if (proto == 'socket.io') {
            // http server to proxy socketIO connections with
            var server = kwargs.server;
            delete kwargs.server;
            delete kwargs.protocol;
            var socketIO = io.listen(server, kwargs);
            
            var sessions = {};
            
            socketIO.addListener('clientConnect', function (client) {
                client.write(JSON.stringify({
                    method : 'methods',
                    arguments : [],
                    id : -1,
                }));
            });
            
            socketIO.addListener('clientMessage', function (msgString,client) {
                var msg = JSON.parse(msgString);
                if (!(client.sessionId in sessions)) {
                    sessions[session.id] =
                        new DNode.SocketIO.Session(client, msg.result);
                }
                sessions[session.id].handleClient(msg);
            });
        }
        else {
            throw 'Unsupported protocol: ' + proto;
        }
        return this;
    };
}

// So DNode.connect and DNode().connect do the same thing:
DNode.connect = function () {
    var dnode = DNode();
    return dnode.connect.apply(dnode,[].concat.apply([],arguments));
};

DNodeConn.prototype = new EventEmitter;
function DNodeConn (args) {
    var conn = this;
    
    var sock = args.stream;
    var instance = args.instance;
    var remote;
    
    var bufferList = new BufferList;
    sock.addListener('data', function (buf) {
        bufferList.push(buf);
        var n = buf.toString().indexOf('\n');
        while (n >= 0) {
            var i = bufferList.length - (buf.length - n);
            var line = bufferList.take(i); // up to the \n
            bufferList.advance(i + 1); // past the \n
            
            var cmd = JSON.parse(line);
            if ('method' in cmd) {
                conn.emit('request', cmd);
            }
            else if ('result' in cmd) {
                conn.emit('response', cmd);
            }
            n = buf.toString().indexOf('\n', n + 1);
        }
    });
    
    sock.addListener('connect', function () {
        conn.request({
            method : 'methods',
            block : function (methods) {
                remote = {};
                methods.forEach(function (method) {
                    remote[method] = function () {
                        var argv = [].concat.apply([],arguments);
                        conn.request({
                            method : method,
                            arguments : argv.slice(0,-1),
                            block : argv.slice(-1)[0],
                        });
                    };
                });
                conn.emit('methods', methods);
                conn.emit('remote', remote);
            }
        });
    });
    
    var handlers = {}; // id => function
    var sendID = 0;
    
    this.request = function (req) {
        sock.write(JSON.stringify({
            id : sendID,
            method : req.method,
            arguments : req.arguments || [],
        }) + '\n');
        handlers[sendID] = req.block;
        sendID ++;
    };
    
    this.addListener('request', function (req) {
        var f = instance[req.method];
        if (req.method == 'methods' && f == undefined) {
            var methods = ['methods'];
            for (var method in instance) {
                methods.push(method);
            }
            f = function () { return methods };
        }
        
        function respond (res) {
            sock.write(JSON.stringify({
                id : req.id,
                result : res,
            }) + '\n');
        }
        
        if (f.asynchronous == true) {
            var args = req.arguments.concat(respond);
            f.apply(instance, args);
        }
        else {
            var res = f.apply(instance, req.arguments);
            respond(res);
        }
    });
    
    this.addListener('response', function (res) {
        handlers[res.id].call(remote, res.result);
    });
};

exports.async = async;
DNode.async = async;
function async (f) {
    f.asynchronous = true;
    return f;
};

DNode.SocketIO = {};
DNode.SocketIO.Session = function Session (client, methods) {
    this.id = client.sessionId;
    
    var reqId = 0;
    var clientHandlers = {};
    var objects = {}; // map nodes to client wrapped objects
    var remotes = {}; // map nodes to dnode remote objects
    var dnodes = {}; // map nodes to dnode connections
    
    function error (msg) {
        client.write(JSON.stringify({
            emit : 'error', arguments : [msg],
        }));
    }
    
    function requireKeys (msg, keys) {
        var missing = keys.filter(function (key) {
            return !(key in msg)
        });
        if (missing.length > 0) {
            error('Missing keys ' + sys.inspect(missing)
                + ' in request: ' + sys.inspect(msg));
            return false;
        }
        else {
            return true;
        }
    }
    
    // handle messages from the client
    this.handleClient = function (msg) {
        if ('result' in msg) {
            // response from the client
            if (requireKeys(msg, ['id','result'])) {
                var f = handlers[msg.id];
                f.call(objects[f.node], msg.result);
            }
        }
        else if ('method' in msg) {
            // request from the client
            if (requireKeys(msg, ['node','method','arguments'])) {
                var remote = remotes[msg.node];
                remote[msg.method].apply(remote, msg.arguments);
            }
        }
        else if ('connect' in msg) {
            if (requireKeys(msg, ['node'])) {
                this.connect(msg.node);
            }
        }
        else if ('disconnect' in msg) {
            if (requireKeys(msg, ['node'])) {
                this.disconnect(msg.node);
            }
        }
    };
    
    this.connect = function (node) {
        if (!(node in nodes)) {
            error('Node ' + sys.inspect(node) + ' is not available');
        }
        else {
            // messages from each node come in through the object interface
            var obj = {};
            methods.forEach(function (method) {
                obj[method] = DNode.async(function () {
                    var args = [].concat.apply([],arguments);
                    var argv = args.slice(0,-1);
                    var f = args.slice(-1)[0];
                    
                    f.node = node;
                    handlers[reqId] = f;
                    client.write(JSON.stringify({
                        method : method,
                        arguments : argv,
                        node : node,
                        id : reqId ++,
                    }));
                    
                });
            });
            objects[node] = obj;
            
            DNode(obj).connect(nodes[node], function (dnode, remote) {
                remotes[node] = remote;
                dnodes[node] = dnode;
            });
        }
    };
    
    this.disconnect = function (node) {
        if (node === undefined) {
            // disconnect all connected nodes
            Object.keys(dnodes).forEach(function (node) {
                dnodes[node].end();
            });
        }
        else {
            dnodes[node].end();
        }
    };
}
