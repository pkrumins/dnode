var EventEmitter = require('events').EventEmitter;
var io = require('socket.io');
var browserify = require('browserify');

var dnodeSrc = 'var DNode = (function () {'
    + browserify.bundle(__dirname + '/..')
    + '; return require("dnode") })()'
;

module.exports = function (webserver, mount) {
    var sock = io.listen(webserver);
    var server = new EventEmitter;
    
    if (mount && webserver.use) {
        webserver.use(function (req, res, next) {
            if (req.url === mount) {
                res.writeHead(200, { 'Content-Type' : 'text/javascript' });
                res.end(dnodeSrc);
            }
            else next()
        });
    }
    else if (mount) {
        if (!webserver._events) webserver._events = {};
        var ev = webserver._events;
        
        if (!ev.request) ev.request = [];
        if (!Array.isArray(ev.request)) ev.request = [ ev.request ];
        
        ev.request.unshift(function (req, res) {
            if (req.url === mount) {
                res.writeHead(200, { 'Content-Type' : 'text/javascript' });
                res.end(dnodeSrc);
            }
        });
    }
    
    sock.on('connection', function (client) {
        var stream = new EventEmitter;
        stream.client = stream.socketio = client;
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
