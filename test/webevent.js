var Script = process.binding('evals').Script;

exports.webevent = function (assert) {
    Script.runInNewContext(
        '(' + (function () {
            assert.ok(true);
        }).toString() + ')()',
        { assert : assert },
        __dirname + '/../lib/web/events.js'
    );
};
