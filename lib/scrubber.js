// Scrub callbacks out of requests in order to call them again later
var Traverse = require('traverse');

module.exports = Scrubber;
function Scrubber () {
    var self = this;
    self.callbacks = {};
    var wrapped = [];
    
    var cbId = 0;
    
    // Take the functions out and note them for future use
    self.scrub = function (obj) {
        var paths = {};
        var args = Traverse(obj).modify(function (node) {
            if (typeof(node) == 'function') {
                var i = wrapped.indexOf(node);
                if (i >= 0) {
                    paths[i] = this.path;
                }
                else {
                    self.callbacks[cbId] = node;
                    wrapped.push(node);
                    paths[cbId] = this.path;
                    cbId++;
                }
                
                this.update('[Function]');
            }
        }).get();
        return {
            arguments : args,
            callbacks : paths,
        };
    };
    
    // Replace callbacks. The supplied function should take a callback id and
    // return a callback of its own.
    self.unscrub = function (msg, f) {
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

