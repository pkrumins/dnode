// Scrub callbacks out of requests in order to call them again later
var Traverse = require('traverse');
var sys = require('sys');

module.exports = Scrubber;
function Scrubber () {
    var self = this;
    self.callbacks = {};
    var wrapped = [];
    
    var cbId = 0;
    
    // Take the functions out and note them for future use
    self.scrub = function (obj) {
        var paths = {};
        var links = [];
        
        var args = Traverse(obj).modify(function (node) {
            if (typeof(node) == 'function') {
                var i = wrapped.indexOf(node);
                if (i >= 0 && !(i in paths)) {
                    // Keep previous function IDs only for the first function
                    // found. This is somewhat suboptimal but the alternatives
                    // are worse.
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
            else if (this.circular) {
                links.push({ from : this.circular.path, to : this.path });
                this.update('[Circular]');
            }
        }).get();
        
        return {
            arguments : args,
            callbacks : paths,
            links : links
        };
    };
    
    // Replace callbacks. The supplied function should take a callback id and
    // return a callback of its own.
    self.unscrub = function (msg, f) {
        var args = msg.arguments || [];
        Object.keys(msg.callbacks || {}).forEach(function (strId) {
            var id = parseInt(strId,10);
            var path = msg.callbacks[id];
            args = setAt(args, path, f(id));
        });
        
        (msg.links || []).forEach(function (link) {
            
        });
        
        return args;
    };
    
    function setAt (ref, path, value) {
        var node = ref;
        path.slice(0,-1).forEach(function (key) {
            node = node[key];
        });
        var last = path.slice(-1)[0];
        if (last === undefined) {
            return value;
        }
        else {
            node[last] = value;
            return ref;
        }
    }
}

