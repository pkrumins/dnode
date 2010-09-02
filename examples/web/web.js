#!/usr/bin/env node
var DNode = require('dnode');
var sys = require('sys');
var fs = require('fs');
var http = require('http');

// load the html page and the client-side javascript into memory
var html = fs.readFileSync(__dirname + '/web.html');
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

// share an object with DNode over socket.io on top of the http server
DNode(function (client) {
    this.timesTen = function (n,f) { f(n * 10) };
    this.whoAmI = function (reply) {
        client.name(function (name) {
            reply(name
                .replace(/Mr\.?/,'Mister')
                .replace(/Ms\.?/,'Miss')
                .replace(/Mrs\.?/,'Misses')
            );
        })
    };
}).listen(httpServer, {
    transports : 'websocket xhr-multipart xhr-polling htmlfile'.split(/\s+/),
});

