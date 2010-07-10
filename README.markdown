DNode
=====

DNode is a node.js library for asynchronous, bidirectional remote method invocation.
Transports for network sockets and websocket-style socket.io connections are
provided.

Examples
========

Client and Server
-----------------

    var DNode = require('dnode').DNode;
    var sys = require('sys');
    
    // server-side:
    DNode({
        timesTen : function (n) { return n * 10 }
    }).listen(6060);
    
    // client-side:
    DNode.connect(6060, function (remote) {
        remote.timesTen(5, function (res) {
            sys.puts(res); // 50, computation executed on the server
        });
    });

Asynchronous Function Example
-----------------------------

And if you want to perform timesTen asynchronously on the server side,
DNode.async supplies a function to call with the return value as the last
argument. Example:

    // server-side:
    var DNode = require('dnode').DNode;
    DNode({
        timesTen : DNode.async(function (n,f) {
            f(n * 10);
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
        this.timesX = DNode.async(function (n,f) {
            client.x(function (x) {
                f(n * x);
            });
        });
    }).listen(6060);
    
    // client-side:
    DNode({
        x : function () { return 20 }
    }).connect(6060, function (remote) {
        remote.timesX(3, function (res) {
            sys.puts(res); // 20 * 3 == 60
        });
    });


Bidirectional Browser Example
-----------------------------

The dnode-client.js file in this distribution exposes the same DNode client
interface to browser-based javascript using socket.io. This example provides a
DNode service

You'll need to symlink [socket.io.js](http://github.com/LearnBoost/Socket.IO)
into the examples/ directory, where these files reside.

### web.html

    <script type="text/javascript" src="/js/socket.io.js"></script>
    <script type="text/javascript" src="/js/dnode-client.js"></script>
    <script type="text/javascript">
        DNode({
            name : function () { return 'Mr. Spock' },
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
    
    #!/usr/bin/env node
    var DNode = require('dnode').DNode;
    var sys = require('sys');
    var fs = require('fs');
    var http = require('http');

    var html = fs.readFileSync(__dirname + '/web.html');
    var js = {
        'dnode-client.js' : fs.readFileSync(__dirname + '/../dnode-client.js'),
        // Symlink socket.io.js to examples/ first
        'socket.io.js' : fs.readFileSync(__dirname + '/socket.io.js'),
    };

    var httpServer = http.createServer(function (req,res) {
        var m = req.url.match(/^\/js\/(.+)/);
        if (m) {
            res.writeHead(200, { 'Content-Type' : 'text/javascript' });
            res.end(js[m[1]]);
        }
        else {
            res.writeHead(200, { 'Content-Type' : 'text/html' });
            res.end(html);
        }
    });
    httpServer.listen(6061);

    // listen on 6060 and socket.io
    DNode(function (client) {
        this.timesTen = function (n) { return n * 10 };
        this.whoAmI = DNode.async(function (f) {
            client.name(function (name) {
                f(name
                    .replace(/Mr\.?/,'Mister')
                    .replace(/Ms\.?/,'Miss')
                    .replace(/Mrs\.?/,'Misses')
                );
            })
        });
    }).listen({
        protocol : 'socket.io',
        server : httpServer,
        transports : 'websocket xhr-multipart xhr-polling htmlfile'.split(/\s+/),
    })

Also note that .listen() returns "this", so you can bind multiple listeners to
the same DNode instance by chaining .listen() calls. This is useful when
socket.io clients need to access the same service as regular node.js network
sockets.

Conventions
===========

For the most part, when a method supplies a single return value, the callback
function should be the method's last argument, like blocks in ruby.

Protocol
========

DNode uses newline-terminated JSON messages. Each side of the connection may
request that a method be invoked on the other side.

### Message Data Fields

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

Each side of the connection must respond to the "methods" method, which supplies
a list of available named methods to the callback. The output of "methods" may
change over the course of the connection so the remote may request it multiple
times. An authentication protocol can exploit this behavior by providing a
different set of available methods after a client has authenticated, for
instance.

Todo
====

* Event emitters for errors and other events
* Method chains for friendlier sequential method calls
