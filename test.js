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
    setTimeout(done, 1000);
});

var pile2 = filepile('bar', function(details, done) {
    var exp = pile2_items.shift();
    assert.deepEqual(exp, details);
    setTimeout(done, 500);
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

    var error_pile = filepile('filepile-test-errors', function(details, done) {
        done(new Error('foo'));
    });

    error_pile.once('error', function(err) {
        assert.equal(err.message, 'foo');
        setTimeout(process.exit.bind(process, 0), 1000);
    });

    error_pile({});
}, 1000);

