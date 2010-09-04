var Traverse = require('traverse');
var sys = require('sys');

if (typeof JSON == 'undefined') {
    JSON = {};
    
    JSON.stringify = function (ref) {
        var s = '';
        Traverse(ref).forEach(function (node) {
            if (node instanceof Array) {
                this.before(function () { s += '[' });
                this.post(function (child) {
                    if (!child.isLast) s += ',';
                });
                this.after(function () { s += ']' });
            }
            else if (typeof node == 'object') {
                this.before(function () { s += '{' });
                this.pre(function (x, key) {
                    s += '"' + key + '"' + ':';
                });
                this.post(function (child) {
                    if (!child.isLast) s += ',';
                });
                this.after(function () { s += '}' });
            }
            else if (typeof node == 'function') {
                s += 'null';
            }
            else {
                s += node.toString();
            }
        });
        return s;
    };
    
    JSON.parse = function (s) {
        return eval('(' + s + ')'); // meh, I'm lazy
    };
}

if (!Object.keys) Object.keys = function (obj) {
    var keys = [];
    for (var key in obj) {
        if (obj.hasOwnProperty(key))
            keys.push(key);
    }
    return keys;
};

if (!Array.prototype.forEach) Array.prototype.forEach = function (f, to) {
    for (var i = 0; i < this.length; i++) {
        f.call(to, this[i], i, this);
    }
};

if (!Array.prototype.isArray) Array.prototype.isArray = function (ref) {
    return Object.prototype.toString.call(ref) === '[object Array]';
};

if (!Array.prototype.some) Array.prototype.some = function (f, to) {
    for (var i = 0; i < this.length; i++) {
        if (f.call(to, this[i], i, this)) return true;
    }
    return false;
};

if (!Array.prototype.every) Array.prototype.every = function (f, to) {
    for (var i = 0; i < this.length; i++) {
        if (!f.call(to, this[i], i, this)) return false;
    }
    return true;
};
