// dnode connection module for SocketIO streams
var EventEmitter = require('events').EventEmitter;
var Conn = require('dnode/conn');

module.exports = SocketIOConn;
SocketIOConn.prototype = new EventEmitter;
function SocketIOConn (params) {
    var sock = params.socketIO;
    var self = this;
    
    var streams = {};
    StreamIO.prototype = new EventEmitter;
    function StreamIO (client) {
        this.write = function (msg) {
            client.send(msg);
        };
        
        // Not sure how .end should work yet:
        this.end = function () {};
    }
    
    sock.on('clientConnect', function (client) {
        self.emit('connect');
        var id = client.sessionId;
        streams[id] = new StreamIO(client);
        var conn = new Conn({
            wrapper : params.wrapper,
            stream : streams[id],
            clients : params.clients,
        });
        
        ['ready','remote','methods'].forEach(function (ev) {
            var args = [].slice.call(arguments,1)
            args.unshift(ev);
            conn.on(ev, function () {
                self.emit.call(self,args);
            });
        });
        streams[id].emit('connect');
    });
    
    sock.on('clientMessage', function (msg,client) {
        streams[client.sessionId].emit('data', msg);
    });
    
    sock.on('clientDisconnect', function (client) {
        streams[client.sessionId].emit('disconnect');
    });
}

