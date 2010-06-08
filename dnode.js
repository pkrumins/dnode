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
    
    this.connect = function () {
        var args = [].concat.apply([],arguments);
        var kwargs = args.filter(function (x) {
            return typeof(x) == 'object'
        })[0] || {};
        
        var host = args.filter(function (x) {
            return typeof(x) == 'string'
        })[0] || kwargs.host;
        
        var port = args.filter(function (x) {
            return typeof(x) == 'number'
        })[0] || kwargs.port;
        
    };
    
    this.listen = function () {
        var args = [].concat.apply([],arguments);
        var kwargs = args.filter(function (x) {
            return typeof(x) == 'object'
        })[0] || {};
        
        var host = args.filter(function (x) {
            return typeof(x) == 'string'
        })[0] || kwargs.host;
        
        var port = args.filter(function (x) {
            return typeof(x) == 'number'
        })[0] || kwargs.port;
        
        var bufferList = new BufferList;
        net.createServer(function (sock) {
            var instance = f();
            
            sock.addListener('data', function (buf) {
                bufferList.push(buf);
                var n = buf.toString().indexOf('\n');
                if (n >= 0) {
                    var i = bufferList.length - (buf.length - n);
                    var line = bufferList.take(i); // up to the \n
                    bufferList.advance(i + 1); // past the \n
                    
                    var cmd = JSON.parse(line);
                    var obj = instance[cmd.name];
                    
                    if (typeof(obj) in 'string number undefined'.split(' ')) {
                        sock.write(JSON.stringify({
                            "id" : cmd.id,
                            "result" : obj,
                        }) + '\n');
                    }
                    else if (obj instanceof Function) {
                        var res = obj.apply(instance, cmd.args);
                        sock.write(JSON.stringify({
                            "id" : cmd.id,
                            "result" : res, // todo: wrap references
                        }) + '\n');
                    }
                    else {
                        sock.write(JSON.stringify({
                            "id" : cmd.id,
                            "result" : obj, // todo: wrap references
                        }) + '\n');
                    }
                }
            });
            
        }).listen(port, host);
    };
};

