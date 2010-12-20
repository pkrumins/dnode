#!/usr/bin/env node
var express = require('express');

var server = express.createServer(
    express.staticProvider(__dirname)
);
server.listen(6857);
console.log('http://localhost:6857/');

var DNode = require('dnode');
DNode(function (client) {
    this.cat = function (cb) {
        cb('meow');
    };
}).listen(server);
