#!/usr/bin/env node
var DNode = require('dnode').DNode;
var sys = require('sys');
var fs = require('fs');
var http = require('http');

var html = fs.readFileSync(__dirname + '/web.html');
var js = {
    'dnode-client.js' : fs.readFileSync(__dirname + '/../dnode-client.js'),
    // Symlink socket.io.js to examples/ first
    'socket.io.js' : fs.readFileSync(__dirname + '/socket.io.js'),
};

var httpServer = http.createServer(function (req,res) {
    var m = req.url.match(/^\/js\/(.+)/);
    if (m) {
        res.writeHead(200, { 'Content-Type' : 'text/javascript' });
        res.end(js[m[1]]);
    }
    else {
        res.writeHead(200, { 'Content-Type' : 'text/html' });
        res.end(html);
    }
});
httpServer.listen(6061);

// listen on 6060 and socket.io
DNode(function (client) {
    this.timesTen = function (n) { return n * 10 };
    this.whoAmI = DNode.async(function (f) {
        client.name(function (name) {
            f(name
                .replace(/Mr\.?/,'Mister')
                .replace(/Ms\.?/,'Miss')
                .replace(/Mrs\.?/,'Misses')
            );
        })
    });
}).listen({
    protocol : 'socket.io',
    server : httpServer,
    transports : 'websocket xhr-multipart xhr-polling htmlfile'.split(/\s+/),
});

