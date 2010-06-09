var net = require('net');
var BufferList = require('bufferlist').BufferList;
var sys = require('sys');

exports.DNode = DNode;
function DNode (wrapper) {
    if (!(this instanceof DNode)) return new DNode(wrapper);
    var dnode = this;
    
    // share an object or a function that returns an object
    var f = wrapper instanceof Function
        ? wrapper
        : function () { return wrapper }
    ;
    
    var handlers = {}; // id => function
    var sendID = 0;
    
    function send(sock, req) {
        handlers[sendID] = req.callback;
        sock.write(JSON.stringify({
            id : sendID,
            method : req.method,
            arguments : req.arguments,
        }) + '\n');
        sendID ++;
    }
    
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
        
        var sock = net.createConnection(port, host);
        emitCommands(sock);
        sock.addListener('command', handler(f()));
        sock.addListener('connect', function () {
            send(sock, {
                method : 'methods',
                arguments : [],
                callback : function (methods) {
                    var obj = {};
                    methods.forEach(function (method) {
                        obj[method] = function () {
                            var args = [].concat.apply([],arguments);
                            send(sock, {
                                method : method,
                                arguments : args.slice(0,-1),
                                callback : args.slice(-1)[0],
                            });
                        };
                    });
                    block.call(dnode, obj);
                },
            });
        });
    };
    
    this.listen = function () {
        var kwargs = firstType(arguments,'object') || {};
        var host = firstType(arguments,'string')
            || kwargs.host || '127.0.0.1';
        var port = firstType(arguments,'number') || kwargs.port;
        
        net.createServer(function (stream) {
            sock = stream;
            emitCommands(sock);
            sock.addListener('command', handler(f()));
        }).listen(port, host);
    };
    
    function handler(instance) {
        return function (cmd) {
            if (!('methods' in instance)) {
                instance.methods = [];
                for (var method in instance) {
                    instance.methods.push(method);
                }
            }
            
            if ('result' in cmd) {
                handlers[cmd.id](cmd.result);
            }
            else if ('method' in cmd) {
                var obj = instance[cmd.method];
                if (typeof(obj) in 'string number undefined'.split(' ')) {
                    sock.write(JSON.stringify({
                        "id" : cmd.id, "result" : obj,
                    }) + '\n');
                }
                else if (typeof(obj) == 'function') {
                    var res = obj.apply(instance, cmd.arguments);
                    sock.write(JSON.stringify({
                        "id" : cmd.id, "result" : res,
                    }) + '\n');
                }
                else {
                    sock.write(JSON.stringify({
                        "id" : cmd.id, "result" : obj,
                    }) + '\n');
                }
            }
        };
    }
    
    function emitCommands(emitter) {
        var bufferList = new BufferList;
        emitter.addListener('data', function (buf) {
            bufferList.push(buf);
            var n = buf.toString().indexOf('\n');
            if (n >= 0) {
                var i = bufferList.length - (buf.length - n);
                var line = bufferList.take(i); // up to the \n
                bufferList.advance(i + 1); // past the \n
                emitter.emit('command', JSON.parse(line));
            }
        });
    }
};

