var EventEmitter = require('events').EventEmitter;
var io = require('socket.io');

module.exports = function (webserver) {
    var sock = io.listen(webserver);
    var server = new EventEmitter;
    
    sock.on('connection', function (client) {
        var stream = new EventEmitter;
        stream.client = client;
        stream.readable = true;
        stream.writable = true;
        
        stream.write = client.send.bind(client);
        stream.end = client.connection.end.bind(client);
        stream.destroy = client.connection.destroy.bind(client);
        
        client.on('message', stream.emit.bind(stream, 'data'));
        client.on('error', stream.emit.bind(stream, 'error'));
        
        client.on('disconnect', function () {
            stream.writable = false;
            stream.readable = false;
            stream.emit('end');
        });
        
        server.emit('connection', stream);
    });
    
    return server;
};
