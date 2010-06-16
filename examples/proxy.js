#!/usr/bin/env node
var DNode = require('dnode').DNode;
var sys = require('sys');
var fs = require('fs');
var http = require('http');

DNode({
    timesTen : function (n) { return n * 10 },
}).listen(6060);

var html = fs.readFileSync(__dirname + '/proxy.html');
var js = {};
try {
    js['socket.io.js'] = fs.readFileSync(__dirname + '/socket.io.js');
}
catch (err) {
    sys.puts(
        'Symlink socket.io.js from Socket.IO into "'
        + __dirname + '" to run this example'
    );
    process.exit();
}
js['dnode-client.js'] = fs.readFileSync(__dirname + '/../dnode-client.js');

var httpServer = http.createServer(function (req,res) {
    var m = req.url.match(/^\/js\/(.+)/);
    if (m) {
        res.writeHead(200, { 'Content-Type': 'text/javascript' });
        res.end(js[m[1]]);
    }
    else {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
    }
});
httpServer.listen(6061);

DNode.SocketIO({
    // no flashsocket in here on account of the annoying port 831 non-root issue
    transports : 'websocket xhr-multipart xhr-polling htmlfile'.split(/\s+/),
}).proxy({
    server : httpServer,
    nodes : {
        times : 'localhost:6060'
    },
});

