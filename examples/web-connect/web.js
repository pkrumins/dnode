#!/usr/bin/env node
var connect = require('connect');

var server = connect.createServer(
    connect.staticProvider(__dirname)
);

var DNode = require('dnode');
DNode(function (client) {
    this.cat = function (cb) {
        cb('meow');
    };
}).listen(server);

server.listen(6857);
console.log('http://localhost:6857/');
