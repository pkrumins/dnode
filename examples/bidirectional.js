#!/usr/bin/env node
var DNode = require('dnode');

// server-side:
var server = DNode(function (client) {
    // Multiply the client's x times the supplied n.
    // The result goes into the supplied callback cb.
    this.xTimesN = function (n,cb) {
        cb(client.x * n);
    }; 
}).listen(6060);

// client-side:
DNode({ x : 20 }).connect(6060, function (remote) {
    remote.xTimesN(3, function (result) {
        console.log(result); // prints 60
        server.end(); // kills the server
    });
});
