#!/usr/bin/env node
var express = require('express');
var server = express.createServer();

server.use(express.staticProvider(__dirname));

server.use(require('browserify')({
    require : [ 'dnode-client' ]
}));

var dnode = require('dnode');
dnode(function (client) {
    this.cat = function (cb) {
        cb('meow');
    };
}).listen(server);

server.listen(6857);
console.log('http://localhost:6857/');
