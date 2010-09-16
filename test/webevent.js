var fs = require('fs');
var Script = process.binding('evals').Script;

exports.webevent = function (assert) {
    var file = __dirname + '/../lib/web/events.js';
    
    Script.runInNewContext(
        fs.readFileSync(file) + '\n(' + emTest.toString() + ')()',
        { assert : assert, setTimeout : setTimeout },
        file
    );
};

function emTest () {
    var em = new EventEmitter;
    var mooed = false;
    em.on('moo', function (x) {
        assert.equal(x, 3);
        mooed = true;
    });
    em.emit('moo', 3);
    setTimeout(function () { assert.ok(mooed) }, 0);
}
