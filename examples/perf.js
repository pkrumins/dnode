#!/usr/bin/env node
var DNode = require('dnode');
var Hash = require('traverse/hash');
var times = {};

var clients = process.argv[2] || 100;

times.start = Date.now();
var server = DNode({
    pow : function (n, f) { f(n * 10) }
}).listen(6060);

server.on('ready', function () {
    times.ready = Date.now();
    for (var i = 0; i < clients; i++) {
        DNode.connect(6060, handler);
    }
    times.spawned = Date.now();
});

var finished = 0;
function handler (remote) {
    remote.pow(5, function (x) {
        finished ++;
        if (finished == clients) {
            server.end();
            times.finished = Date.now();
            console.log(clients + ' connections');
            console.dir(Hash.map(times, function (t) {
                return (t - times.start) / 1000;
            }));
        }
    });
}
