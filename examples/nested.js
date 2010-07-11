#!/usr/bin/env node
var DNode = require('dnode').DNode;
var sys = require('sys');

// server-side:
var server1 = DNode({
    timesTen : function (n,reply) { reply(n * 10) }
}).listen(6060);

var server2 = DNode({
    timesTwenty : function (n,reply) { reply(n * 20) }
}).listen(6061);

// client-side:
DNode.connect(6060, function (remote1) {
    DNode.connect(6061, function (remote2) {
        remote2.timesTwenty(2, function (n) {
            sys.puts(n); // 40
        });
        remote1.timesTen(5, function (n) {
            sys.puts(n); // 50
        });
    });
});

