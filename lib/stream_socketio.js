var EventEmitter = require('events').EventEmitter;

StreamIO.prototype = new EventEmitter;
function StreamIO (client) {
    this.readyState = 'open';
    
    this.write = function (msg) {
        client.send(msg);
    };
    
    this.end = function (msg) {
        this.readyState = 'closed';
        if (msg) this.write(msg);
        this.emit('end');
    };
}

module.exports = function (sock, handler) {
    var streams = {};
console.dir(sock);
    sock.on('clientConnect', function (client) {
        var id = client.sessionId;
        streams[id] = new StreamIO(client);
        handler(streams[id]);
        streams[id].emit('connect');
    });
    
    sock.on('clientMessage', function (msg, client) {
        var id = client.sessionId;
        streams[id].emit('data', msg);
    });
    
    sock.on('clientDisconnect', function (client) {
        var id = client.sessionId;
        streams[id].emit('disconnect');
        streams[id].end();
    });
};

