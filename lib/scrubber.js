// Scrub callbacks out of requests in order to call them again later
var Traverse = require('traverse').Traverse;
var sys = require('sys');

exports.Scrubber = Scrubber;
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
            callbacks : paths,
        };
    };
    
    // Put the functions back in
    this.unscrub = function (msg) {
        var args = msg.arguments;
        Object.keys(msg.callbacks).forEach(function (id) {
            var path = msg.callbacks[id];
            var node = args;
            path.slice(0,-1).forEach(function (key) {
                node = node[key];
            });
            var last = path.slice(-1)[0];
            if (last === undefined) {
                args = self.callbacks[id];
            }
            else {
                node[last] = self.callbacks[id];
            }
        });
        return args;
    };
}

