var DNode = require('dnode');
var EventEmitter = require('events').EventEmitter;

exports.ping = function (assert) {
    var port = Math.floor(Math.random() * 40000 + 10000);
    
    var server = DNode({
        busy : function () { for (var i = 0; i < 1e8; i++); }
    }).listen(port);
    
    var pings = [];
    
    server.on('ready', function () {
        DNode.connect(
            port, { ping : 200, timeout : 50 },
            function (remote, conn) {
                setTimeout(function () {
                    remote.busy();
                }, 550);
                
                conn.on('ping', function (elapsed) {
                    pings.push(elapsed);
                    if (pings.length == 5) server.end();
                });
                
                conn.on('timeout', function () {
                    console.log('timeout!');
                });
            }
        );
    });
};

