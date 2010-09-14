var fs = require('fs');
var path = require('path');

// Cat together all the web files together to make deployment easier.
// This should probably only be called once at initialization since it does
// synchronous reads.
exports.source = function () {
    var sioDir = __dirname + '/vendor/web/Socket.IO';
    if (!path.existsSync(sioDir + '/socket.io.js')) {
        console.error(
            'socket.io.js not found in ' + sioDir + '!\n'
            + '    To install it, in your dnode project root, do:\n'
            + '        git submodule update --init\n'
            + '    or\n'
            + '        git clone http://github.com/LearnBoost/Socket.IO.git '
                + ' lib/vendor/web/Socket.IO\n'
        );
        throw 'socket.io.js not found in ' + sioDir;
    }
    
    var files = [ 'compat.js', 'events.js', 'dnode.js', '../scrubber.js' ]
        .map(function (file) {
            return fs.readFileSync(__dirname + '/web/' + file)
                .toString()
                .replace(/^module\..*/mg, '')
                .replace(/^var \S+\s*=\s*require\(.*\);/mg, '')
        })
    ;
    
    var traverse = require('traverse/web').source();
    
    var socketIO = fs.readFileSync(
        __dirname + '/vendor/web/Socket.IO/socket.io.js'
    ).toString();
    
    return [socketIO,traverse].concat(files).join('\n');
};

exports.route = function (path) {
    var source = exports.source();
    return function (req, res) {
        if (path === undefined || req.url == path) {
            res.writeHead(200, { 'Content-Type' : 'text/javascript' });
            res.end(source);
        }
    };
};
