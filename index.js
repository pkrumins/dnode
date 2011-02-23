var net = require('net');
var EventEmitter = require('events').EventEmitter;

var protocol = require('dnode-protocol');
var recon = require('recon');
var Lazy = require('lazy');

var http = require('http');
var io = require('socket.io');
var StreamSocketIO = require('./lib/stream_socketio');

exports = module.exports = dnode;

function dnode (wrapper) {
    if (!(this instanceof dnode)) return new dnode(wrapper);
    
    this.proto = protocol(wrapper);
    this.stack = [];
    return this;
}

dnode.prototype = new EventEmitter;

dnode.prototype.use = function (middleware) {
    this.stack.push(middleware);
    return this;
};

dnode.prototype.connect = function () {
    var params = parseArgs(arguments);
    var stream = params.stream;
    
    if (params.port) {
        if (params.reconnect) {
            stream = recon(params);
        }
        else if (params.port) {
            stream = net.createConnection(params.port, params.host);
            stream.remoteAddress = params.host || '127.0.0.1';
            stream.remotePort = params.port;
        }
    }
    
    stream.on('error', this.emit.bind(this, 'error'));
    stream.on('end', this.emit.bind(this, 'end'));
    stream.on('connect', (function () {
        client.start();
        this.emit('connect');
    }).bind(this));
    
    var client = this.proto.create();
    client.end = stream.end.bind(stream);
    client.stream = stream;
    
    this.stack.forEach(function (middleware) {
        middleware.call(client.instance, client.remote, client);
    });
    
    client.on('request', function (req) {
        stream.write(JSON.stringify(req) + '\n');
    });
    
    stream.on('ready', this.emit.bind(this, 'ready'));
    stream.on('remote', this.emit.bind(this, 'remote'));
    
    if (params.block) {
        client.on('remote', function () {
            params.block.call(client.instance, client.remote, client);
        });
    }
    
    Lazy(stream).lines
        .map(String)
        .forEach(client.parse)
    ;
    
    return this;
};

dnode.prototype.listen = function () {
    var params = parseArgs(arguments);
    var server = params.server;
    
    if (params.port) {
        server = net.createServer();
        server.listen(
            params.port, params.host,
            this.emit.bind(this, 'ready')
        );
    }
    
    if (!server) {
        this.emit('error', new Error('Not sure how to fire up this listener'));
    }
    
    var clients = {};
    server.on('connection', (function (stream) {
        var client = this.proto.create();
        clients[client.id] = client;
        
        client.end = stream.end.bind(stream);
        stream.on('end', client.emit.bind(client, 'end'));
        
        client.on('request', function (req) {
            stream.write(JSON.stringify(req) + '\n');
        });
        
        Lazy(stream).lines
            .map(String)
            .forEach(client.parse)
        ;
        
        client.start();
    }).bind(this));
    
    server.on('error', this.emit.bind(this, 'error'));
    
    this.end = function () {
        Object.keys(clients)
            .forEach(function (id) {
                clients[id].end()
            })
        ;
        server.close();
        this.emit('end');
    };
    
    this.close = this.end;
    
    return this;
};

dnode.connect = function () {
    var d = dnode();
    return d.connect.apply(d, arguments);
};

dnode.listen = function () {
    var d = dnode();
    return d.listen.apply(d, arguments);
};

function parseArgs (argv) {
    var params = {};
    
    [].slice.call(argv).forEach(function (arg) {
        if (typeof arg === 'string') {
            if (arg.match(/^\d+$/)) {
                params.port = arg;
            }
            else {
                params.host = arg;
            }
        }
        else if (typeof arg === 'number') {
            params.port = arg;
        }
        else if (typeof arg === 'function') {
            params.block = arg;
        }
        else if (typeof arg === 'object') {
            var serverTypes = [ http.Server, io.Listener, net.Server ];
            if (serverTypes.some(function (t) { return arg instanceof t })) {
                params.server = arg;
            }
            else if (arg instanceof net.Stream) {
                params.stream = arg;
            }
            else {
                Object.keys(arg).forEach(function (key) {
                    params[key] = arg;
                });
            }
        }
        else if (typeof arg === 'undefined') {
            // ignore
        }
        else {
            throw new Error('Not sure what to do about '
                + typeof arg + ' objects');
        }
    });
    
    return params;
}
