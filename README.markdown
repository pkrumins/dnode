DNode
=====

DNode is a node.js library for asynchronous, bidirectional remote method
invocation across the network. Transports for network sockets and
websocket-style socket.io connections are available.

A DNode server listens for incoming connections and offers up an object to
clients that connect. Clients can call any of the methods that the server hosts
and clients can offer their own methods for the server to call.

DNode uses continuation-passing-style to make return values available.
In order to make return values available, the server calls a function supplied
to it by the client as an argument. These functions execute on the client side
with the arguments provided by the server. Functions may be nested arbitrarily
deeply in a method's arguments and can be called multiple times by the server.

Installation
============

Using npm:
    npm install dnode

Or check out the repository and link your development copy:
    git clone http://github.com/substack/dnode.git
    cd dnode
    npm link .

DNode depends on
[socket.io](http://github.com/LearnBoost/Socket.IO-node),
[traverse](http://github.com/substack/js-traverse.git),
and [bufferlist](http://github.com/substack/node-bufferlist.git),
which are all on npm and will be automatically fetched by `npm install dnode`.
You can also fetch them from github too:
    git clone http://github.com/LearnBoost/Socket.IO-node.git
    git clone http://github.com/substack/js-traverse.git
    git clone http://github.com/substack/node-bufferlist.git

Examples
========

Client and Server
-----------------

    var DNode = require('dnode').DNode;
    var sys = require('sys');
    
    // server-side:
    DNode({
        timesTen : function (n,f) { f(n * 10) }
    }).listen(6060);
    
    // client-side:
    DNode.connect(6060, function (remote) {
        remote.timesTen(5, function (res) {
            sys.puts(res); // 50, computation executed on the server
        });
    });

Synchronous Function Example
-----------------------------

The DNode.sync() function adds a callback as the last argument to a function for
functions that return explicitly. This callback is called with the return value.

    // server-side:
    var DNode = require('dnode').DNode;
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

    var DNode = require('dnode').DNode;
    var sys = require('sys');
    
    // server-side:
    DNode(function (client) {
        this.timesX = function (n,f) {
            client.x(function (x) {
                f(n * x);
            });
        }; 
    }).listen(6060);
    
    // client-side:
    DNode({
        x : function (f) { f(20) }
    }).connect(6060, function (remote) {
        remote.timesX(3, function (res) {
            sys.puts(res); // 20 * 3 == 60
        });
    });

Bidirectional Browser Example
-----------------------------

The files in web/ expose the same DNode connect interface to browser-based
javascript over socket.io.

You'll need to symlink socket.io.js from
[socket.io](http://github.com/LearnBoost/Socket.IO) into the web/ directory of
this distribution.

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

    var DNode = require('dnode').DNode;
    var sys = require('sys');
    var fs = require('fs');
    var http = require('http');
    
    var html = fs.readFileSync(__dirname + '/web.html');
    var js = ['socket.io.js','traverse.js','scrubber.js','dnode.js']
        .reduce(function (acc,file) {
            return acc + fs.readFileSync(__dirname + '/../web/' + file);
        }, '');
    
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
    
    // listen on 6060 and socket.io
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
"b", so it's path is [ 2, "b" ]. Function 104 is just at index 3 in the argument
field so its path is just [ 3 ].

The contents of the arguments array at a callback location is not used, so it
may contain any value or may be left undefined.

Methods
-------

After the connection is established, each side should send a message with the
method field set to "methods", callbacks as an empty object, and arguments as an
array of the names of the methods that the side provides as strings.

Example of this initial "methods" message:
    {
        "method" : "methods",
        "arguments" : ["timesTen","moo"],
        "callbacks" : {}
    }

After methods are exchanged, each side may request methods from the other.
