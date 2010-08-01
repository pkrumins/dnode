// Client code to Connect to DNode proxies from the web browser
function DNode (obj) {
    if (!(this instanceof DNode)) return new DNode(obj);
    var self = this;
    if (obj === undefined) obj = {};
    
    function firstTypes (args) {
        var types = {};
        [].concat.apply([],args).forEach(function (arg) {
            var t = typeof(arg);
            if (!(t in types)) types[t] = arg;
        });
        return types;
    }
    
    this.connect = function () {
        var types = firstTypes(arguments) || {};
        var kwargs = types.object || {};
        var host = kwargs.host || types.string || window.location.hostname;
        kwargs.port = kwargs.port || types.number || window.location.port;
        var block = types['function'] || kwargs.block || function () {};
        
        delete kwargs.port;
        delete kwargs.block;
        kwargs.rememberTransport = kwargs.rememberTransport || false;
        kwargs.transports = kwargs.transports
            || 'websocket htmlfile xhr-multipart xhr-polling'.split(/\s+/);
        
        var sock = new io.Socket(host, kwargs);
        
        var remote = {};
        var scrubber = new Scrubber;
        
        function sendRequest(method, args) {
            var scrub = scrubber.scrub(args);
            sock.send(JSON.stringify({
                method : method,
                arguments : scrub.arguments,
                callbacks : scrub.callbacks
            }));
        }
        
        if (typeof(obj) == 'function') {
            // Todo: pass in connection object for events
            obj = new obj(remote);
        }
        
        sock.addEvent('connect', function () {
            sendRequest('methods', Object.keys(obj));
        });
        
        sock.addEvent('message', function (strMsg) {
            var req = JSON.parse(strMsg);
            var args = scrubber.unscrub(req, function (id) {
                return function () {
                    sendRequest(id, [].concat.apply([],arguments));
                };
            });
            
            if (req.method == 'methods') {
                args.forEach(function (method) {
                    remote[method] = function () {
                        var argv = [].concat.apply([],arguments);
                        sendRequest(method, argv);
                    };
                });
                block.call(obj, remote, self);
            }
            else if (typeof(req.method) == 'string') {
                obj[req.method].apply(obj,args);
            }
            else if (typeof(req.method) == 'number') {
                scrubber.callbacks[req.method].apply(obj,args);
            }
        });
        
        sock.connect();
    };
}

// wrapper to turn synchronous functions into asynchronous ones with the
// result callback inserted as the last argument
DNode.sync = function (f) {
    return function () {
        var args = [].concat.apply([],arguments);
        var argv = args.slice(0,-1);
        var cb = args.slice(-1)[0];
        cb(f.apply(this,argv));
    };
};

// Expose prototype methods so DNode can get at them
DNode.expose = function (obj, name) {
    obj[name] = function () {
        var args = [].slice.call(arguments);
        return obj.constructor.prototype[name].apply(obj, args);
    };
};

// annoyingly many browsers don't have these:
if (!Object.keys) Object.keys = function (obj) {
    var keys = [];
    for (var key in obj) {
        if (obj.hasOwnProperty(key))
            keys.push(key);
    }
    return keys;
};

if (!Array.prototype.forEach) Array.prototype.forEach = function (f) {
    for (var i = 0; i < this.length; i++)
        f(this[i]);
};

