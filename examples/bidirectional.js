#!/usr/bin/env node
var DNode = require('dnode');

// server:
var server = DNode(function (client) {
    // Poll the client's own temperature() in celsius and convert that value to
    // fahrenheit in the supplied callback
    this.clientTempF = function (cb) {
        client.temperature(function (degC) {
            var degF = Math.round(degC * 9 / 5 + 32);
            cb(degF);
        });
    }; 
}).listen(6060);

// client:
server.on('ready', function () {
    // The ready event is only necessary to avoid an initialization race
    // condition since the server might not be ready by the time the client
    // connects.
    DNode({
        // Compute the client's temperature and stuff that value into the callback
        temperature : function (cb) {
            var degC = Math.round(20 + Math.random() * 10 - 5);
            console.log(degC + '° C');
            cb(degC);
        }
    }).connect(6060, function (remote) {
        // Call the server's conversion routine, which polls the client's
        // temperature in celsius degrees and converts to fahrenheit
        remote.clientTempF(function (degF) {
            console.log(degF + '° F');
            server.end(); // kills the server
        });
    });
});
