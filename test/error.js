var dnode = require('dnode');
var sys = require('sys');
var assert = require('assert');

exports.errors = function () {
    var port = Math.floor(Math.random() * 40000 + 10000);
    var errors = { server : [], client : [] };
    
    var server = dnode(function (remote, conn) {
        conn.on('error', function (err) {
            errors.server.push(err);
        });
        
        this.one = function () {
            throw 'string throw'
        };
        
        this.two = function () {
            undefined.name
        };
        
        this.three = function () {
            remote.pow();
        };
    }).listen(port);
    
    var ts = setTimeout(function () {
        assert.fail('server never ended');
    }, 5000);
    
    server.on('end', function () {
        clearTimeout(ts);
        assert.eql(errors.server[0], 'string throw');
        
        try { undefined.name }
        catch (refErr) {
            assert.eql(refErr.message, errors.server[1].message);
            assert.eql(refErr.type, errors.server[1].type);
        }
        
        assert.equal(errors.server.length, 2);
        
        assert.eql(errors.client, [ 'Local error' ]);
    });
    
    server.on('ready', function () {
        var client = dnode(function (client, conn) {
            conn.on('error', function (err) {
                errors.client.push(err);
            });
            
            this.pow = function () {
                throw 'Local error';
            };
        }).connect(port, function (remote, conn) {
            remote.one();
            remote.two();
            remote.three();
            setTimeout(function () {
                conn.end();
                server.end();
                server.close();
            }, 100);
        });
    });
};
