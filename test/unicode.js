var DNode = require('dnode');

exports.simple = function (assert) {
    var port = Math.floor(Math.random() * 40000 + 10000);
    
    var server = DNode({
        unicodes : function (reply) {
            reply('☔☔☔☁☼☁❄');
        }
    }).listen(port);
    
    server.on('ready', function () {
        DNode.connect(port, function (remote, conn) {
            assert.equal(conn.stream.remoteAddress, '127.0.0.1');
            remote.unicodes(function (str) {
                assert.equal(str, '☔☔☔☁☼☁❄', 'remote unicodes == ☔☔☔☁☼☁❄');
            });
            server.end();
        });
    });
};
