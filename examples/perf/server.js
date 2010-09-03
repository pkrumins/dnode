#!/usr/bin/env node
var DNode = require('dnode');
var server = DNode({
    pow : function (n, f) { f(n * 10) }
}).listen(6060);
