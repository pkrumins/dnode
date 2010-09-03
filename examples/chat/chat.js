#!/usr/bin/env node
// Simple DNode chat server example.
// Just as simple as plain socket.io since it's a simple problem.

var DNode = require('dnode');
var fs = require('fs');
var http = require('http');
var EventEmitter = require('events').EventEmitter;

// load the files to serve up into memory
var html = fs.readFileSync(__dirname + '/chat.html');
var css = fs.readFileSync(__dirname + '/chat.css');
var js = require('dnode/web').source();

// simple http server to serve pages and for socket.io transport
var httpServer = http.createServer(function (req,res) {
    if (req.url == '/dnode.js') {
        res.writeHead(200, { 'Content-Type' : 'text/javascript' });
        res.end(js);
    }
    else if (req.url == '/chat.css') {
        res.writeHead(200, { 'Content-Type' : 'text/css' });
        res.end(css);
    }
    else {
        res.writeHead(200, { 'Content-Type' : 'text/html' });
        res.end(html);
    }
});
httpServer.listen(6061);
console.log('http://localhost:6061/');

// share the chat server routines with remote clients
var emitter = new EventEmitter;
var names = {};
function ChatServer (client, con) {
    con.addListener('ready', function () {
        emitter.on('joined', client.joined);
        emitter.on('said', client.said);
        emitter.on('parted', client.parted);
        emitter.emit('joined', client.name);
        names[client.name] = 1;
    });
    
    con.addListener('end', function () {
        emitter.emit('parted', client.name);
        delete names[client.name];
    });
    
    this.say = function (msg) {
        emitter.emit('said', client.name, msg);
    };
    
    this.names = function (f) {
        f(Object.keys(names))
    };
}

DNode(ChatServer).listen({
    server : httpServer,
    transports : 'websocket xhr-multipart xhr-polling htmlfile'
        .split(/\s+/),
});
