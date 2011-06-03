var assert = require('assert');
var dnode = require('dnode');
var http = require('http');

exports.checkCookie = function () {
    var port = Math.floor(10000 + (Math.random() * Math.pow(2,16) - 10000));
    
    var web = http.createServer(function (req, res) {
        res.setHeader('set-cookie', [ 'foo=bar' ]);
        
        if (req.url === '/') {
            res.setStatus(200);
            res.setHeader('content-type', 'text/html');
            res.end('pow');
        }
    });
    var server = dnode().listen(web, { io : { log : null } });
    
    web.listen(port, function () {
        var req = {
            host : 'localhost',
            port : port,
            path : '/dnode.js',
        };
        http.get(req, function (res) {
            assert.equal(res.headers['set-cookie'], 'foo=bar');
            assert.equal(res.headers['content-type'], 'text/javascript');
            
            web.close();
            server.end();
        });
    });
};
