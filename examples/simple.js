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
DNode.connect(6060, function (remote) {
    // note: this == remote
    remote.moo(function (x) {
        sys.log(x);
    });
    remote.timesTen(5, function (m) {
        sys.puts(m); // 50, computation executed on the server
        remote.aTimesTen(m, function (n) {
            sys.puts(n); // 50 * 10 == 500
        });
    });
});
