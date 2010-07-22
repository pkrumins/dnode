#!/usr/bin/env node
// Note: doesn't seem to work

var DNode = require('dnode');
var sys = require('sys');
var fs = require('fs');
var http = require('http');

var crypto = require('crypto');
try {
    var privateKey = fs.readFileSync('./privatekey.pem').toString();
    var certificate = fs.readFileSync('./certificate.pem').toString();
}
catch (e) {
    sys.puts('# {privatekey,certificate}.pem missing, do this first:');
    sys.puts('openssl genrsa -out privatekey.pem 1024');
    sys.puts('openssl req -new -key privatekey.pem -out certrequest.csr');
    sys.puts('openssl x509 -req -in certrequest.csr '
        + '-signkey privatekey.pem -out certificate.pem');
    process.exit();
}

var cert = crypto.createCredentials({
    key : privateKey,
    cert : certificate,
});

// load the html page and the client-side javascript into memory
var html = fs.readFileSync(__dirname + '/https.html');
var js = require('dnode/web').source();

// https server to serve pages and for socket.io transport
var httpsServer = http.createServer(function (req,res) {
    if (req.url == '/dnode.js') {
        res.writeHead(200, { 'Content-Type' : 'text/javascript' });
        res.end(js);
    }
    else {
        res.writeHead(200, { 'Content-Type' : 'text/html' });
        res.end(html);
    }
});
httpsServer.setSecure(cert);
httpsServer.listen(8020);

// share an object with DNode over socket.io on top of the http server
DNode(function (client) {
    this.timesTen = function (n,f) { f(n * 10) };
    this.whoAmI = function (reply) {
        client.name(function (name) {
            reply(name
                .replace(/Mr\.?/,'Mister')
                .replace(/Ms\.?/,'Miss')
                .replace(/Mrs\.?/,'Misses')
            );
        })
    };
}).listen({
    protocol : 'socket.io',
    server : httpsServer,
    transports : 'websocket xhr-multipart xhr-polling htmlfile'.split(/\s+/),
});

sys.puts('https://localhost:8020/');
