var net = require('net');
var sys = require('sys');
var BufferList = require('bufferlist').BufferList;
var EventEmitter = require('events').EventEmitter;

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
            block.call(remote, conn);
        });
    };
    
    this.listen = function () {
        var kwargs = firstType(arguments,'object') || {};
        var host = firstType(arguments,'string') || kwargs.host;
        var port = firstType(arguments,'number') || kwargs.port;
        var block = firstType(arguments,'function') || kwargs.block;
        
        net.createServer(function (stream) {
            var conn = new DNodeConn({
                stream : stream,
                instance : f(),
            });
        }).listen(port, host);
    };
}
// So DNode.connect and DNode().connect do the same thing
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

var io = require('socket.io');
function values (obj) {
    var acc;
    for (var i in obj) acc.push(obj[i]);
    return acc;
}

DNode.socketIO = function (opts) {
    this.proxy = function (args) {
        // whitelist maps names to host:port combos
        var whitelist = args.whitelist || {};
        
        var server = args.server;
        var connections = {};
        var objects = {}; // client session id => wrapped object
        
        var socketIO = io.listen(server, {
            onClientConnect : function (client) {
                connections[client.sessionId] = {};
                objects[client.sessionId] = {
                    methods : function () {
                        
                    }
                };
                
                client.send(JSON.stringify({
                    emit : 'available',
                    addrs : values(whitelist),
                }));
            },
            onClientMessage : function (msgString, client) {
                var msg = JSON.parse(msgString);
                var conns = connections[client.sessionId];
                
                if (msg.action == 'connect') {
                    if (msg.addr in values(whitelist)) {
                        var host = msg.addr.split(/:/)[0];
                        var port = parseInt(msg.addr.split(/:/)[1], 10);
                        
                        DNode(obj).connect(host, port, function (dnode) {
                            conns.push(dnode);
                            client.write(JSON.stringify({
                                emit : 'connected',
                                addr : addr,
                            }));
                        });
                    }
                    else {
                        client.write(JSON.stringify({
                            emit : 'error',
                            addr : addr,
                            error : addr + ' is not in the whitelist',
                        }));
                    }
                }
                else {
                    var conn = conns[msg.addr];
                    var method = msg.method;
                    // todo : stuff
                }
            },
            onClientDisconnect : function (msg, client) {
            },
        });
    };
};

