DNode
=====

DNode is a node.js library for asynchronous, bidirectional remote method
invocation across the network. Transports for network sockets and
websocket-style socket.io connections are available.

A DNode server listens for incoming connections and offers up an object to
clients that connect. Clients can call any of the methods that the server hosts
and clients can offer their own methods for the server to call.

DNode uses continuation-passing-style to make return values available: the
server calls a function supplied to it by the client as an argument. These
functions execute on the client side with the arguments provided by the server.
Functions may be nested arbitrarily deeply in a method's arguments and can be
called multiple times by the server.

Or [as Simon Willison puts it](http://simonwillison.net/2010/Jul/11/dnode/)
(awesomely):

> Mind-bendingly clever. DNode lets you expose a JavaScript function so that it
> can be called from another machine using a simple JSON-based network protocol.
> That’s relatively straight-forward... but DNode is designed for asynchronous
> environments, and so also lets you pass callback functions which will be
> translated in to references and used to make remote method invocations back to
> your original client. And to top it off, there’s a browser client library so
> you can perform the same trick over a WebSocket between a browser and a
> server.

Installation
============

Using npm:

    npm install dnode

Or check out the repository and link your development copy:

    git clone http://github.com/substack/dnode.git
    cd dnode
    npm link .
    git clone http://github.com/LearnBoost/Socket.IO.git lib/vendor/web/Socket.IO

DNode depends on
[socket.io](http://github.com/LearnBoost/Socket.IO-node),
[traverse](http://github.com/substack/js-traverse),
and [bufferlist](http://github.com/substack/node-bufferlist),
which are all on npm and will be automatically fetched by `npm install dnode`.
You can also fetch them from github too:

    git clone http://github.com/LearnBoost/Socket.IO-node.git
    git clone http://github.com/substack/js-traverse.git
    git clone http://github.com/substack/node-bufferlist.git

For the require('dnode/web') stuff to work, you'll need Socket.IO (different
from Socket.IO-node), which is what the second `git clone` in the checkout
instructions is all about. Submodules are hard.

Examples
========

Client and Server
-----------------

Server:

    var DNode = require('dnode');
    DNode({
        timesTen : function (n,f) { f(n * 10) }
    }).listen(6060);
 
Client:

    var DNode = require('dnode');
    var sys = require('sys');
    
    DNode.connect(6060, function (remote) {
        remote.timesTen(5, function (res) {
            sys.puts(res); // 50, computation executed on the server
        });
    });

Synchronous Function Example
-----------------------------

The DNode.sync() function adds a callback as the last argument to a function for
functions that return explicitly. This callback is called with the return value.

Server:

    var DNode = require('dnode');
    DNode({
        timesTen : DNode.sync(function (n) {
            return n * 10;
        })
    }).listen(6060);

This code is functionally equivalent to the server code in the previous example.

Bidirectional Communication Example
-----------------------------------

DNode clients are only clients in the sense that they initiate the connection.
Clients can provide methods for the remote server to call just as the remote
server provides methods for the client to call. The server can get at the
client's methods by passing a constructor to DNode() that will be passed the
client handle as the first argument. 
 
Server:

    var DNode = require('dnode');
    DNode(function (client) {
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

    DNode({
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

Bidirectional Browser Example
-----------------------------

DNode's browser-based interface works just like the node.js version.
To make DNode easier to deploy, all the necessary browser-side code
including [Socket.io](http://github.com/LearnBoost/Socket.IO)
is available by calling `require('dnode/web').source()` on the server-side.

Here's a complete web example:

### web.html

    <script type="text/javascript" src="/dnode.js"></script>
    <script type="text/javascript">
        DNode({
            name : function (f) { f('Mr. Spock') },
        }).connect(function (remote) {
            remote.timesTen(10, function (n) {
                document.getElementById("result").innerHTML = String(n);
            });
            remote.whoAmI(function (name) {
                document.getElementById("name").innerHTML = name;
            });
        });
    </script>
    
    <p>timesTen(10) == <span id="result">?</span></p>
    <p>My name is <span id="name">?</span>.</p>

### web.js

    var DNode = require('dnode');
    var sys = require('sys');
    var fs = require('fs');
    var http = require('http');

    // load the html page and the client-side javascript into memory
    var html = fs.readFileSync(__dirname + '/web.html');
    var js = require('dnode/web').source();

    // simple http server to serve pages and for socket.io transport
    var httpServer = http.createServer(function (req,res) {
        if (req.url == '/dnode.js') {
            res.writeHead(200, { 'Content-Type' : 'text/javascript' });
            res.end(js);
        }
        else {
            res.writeHead(200, { 'Content-Type' : 'text/html' });
            res.end(html);
        }
    });
    httpServer.listen(6061);

    // share an object with DNode over socket.io on top of the http server
    DNode(function (client) {
        this.timesTen = function (n,f) { f(n * 10) };
        this.whoAmI = function (reply) {
            client.name(function (name) {
                reply(name
                    .replace(/Mr\.?/,'Mister')
                    .replace(/Ms\.?/,'Miss')
                    .replace(/Mrs\.?/,'Misses')
                );
            })
        };
    }).listen({
        protocol : 'socket.io',
        server : httpServer,
        transports : 'websocket xhr-multipart xhr-polling htmlfile'.split(/\s+/),
    });

Also note that .listen() returns "this", so you can bind multiple listeners to
the same DNode instance by chaining .listen() calls. This is useful when
socket.io clients need to access the same service as regular node.js network
sockets.

Conventions
===========

For the most part, when a method supplies a single return value, the callback
function should be the method's last argument, like blocks in ruby.
Incidentally, this module was inspired by ruby's DRb.

Protocol
========

DNode uses newline-terminated JSON messages. Each side of the connection may
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

These libraries implement the DNode protocol too so you can make RPC calls
between scripts written in different languages.

* [dnode-perl](http://github.com/substack/dnode-perl) (experimental)

Error Handling
==============
DNode emits 'error' events, and 'remoteError' when a error occurs at the other end.
	client = Dnode().connect(port)
	client.on('error',function (err){})
	client.on('remoteError',function (err){})

error messages are on by default. turn off by passing options to connect or listen:
	Dnode().connect(port, {printErrors: false, printRemoteErrors: false})
