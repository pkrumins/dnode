dnode
=====

DNode is an object-oriented RPC system for node.js.

With dnode you call remote methods from a server's exposed functions.
Any functions you pass along to remote functions as arguments are automatically
wrapped so that the remote end can call you back even if those functions are
deeply nested in an object.

If you've used drb from ruby it's a similar idea.
Both drb and dnode are bidirectional so each side of the connection can call
methods exposed on the other side.
Unlike drb, all dnode methods are asynchronous, so to get the results of remote
operations, you supply callbacks.

Also unlike drb, remote methods can return objects with methods of their own
which are automatically and recursively wrapped. Since you're not stuck with the
methods that the server exposes directly at the dnode object entry-point, you
can expose dynamic interfaces with rich object hierarchies to remote clients.

This trick works over plain old tcp sockets or over websockets
courtesy of [socket.io](http://github.com/LearnBoost/Socket.IO-node).

The only catch is that everything is asynchronous, so you've got to write your
methods in
[continuation passing style](http://en.wikipedia.org/wiki/Continuation-passing_style).
Instead of using `return` like this:
    function foo () { return 555 }
you call a function passed in as an argument
    function foo (cb) { cb(555) }

Using CPS means that you can pass in multiple callbacks embedded arbitrarily
in the argument lists to remote functions or no callbacks at all. There are no
implicit return callbacks to fret over.

dnode(object or constructor)
============================

Just pass `dnode()` an object with functions and attributes you want to expose
or a constructor function that creates a new object with functions and
attributes for each client. The constructor function will be passed a reference to
the remote object and a connection object.
`dnode()` returns an object with `listen()` and `connect()` functions described
below.

connection
----------

The connection object emits 'ready'
when the remote object has been fully populated.
The connect object has an `id` attribute that uniquely identifies clients.

connect(port)
-------------

Connect to a remote dnode service. Pass in a port, host, block, or options
object in any order. The block function if present will be executed with the
remote object and the connection object once the remote object is ready.

To reconnect when the connection drops, specify `reconnect` in the options
object as a millisecond delay between reconnection attempts. This is
experimental.

listen(port)
------------

Listen for incoming dnode clients. Pass in a port, host, block, or options
object in any order. The block function if present will be executed with the
remote object and the connection object once the remote object is ready for each
client.

use(middleware)
---------------

You can write your own dnode middleware with `.use()`. The `middleware` function
you pass will be called just like the constructor function that `dnode()` takes.
You can modify `this`, `remote`, and `conn` objects after the instance computed
with the `dnode()` constructor executes but before the methods are sent over the
wire.

Examples
========

Silly simple thing
------------------

Server:

    var dnode = require('dnode');
    
    dnode({
        decify : function (n,f) { f(n * 10) }
    }).listen(6060);
 
Client:

    var dnode = require('dnode');
    
    dnode.connect(6060, function (remote) {
        remote.decify(5, function (n) {
            console.log(n); // prints 50, woo!
        });
    });

Bidirectional
-------------

Clients and servers aren't special in dnode.
Each side of the link can provide methods to the other side.
 
Server:

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

Client:

    var dnode = require('dnode');
    dnode({
        // Compute the client's temperature and stuff that value into the callback
        temperature : function (cb) {
            var degC = Math.round(20 + Math.random() * 10 - 5);
            console.log(degC + '° C');
            cb(degC);
        }
    }).connect(6060, function (remote) {
        // Call the server's conversion routine, which polls the client's
        // temperature in celsius degrees and converts to fahrenheit
        remote.clientTempF(function (degF) {
            console.log(degF + '° F');
        });
    });

In the Browser
--------------

You can make dnode connections in the browser too!

web.js:

    var connect = require('connect');
    var server = connect.createServer();
    server.use(connect.staticProvider(__dirname));
    
    var dnode = require('dnode');
    dnode(function (client) {
        this.cat = function (cb) {
            cb('meow');
        };
    }).listen(server);
    
    server.listen(6857);
    console.log('http://localhost:6857/');

index.html:

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

Also note that .listen() returns "this", so you can bind multiple listeners to
the same dnode instance by chaining .listen() calls. This is useful when
socket.io clients need to access the same service as regular node.js network
sockets.

Installation
============

Using npm:

    npm install dnode

Or check out the repository and link your development copy:

    git clone http://github.com/substack/dnode.git
    cd dnode && npm link

dnode depends on
[socket.io](http://github.com/LearnBoost/Socket.IO-node),
[traverse](http://github.com/substack/js-traverse),
and [lazy](http://github.com/pkrumins/node-lazy),
which are all on npm and will be automatically fetched when you `npm install
dnode` or `npm link` in the project directory.

You can also fetch them from github too:

    git clone http://github.com/LearnBoost/Socket.IO-node.git
    git clone http://github.com/substack/js-traverse.git
    git clone http://github.com/pkrumins/node-lazy.git

Conventions
===========

For the most part, when a method supplies a single return value, the callback
function should be the method's last argument, like blocks in ruby.
Incidentally, this module was inspired by ruby's DRb.

Error Handling
==============
dnode emits `localError` events through the connection object when an exception
is thrown on the local side and `remoteError` when the remote side throws an
uncaught exception. It doesn't emit `error` because that would crash the service
and that's probably not what you want.

    var client = Dnode({ /* ... */ }).connect(port);
    client.on('localError', function (err) {
        console.log('Local Error: ' + err);
    });
    client.on('remoteError', function (err) {
        console.log('Remote Error: ' + err);
    });

The stack trace is obscured for remoteErrors to avoid leaking sensitive
information.

By default on nextTick a `localError` is registered that prints a stack trace if
no listeners have been bound.

Protocol
========

dnode uses newline-terminated JSON messages. Each side of the connection may
request that a method be invoked on the other side.

Data Fields
-----------

All messages have this format:

* method :: String or Integer
* arguments :: Array
* callbacks :: Object
* links :: Array

When the method field is a string, it refers to a named method at the remote.
When the method field is an integer, it refers to an anonymous function
declared in the callbacks field of a previous request.

The arguments field contains the data to supply the remote method or callback.
The callbacks field maps an integral callback ID to an Array of elements
representing the callback's path in the arguments structure. For instance,
an arguments array before transformation of
    [ 50, 3, { "b" : function () {}, "c" : 4 }, function () {} ]
could result in a callback field of
    { 103 : [ 2, "b" ], 104 : [ 3 ] }
if the functions were assigned IDs of 103 and 104 from left to right
respectively. Function 103 is in the object at element index 2 and at the key
"b", so its path is [ 2, "b" ]. Function 104 is just at index 3 in the argument
field so its path is just [ 3 ].

The contents of the arguments array at a callback location is not used, so it
may contain any value or may be left undefined.

The Array and Object fields can be omitted, in which case they default to [] and
{}.

Methods
-------

After the connection is established, each side should send a message with the
method field set to "methods". The arguments fields should contain an array with
a single element: the object that should be wrapped. The callbacks field is
populated from the arguments array given the procedure above.

Example of this initial methods message:
    {
        "method" : "methods",
        "arguments" : [ { "timesTen" : "[Function]", "moo" : "[Function]" } ],
        "callbacks" : { "0" : ["0","timesTen"], "1" : ["0","moo"] }
    }

Note that the string "[Function]" is just a placeholder and its value is
unimportant.

After methods are exchanged, each side may request methods from the other based
on named keys or numeric callback IDs.

Links
-----

An optional field, "links" supports representing cyclic data structures over
JSON. The "links" field is an array of hashes with "from" and "to" keys set. The
values of the "from" and "two" keys are array encoding paths through the data
structure from the root, as in the "callbacks" field.

Example of a method call with cyclic references:
    {
        "method" : 12,
        "arguments" : [ { "a" : 5, "b" : [ { "c" : 5 } ] } ],
        "callbacks" : {},
        "links" : [ { "from" : [ 0 ], "to" : [ 0, "b", 1 ] } ]
    }
This example creates a link to the first argument within the first argument's
"b" key's second element. The previous data structure could be generated from
the following javascript where `fn` comes from the remote:

    var data = { a : 5, b : [ { c : 5 } ] };
    data.b.push(data);
    fn(data);

Note that links need not necessarily be cyclic, they can just more efficiently
encode duplicate data, for instance.

Other Languages
===============

These libraries implement the dnode protocol too so you can make RPC calls
between scripts written in different languages.

* [dnode-perl](http://github.com/substack/dnode-perl)
* [dnode-ruby](http://github.com/substack/dnode-ruby)

There's a python one in the works too at
* [dnode-python](https://github.com/jesusabdullah/dnode-python)
but it's not finished yet.

Press!
======

[Simon Willison](http://simonwillison.net/2010/Jul/11/dnode/) says:

> Mind-bendingly clever. DNode lets you expose a JavaScript function so that it
> can be called from another machine using a simple JSON-based network protocol.
> That’s relatively straight-forward... but DNode is designed for asynchronous
> environments, and so also lets you pass callback functions which will be
> translated in to references and used to make remote method invocations back to
> your original client. And to top it off, there’s a browser client library so
> you can perform the same trick over a WebSocket between a browser and a
> server.
