#!/usr/bin/env node
var DNode = require('dnode');
var Hash = require('traverse/hash');

var clients = process.argv[2] || 100;

var times = { start : Date.now() };

for (var i = 0; i < clients; i++) {
    DNode.connect(6060, handler);
}
times.spawned = Date.now();

var finished = 0;
function handler (remote) {
    remote.pow(5, function (x) {
        if (x != 50) console.error('x != 50, x = ' + x);
        
        finished ++;
        if (finished == clients) {
            times.finished = Date.now();
            console.log(clients + ' connections');
            console.dir(Hash.map(times, function (t) {
                return (t - times.start) / 1000;
            }));
        }
    });
}
