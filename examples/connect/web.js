#!/usr/bin/env node
var DNode = require('dnode');
var connect = require('connect');
var http = require('http');

var js = require('dnode/web').source();

var server = connect.createServer(
    connect.staticProvider(__dirname),
    function (req, res) {
        if (req.url == '/dnode.js') {
            res.writeHead({ 'Content-Type' : 'text/javascript' });
            res.end(js);
        }
    }
).listen(4050);
console.log('http://localhost:4050/');

DNode(Server).listen(server, {
    transports : 'websocket xhr-multipart xhr-polling htmlfile'.split(/\s+/)
});

function Server (client) {
    this.cat = function (cb) {
        cb('meow');
    };
}

