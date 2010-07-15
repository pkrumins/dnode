// dnode connection module for SocketIO streams
var EventEmitter = require('events').EventEmitter;
var Conn = require('dnode/conn').Conn;

exports.SocketIOConn = SocketIOConn;
SocketIOConn.prototype = new EventEmitter;
function SocketIOConn (params) {
    var sock = params.socketIO;
    var self = this;
    
    var streams = {};
    StreamIO.prototype = new EventEmitter;
    function StreamIO (client) {
        this.write = function (msg) {
            client.send(msg);
        }
    }
    
    sock.addListener('clientConnect', function (client) {
        var id = client.sessionId;
        streams[id] = new StreamIO(client);
        var conn = new Conn({
            wrapper : params.wrapper,
            stream : streams[id],
            clients : params.clients,
        });

        ['connect','ready','remote','methods'].forEach(function (ev) {
            var args = [].slice.call(arguments,1)
            args.unshift(ev);
            conn.addListener(ev, function () {
                self.emit.call(self,args);
            });
        });
        streams[id].emit('connect');
    });
    
    sock.addListener('clientMessage', function (msg,client) {
        var id = client.sessionId;
        streams[id].emit('data', msg);
    });
}

