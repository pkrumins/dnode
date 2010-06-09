var net = require('net');
var BufferList = require('bufferlist').BufferList;
var sys = require('sys');

exports.DNode = DNode;
function DNode (wrapper) {
    if (!(this instanceof DNode)) return new DNode(wrapper);
    
    // share an object or a function that returns an object
    var f = wrapper instanceof Function
        ? wrapper
        : function () { return wrapper }
    ;
    
    var handlers = {}; // id => function
    var sock;
    var sendID = 0;
    
    this.send = function (req) {
        handlers[sendID] = req.callback;
        sock.write(JSON.stringify({
            id : sendID,
            method : req.method,
            arguments : req.arguments,
        }));
        sendID ++;
    };
    
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
        
        sock = net.createConnection(port, host);
        emitCommands(sock);
        sock.addListener('command', handler(f()));
        
        this.send({
            method : 'methods',
            arguments : [],
            callback : function (methods) {
                var obj = {};
                for (var methods in methods) {
                    obj[method] = function () {
                    };
                }
                block.call(this);
            },
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
            sys.log(sys.inspect(cmd));
            
            if ('result' in cmd) {
                handlers[cmd.id](cmd.result);
            }
            else if ('method' in cmd) {
                var obj = instance[cmd.name];
                if (typeof(obj) in 'string number undefined'.split(' ')) {
                    sock.write(JSON.stringify({
                        "id" : cmd.id,
                        "result" : obj,
                    }) + '\n');
                }
                else if (obj instanceof Function) {
                    sock.write(JSON.stringify({
                        "id" : cmd.id,
                        "result" : obj.apply(instance, cmd.arguments),
                    }) + '\n');
                }
                else {
                    sock.write(JSON.stringify({
                        "id" : cmd.id,
                        "result" : obj,
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

