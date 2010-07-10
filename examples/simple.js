#!/usr/bin/env node
var DNode = require('dnode').DNode;
var sys = require('sys');

// server-side:
var server = DNode({
    timesTen : function (n,f) { f(n * 10) },
    moo : function (f) { f(100) },
    sTimesTen : DNode.sync(function (n) { return n * 10 }),
}).listen(6060);

// client-side:
DNode.connect(6060, function (remote) {
    // note: this == remote
    remote.moo(function (x) {
        sys.log(x);
    });
    remote.sTimesTen(5, function (m) {
        sys.puts(m); // 50, computation executed on the server
        remote.timesTen(m, function (n) {
            sys.puts(n); // 50 * 10 == 500
        });
    });
});
