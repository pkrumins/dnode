dnode
=====

DNode is an asynchronous object-oriented RPC system for node.js that lets you
call remote functions.

Just write a server:

    var dnode = require('dnode');
    
    var server = dnode({
        zing : function (n, cb) { cb(n * 100) }
    });
    server.listen(7070);

Run it...

    $ node server.js

Then you can whip up a client that calls the server's `zing` function!

    var dnode = require('dnode');

    dnode.connect(7070, function (remote) {
        remote.zing(33, function (n) {
            console.log('n = ' + n);
        });
    });

*** 

    $ node client.js
    n = 3300
    ^C

When you throw an object at dnode, a recursive traversal scrubs out all of the
`function` objects nested in your data structure and a secondary data structure
is sent along with remote requests that creates shim functions that create RPC
calls back to the side where the functions were originally defined.

When you call a remote function, the same recursive traversal trick happens to
the arguments you pass along, so you can pass callbacks to your remote functions
that actually call you back over the wire when the remote side calls the shim
function on the other end.

Basically, dnode lets you call remote functions as if they were defined locally
without using `eval()` or `Function.prototype.toString()`. Awesome!

The only catch is that because the function calls are traveling down the
high-latency network, the return values of your functions are ignored. Use
[continuation-passing
style](http://en.wikipedia.org/wiki/Continuation-passing_style) instead!

More features:

* symmetric design: both sides of the connection can host up methods for the
    other side to call

* use tcp streams or websockets courtesy of socket.io!
    (see below, just throw a webserver at `listen()`)

methods
=======

dnode(wrapper)
--------------

If `wrapper` is an object, serve this object up to the other side every time.

If `wrapper` is a function, use it to build a new object for each new client.
The result of `new wrapper(remote, conn)` will be used, where `remote` is an
empty object that will be filled with the other side's methods once the initial
protocol phase finishes and where `conn` is the connection object.

Both client and server can call `dnode()` with a wrapper.
`dnode.connect()` and `dnode.listen()` are shortcut that set `wrapper` to `{}`.

.connect(...)
-------------

Connect to a remote dnode service. Pass in a port, host, block, or options
object in any order. The block function if present will be executed with the
remote object and the connection object once the remote object is ready.

You can reconnect when the connection is refused or drops by passing in a
`reconnect` option as the number of milliseconds to wait between reconnection
attempts.

Returns `this` so you can chain multiple connections.

.listen(...)
------------

Listen for incoming dnode clients. Pass in a port, host, block, or options
object in any order. The block function if present will be executed with the
remote object and the connection object once the remote object is ready for each
client.

If you pass a webserver (http.Server, https.Server, connect, express) to
listen(), socket.io will be bound to the webserver and the dnode browser source
will be hosted at `options.mount || "/dnode.js"`.

Returns `this` so you can chain multiple listeners.

.use(middleware)
----------------

You can write your own dnode middleware with `.use()`. The `middleware` function
you pass will be called just like the constructor function that `dnode()` takes.
You can modify `this`, `remote`, and `conn` objects after the instance computed
with the `dnode()` constructor executes but before the methods are sent over the
wire.

Returns `this` so you can chain middlewares.

objects
=======

connection
----------

The connection object (`conn`) is an EventEmitter.

* conn.id is a random hex string that uniquely identifies clients

* conn.end() closes the connection and won't reconnect

* conn emits 'ready' when the remote object has been fully populated from
    the methods exchange

* conn emits 'remote' at the same time as 'ready', except with the remote object
    as an argument

* conn emits 'end' when the connection drops

* conn emits 'connect' when the connection is established

* conn re-emits error events from the stream object

* conn emits 'refused', 'drop', and 'reconnect' when reconnect is enabled

more examples!
==============

bidirectional
-------------

Both sides of the connection in dnode can host up methods that the other side
can call.

Here's an example with some back-and-forth between hosted methods on each side
of the connection:

examples/bidirectional/server.js:

    var dnode = require('dnode');
    
    dnode(function (client) {
        // Poll the client's own temperature() in celsius and convert that value to
        // fahrenheit in the supplied callback
        this.clientTempF = function (cb) {
            client.temperature(function (degC) {
                var degF = Math.round(degC * 9 / 5 + 32);
                cb(degF);
            });
        }; 
    }).listen(6060);

examples/bidirectional/client.js:

    var dnode = require('dnode');
    
    var client = dnode({
        // Compute the client's temperature and stuff that value into the callback
        
        temperature : function (cb) {
            var degC = Math.round(20 + Math.random() * 10 - 5);
            console.log(degC + '° C');
            cb(degC);
        }
    });
    
    client.connect(6060, function (remote, conn) {
        // Call the server's conversion routine, which polls the client's
        // temperature in celsius degrees and converts to fahrenheit
        
        remote.clientTempF(function (degF) {
            console.log(degF + '° F');
            conn.end(); // all done!
        });
    });

dnode in the browser!
---------------------

You can make dnode connections in the browser too!
Just pass your webserver to `.listen()` and you're good to go!

This one uses the built-in node http server:

examples/web-http/server.js:

    var http = require('http');
    var fs = require('fs');
    var dnode = require('dnode');
    
    var index = fs.readFileSync(__dirname + '/index.html');
    
    var server = http.createServer(function (req, res) {
        if (req.url === '/') {
            res.writeHead(200, { 'Content-Type' : 'text/html' });
            res.end(index);
        }
        else {
            res.writeHead(404, { 'Content-Type' : 'text/html' });
            res.end('not found');
        }
    });
    
    dnode(function (client) {
        this.cat = function (cb) {
            cb('meow');
        };
    }).listen(server);
    
    server.listen(6857);
    console.log('http://localhost:6857/');

And then just whip up a quick `index.html`.
The browser-side source is mounted at `/dnode.js` automatically!

examples/web-http/index.html:

    <html>
    <head>
    <script src="/dnode.js" type="text/javascript"></script>
    <script type="text/javascript">
        window.onload = function () {
            DNode.connect(function (remote) {
                remote.cat(function (says) {
                    document.getElementById('says').innerHTML = says;
                });
            });
        };
    </script>
    </head>
    <body>
    The cat says <span id="says">?</span>.
    </body>
    </html>

more examples
-------------

Check out 
[the examples directory](https://github.com/substack/dnode/tree/master/examples/)
of this distribution.

You'll find examples for using dnode with
[connect](https://github.com/SenchaLabs/connect),
[express](http://expressjs.com/),
[https](https://github.com/substack/dnode/tree/master/examples/https),
and authentication.

There's a chat server too!

installation
============

Using [npm](http://npmjs.org):

    npm install dnode

Or check out the repository and link your development copy:

    git clone https://github.com/substack/dnode.git
    cd dnode && npm link

The dnode dependencies are listed in the
[package.json](https://github.com/substack/dnode/tree/master/package.json).
If you install with npm they will be fetched automatically.

read more
=========

* [Roll your own PubSub with DNode](http://substack.net/posts/9bac3e/Roll-your-own-PubSub-with-DNode)
    (Note: EventEmitters are no longer exported directly, use
    [browserify](https://github.com/substack/node-browserify) to get them back)

* [DNode: Asynchronous Remote Method Invocation for Node.js and the Browser](http://substack.net/posts/85e1bd/DNode-Asynchronous-Remote-Method-Invocation-for-Node-js-and-the-Browser)

* [Simon Willison's Weblog](http://simonwillison.net/2010/Jul/11/dnode/)

protocol
========

DNode uses a newline-terminated JSON protocol
[documented in the dnode-protocol
readme](https://github.com/substack/dnode-protocol).

dnode in other languages
========================

These libraries implement the dnode protocol too so you can make RPC calls
between scripts written in different languages.

* [dnode-perl](http://github.com/substack/dnode-perl)
* [dnode-ruby](http://github.com/substack/dnode-ruby)

There's a python one in the works too at
* [dnode-python](https://github.com/jesusabdullah/dnode-python)
but it's not finished yet.
