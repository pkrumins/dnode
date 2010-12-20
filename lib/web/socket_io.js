// hackish way to get the socket.io.js browser source
var io = require('socket.io');
var self = { _clientFiles : {} };
var file = 'socket.io.js';
var req =  {
    method : 'GET',
    url : '/socket.io/' + file,
    headers : {}
};

var src = null;
var queue = [];
var res = {
    writeHead : function () {},
    end : function (buf) {
        src = buf
        queue.forEach(function (cb) { cb(buf) });
        queue = [];
    },
};
io.Listener.prototype._serveClient.call(self, file, req, res);

module.exports = function (cb) {
    if (src) cb(src);
    else queue.push(cb);
};
