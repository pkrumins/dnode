#!/usr/bin/env node
var DNode = require('dnode').DNode;
var sys = require('sys');

// server-side:
var server = DNode({
    timesTen : function (n) { return n * 10 },
}).listen(6060);

// client-side:
DNode().connect(6060, function (dnode) {
    this.timesTen(5, function (res) {
        sys.puts(res); // 50, computation executed on the server
        this.timesTen(res, function (n) {
            sys.puts(n);
        });
    });
});
