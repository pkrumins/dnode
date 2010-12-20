// this file is super kludge
var fs = require('fs');
var path = require('path');

var traverse = require('traverse/web').source();
var files = [ 'compat.js', 'events.js', 'dnode.js',
    '../scrubber.js', '../events.js' ]
    .map(function (file) {
        return fs.readFileSync(__dirname + '/web/' + file)
            .toString()
            .replace(/^module\..*/mg, '')
            .replace(/^var \S+\s*=\s*require\(.*\)[^;\n]*/mg, '')
    })
;

var socketIO = require('./web/socket_io');
socketIO(function () {}); // cache it

exports.route = function (p) {
    return function (req, res, next) {
        if (p === undefined || req.url === p) {
            res.writeHead(200, { 'Content-Type' : 'text/javascript' });
            socketIO(function (buf) {
                res.write(buf);
                res.write(traverse);
                files.forEach(function (src) { res.write(src) });
                res.end();
            });
        }
        else if (next) next();
    };
};

// Cat together all the web files together to make deployment easier.
exports.source = function () {
    console.error(
        "require('dnode/web').source() is deprecated."
        + "Use require('dnode/web').route() instead if you must,"
        + "or preferably just use connect or express and you get a"
        + "/dnode.js route for free."
    );
    
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
    
    var socketIO = fs.readFileSync(
        __dirname + '/vendor/web/Socket.IO/socket.io.js'
    ).toString();
    
    return [socketIO,traverse].concat(files).join('\n');
};

