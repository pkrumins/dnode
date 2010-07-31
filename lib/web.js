var fs = require('fs');

// Cat together all the web files together to make deployment easier.
// This should probably only be called once at initialization since it does
// synchronous reads.
exports.source = function () {
    return [
        '/vendor/web/Socket.IO/socket.io.js',
        '/web/traverse.js','/web/scrubber.js','/web/dnode.js'
    ].map(function (file) {
        return fs.readFileSync(__dirname + file);
    }).join('\n');
};
