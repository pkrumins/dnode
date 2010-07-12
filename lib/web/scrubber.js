function Scrubber () {
    this.callbacks = {};
    var cbId = 0;
    var self = this;
    
    // Take the functions out and note them for future use
    this.scrub = function (obj) {
        var paths = {};
        var args = Traverse(obj).modify(function (node) {
            if (typeof(node) == 'function') {
                self.callbacks[cbId] = node;
                paths[cbId] = this.path;
                this.update('[Function]');
                cbId++;
            }
        }).get();
        return {
            arguments : args,
            callbacks : paths
        };
    };
    
    // Replace callbacks. The supplied function should take a callback id and
    // return a callback of its own.
    this.unscrub = function (msg, f) {
        var args = msg.arguments || [];
        Object.keys(msg.callbacks || {}).forEach(function (strId) {
            var id = parseInt(strId,10);
            var path = msg.callbacks[id];
            var node = args;
            path.slice(0,-1).forEach(function (key) {
                node = node[key];
            });
            var last = path.slice(-1)[0];
            if (last === undefined) {
                args = f(id);
            }
            else {
                node[last] = f(id);
            }
        });
        return args;
    };
}

