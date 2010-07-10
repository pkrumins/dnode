#!/usr/bin/env node
// NOTE: Symlink socket.io.js into web/ first

var DNode = require('dnode').DNode;
var sys = require('sys');
var fs = require('fs');
var http = require('http');

var html = fs.readFileSync(__dirname + '/web.html');
var js = ['socket.io.js','traverse.js','scrubber.js','dnode.js']
    .reduce(function (acc,file) {
        return acc + fs.readFileSync(__dirname + '/../web/' + file);
    }, '');

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

// listen on 6060 and socket.io
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
}).listen({
    protocol : 'socket.io',
    server : httpServer,
    transports : 'websocket xhr-multipart xhr-polling htmlfile'.split(/\s+/),
});

