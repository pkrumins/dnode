#!/usr/bin/env node
// Simple DNode chat server example.
// Just as simple as plain socket.io since it's a simple problem.

var DNode = require('dnode').DNode;
var sys = require('sys');
var fs = require('fs');
var http = require('http');

// load the html page and the client-side javascript into memory
var html = fs.readFileSync(__dirname + '/chat.html');
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

// share the chat server routines with remote clients
var clients = [];
DNode(function (client) {
    clients.push(client);
    this.chat = function (who,msg) {
        clients.forEach(function (c) { c.send(who,msg) });
    };
}).listen({
    protocol : 'socket.io',
    server : httpServer,
    transports : 'websocket xhr-multipart xhr-polling htmlfile'.split(/\s+/),
});

