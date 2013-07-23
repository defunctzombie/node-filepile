var assert = require('assert');
var filepile = require('./');

var pile1_items = [
    { foo: 'bar1' },
    { foo: 'baz2' }
];

var pile2_items = [
    { bar: 'baz1' },
    { bar: 'baz2' }
];

// setup piles
var pile1 = filepile('foo', function(details, done) {
    var exp = pile1_items.shift();
    assert.deepEqual(exp, details);
    done();
});

var pile2 = filepile('bar', function(details, done) {
    var exp = pile2_items.shift();
    assert.deepEqual(exp, details);
    done();
});

setInterval(function() {

    if (pile1_items.length !== 0) {
        pile1(pile1_items[0]);
        return;
    }

    if (pile2_items.length !== 0) {
        pile2(pile2_items[0]);
        return;
    }

    process.exit(0);
}, 1000);

