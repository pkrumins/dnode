var fs = require('fs');

// Cat together all the web files together to make deployment easier.
// This should probably only be called once at initialization since it does
// synchronous reads.
exports.source = function () {
    return ['socket.io.js','traverse.js','scrubber.js','dnode.js']
    .reduce(function (src,file) {
        return src + fs.readFileSync(__dirname + '/web/' + file);
    }, '');
};
