#!/usr/bin/env node
var DNode = require('dnode');
var sys = require('sys');
var fs = require('fs');
var http = require('http');

// load the html page and the client-side javascript into memory
var html = fs.readFileSync(__dirname + '/saturate.html');
var js = require('dnode/web').source();

// simple http server to serve pages and for socket.io transport
var httpServer = http.createServer(function (req,res) {
    if (req.url == '/dnode.js') {
        res.writeHead(200, { 'Content-Type' : 'text/javascript' });
        res.end(js);
    }
    else {
        res.writeHead(200, { 'Content-Type' : 'text/html' });
        res.end(html);
    }
});
httpServer.listen(6061);
console.log('http://localhost:6061/');

var RemoteEmitter = require('dnode/events');
var em = new RemoteEmitter;

DNode(function (client, conn) {
    this.emitter = em.attach(conn)
    
    conn.on('end', function () {
        console.log(conn.id + ' disconnected!');
    });
}).listen(httpServer, {
    transports : 'websocket xhr-multipart xhr-polling htmlfile'.split(/\s+/)
});

setInterval(function () {
    var n = Math.floor(Math.random() * 5e4);
    var buf = new Buffer(n);
    em.emit('data', buf.toString());
}, 50);
