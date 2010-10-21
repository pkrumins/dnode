// client:
var DNode = require('dnode');
var sys = require('sys');

DNode.connect(6060, function (remote) {
    remote.timesTen(5, function (result) {
        sys.puts(result); // 5 * 10 == 50
    });
    remote.timesTen(500, function (result) {
        sys.puts(result); // 5 * 10 == 50
    });
});
