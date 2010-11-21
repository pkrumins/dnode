#!/usr/bin/env node

var crypto = require('crypto');
var fs = require('fs');

try {
    var cert = crypto.createCredentials({
        key : fs.readFileSync(__dirname + '/privatekey.pem', 'ascii'),
        cert : fs.readFileSync(__dirname + '/certificate.pem', 'ascii'),
    });
}
catch (e) {
    console.log('# {privatekey,certificate}.pem missing, do this first:');
    console.log('openssl genrsa -out privatekey.pem 1024');
    console.log('openssl req -new -key privatekey.pem -out certrequest.csr');
    console.log('openssl x509 -req -in certrequest.csr '
        + '-signkey privatekey.pem -out certificate.pem');
    process.exit();
}

var connect = require('connect');
var https = connect.createServer();
https.use(connect.staticProvider(__dirname + '/static'));
https.setSecure(cert);
https.listen(8020);

var DNode = require('dnode');
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
}).listen(https, { secure : true });

console.log('https://localhost:8020/');
