var net = require('net');
var EventEmitter = require('events').EventEmitter;

var protocol = require('dnode-protocol');
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
    var params = protocol.parseArgs(arguments);
    var stream = params.stream;
    var client = this.proto.create();
    
    if (params.port) {
        stream = net.createConnection(params.port, params.host);
        stream.remoteAddress = params.host || '127.0.0.1';
        stream.remotePort = params.port;
    }
    
    if (params.reconnect) {
        var args = arguments;
        
        stream.on('error', (function (err) {
            if (err.code === 'ECONNREFUSED') {
                this.emit('refused');
                
                setTimeout((function () {
                    this.emit('reconnect');
                    dnode.prototype.connect.apply(this, args);
                }).bind(this), params.reconnect);
            }
            else this.emit('error', err)
        }).bind(this));
        
        this.once('end', (function () {
            if (!params.reconnect) return;
            this.emit('drop');
            
            setTimeout((function () {
                if (!params.reconnect) return;
                this.emit('reconnect');
                dnode.prototype.connect.apply(this, args);
            }).bind(this), params.reconnect);
        }).bind(this));
    }
    else {
        stream.on('error', this.emit.bind(this, 'error'));
    }
    
    stream.on('end', this.emit.bind(this, 'end'));
    
    stream.on('connect', (function () {
        client.start();
        this.emit('connect');
    }).bind(this));
    
    client.end = function () {
        if (params.reconnect) params.reconnect = 0;
        stream.end();
    };
    
    client.destroy = stream.destroy.bind(stream);
    client.stream = stream;
    
    this.stack.forEach(function (middleware) {
        middleware.call(client.instance, client.remote, client);
    });
    
    client.on('request', function (req) {
        stream.write(JSON.stringify(req) + '\n');
    });
    
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
    var params = protocol.parseArgs(arguments);
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
        
        if (params.block) {
            client.on('remote', function () {
                params.block.call(client.instance, client.remote, client);
            });
        }
        
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
    this.emit('end');
};

dnode.prototype.close = function () {
    var servers = this.servers || [];
    var waiting = servers.length;
    servers.forEach((function (server) {
        server.once('close', (function () {
            waiting --;
            if (waiting === 0) this.emit('close');
        }).bind(this));
        server.close();
    }).bind(this));
};
 
dnode.connect = function () {
    var d = dnode();
    return d.connect.apply(d, arguments);
};

dnode.listen = function () {
    var d = dnode();
    return d.listen.apply(d, arguments);
};
