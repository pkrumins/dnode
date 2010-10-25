#!/usr/bin/env node
var DNode = require('../lib/dnode');
var sys = require('sys');

// server-side:
var server = DNode({
    timesTen : function (n,reply) { reply(n * 10) },
    moo : function (reply) { reply(100) },
    sTimesTen : DNode.sync(function (n) { return n * 10 }),
}).listen(6060);


// client-side:
server.on('ready', function () {
    // The server might not be ready yet since client and server are in the same
    // file for this example.
    DNode.connect(6060, function (remote) {
        remote.moo(function (x) {
            sys.log(x);
        });
        remote.sTimesTen(5, function (m) {
            sys.puts(m); // 50, computation executed on the server
            remote.timesTen(m, function (n) {
                sys.puts(n); // 50 * 10 == 500
                server.end(); // shut the server down after the client is done
            });
        });
    });
});
