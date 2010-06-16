#!/usr/bin/env node
var DNode = require('dnode').DNode;
var sys = require('sys');

// server-side:
var server = DNode({
    timesTen : function (n) { return n * 10 },
    aTimesTen : DNode.async(function (n,f) { f(n * 10) }),
    moo : DNode.async(function (f) { f(100) }),
}).listen(6060);

// client-side:
DNode.connect(6060, function (dnode, remote) {
    // note: this == remote
    this.moo(function (x) {
        sys.log(x);
    });
    this.timesTen(5, function (m) {
        sys.puts(m); // 50, computation executed on the server
        this.aTimesTen(m, function (n) {
            sys.puts(n); // 50 * 10 == 500
        });
    });
});
