#!/usr/bin/env node
var DNode = require('dnode').DNode;
var sys = require('sys');
var http = require('http');

DNode({
    timesTen : function (n) { return n * 10 },
}).listen(6060);

var httpServer = http.createServer(function (req,res) {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>meow</h1>');
});
httpServer.listen(6061);

DNode.SocketIO({
    transports : 'websocket htmlfile xhr-multipart xhr-polling'.split(/\s+/),
}).proxy({
    server : httpServer,
    nodes : {
        times : 'localhost:6060'
    },
});

