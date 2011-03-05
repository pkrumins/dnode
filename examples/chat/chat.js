// simple DNode chat server

var EventEmitter = require('events').EventEmitter;
var emitter = new EventEmitter;

var clients = {};
function ChatServer (client, con) {
    var evNames = [ 'joined', 'said', 'parted' ];
    
    con.on('ready', function () {
        evNames.forEach(function (name) {
            emitter.on(name, client[name]);
        });
        emitter.emit('joined', client.name);
        
        clients[client.name] = client;
    });
    
    con.on('end', function () {
        evNames.forEach(function (name) {
            emitter.removeListener(name, client[name]);
        });
        emitter.emit('parted', client.name);
        delete clients[client.name];
    });
    
    this.say = function (msg) {
        emitter.emit('said', client.name, msg);
    };
    
    this.names = function (cb) {
        cb(Object.keys(clients))
    };
}

var connect = require('connect');
var server = connect.createServer()
    .use(connect.static(__dirname));

var DNode = require('dnode');
DNode(ChatServer).listen(server, {
    transports : 'websocket xhr-multipart xhr-polling htmlfile'.split(' '),
});

server.listen(6061);

console.log('http://localhost:6061/');
