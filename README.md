# filepile [![Build Status](https://secure.travis-ci.org/defunctzombie/node-filepile.png?branch=master)](http://travis-ci.org/defunctzombie/node-filepile)

file backed work queues

## use

```javascript
var filepile = require('filepile');

// create a new pile called 'emails'
var pile = filepile('emails', function(details, done) {
    // details is whatever job data you provide
    // call done() when done
});

// add things to the pile
// the will be processed by the function above
pile({ to: 'foobar@example.com', body: 'hello' });
```

## multiple producers single consumer

Each filepile will only allow for one consumer but multiple producers. Any named pile which already has a consumer on the same system will not allow another consumer to process jobs. If one of the consumers dies, then another consumer will start.

```javascript
var cluster = require('cluster');

if (cluster.isMaster) {
    for (var i=0 ; i<4 ; ++i) {
        cluster.fork();
    }
    return;
}

var filepile = require('filepile');

// only one of the processes will invoke this function
var pile = filepile('emails', function(details, done) {
    console.log(details);
    done();
});

// both processes will generate "work"
setInterval(function() {
    pile({ foo: 'bar' });
}, 1000);
```

## how it works

All producers write json files to a folder in `/tmp`. These files are read by the single consumer and processed. A `lockfile` is used to ensure that there is only one consumer.

The consumer listens using `fs.watch` for new files and processes them.

## gotchas

filepile is not meant to work across machines at this time and will only ensure one consumer with multiple processes on the same machine.

## install

npm install filepile
