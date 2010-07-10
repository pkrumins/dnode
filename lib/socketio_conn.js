// dnode connection module for SocketIO streams
var EventEmitter = require('events').EventEmitter;

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
        var conn = new DNodeConn({
            wrapper : params.wrapper,
            stream : streams[id],
        });
        conn.addListener('remote', function (remote) {
            self.emit('remote', remote);
        });
        conn.addListener('methods', function (remote) {
            self.emit('methods');
        });
        streams[id].emit('connect');
    });
    
    sock.addListener('clientMessage', function (msg,client) {
        var id = client.sessionId;
        streams[id].emit('data', msg);
    });
}

