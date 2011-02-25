var net = require('net');
var EventEmitter = require('events').EventEmitter;

var protocol = require('dnode-protocol');
var recon = require('recon');
var Lazy = require('lazy');

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
    client.destroy = stream.destroy.bind(stream);
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
        client.stream = stream;
        client.end = stream.end.bind(stream);
        client.destroy = stream.destroy.bind(stream);
        
        stream.on('end', client.emit.bind(client, 'end'));
        
        this.stack.forEach(function (middleware) {
            middleware.call(client.instance, client.remote, client);
        });
        
        client.on('request', function (req) {
            if (stream.writable) {
                stream.write(JSON.stringify(req) + '\n');
            }
            // silently ignore data sent to non-writable streams
        });
        
        Lazy(stream).lines
            .map(String)
            .forEach(client.parse)
        ;
        
        client.start();
    }).bind(this));
    
    server.on('error', this.emit.bind(this, 'error'));
    if (!this.servers) this.servers = [];
    this.servers.push(server);
    
    return this;
};

dnode.prototype.end = function () {
    Object.keys(this.proto.sessions)
        .forEach((function (id) {
            this.proto.sessions[id].stream.end()
        }).bind(this))
    ;
    
    (this.servers || []).forEach((function (server) {
        server.close();
    }).bind(this));
    
    this.emit('end');
};

dnode.prototype.close = dnode.prototype.end;
 
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
            if (arg.__proto__ === Object.prototype) {
                // merge vanilla objects into params
                Object.keys(arg).forEach(function (key) {
                    params[key] = arg[key];
                });
            }
            else if (arg instanceof net.Stream) {
                params.stream = arg;
            }
            else {
                // and non-Stream, non-vanilla objects are probably servers
                params.server = arg;
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
