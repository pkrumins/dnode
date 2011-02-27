var dnode = require('dnode');

dnode.connect(7070, function (remote) {
    remote.zing(33, function (n) {
        console.log('n = ' + n);
    });
});
