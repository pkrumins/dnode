#!/usr/bin/env node
var DNode = require('dnode').DNode;
var sys = require('sys');

// server-side:
DNode(function (client) {
    this.timesX = DNode.async(function (n,f) {
        client.x(function (x) {
            f(n * x);
        });
    }); 
}).listen(6060);

// client-side:
DNode({
    x : function () { return 20 }
}).connect(6060, function (remote) {
    remote.timesX(3, function (res) {
        sys.puts(res); // 20 * 3 == 60
    });
});
