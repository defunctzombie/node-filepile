var fs = require('fs');
var path = require('path');
var EventEmitter = require('events').EventEmitter;

var uuid = require('uuid');
var lockfile = require('lockfile');
var touch = require('touch');
var debug = require('debug')('filepile');

function filequeue(name, proc_fn) {
    var basedir = path.join('/tmp', name);
    var lockfilename = path.join(basedir, '.lock');
    var rejected_dir = path.join('/tmp', name + '.fail');

    if (!fs.existsSync(basedir)) {
        fs.mkdirSync(basedir);
    }

    if (!fs.existsSync(rejected_dir)) {
        fs.mkdirSync(rejected_dir);
    }

    debug('new filepile: %s (%s)', name, basedir);

    // put an item into the queue and return the item id
    function queue(details) {
        debug('pile %j', details);
        var id = uuid();
        var filename = path.join(basedir, id + '.json');
        fs.writeFileSync(filename, JSON.stringify(details));
        return id;
    }

    queue.emit = EventEmitter.prototype.emit;
    queue.on = EventEmitter.prototype.on;
    queue.once = EventEmitter.prototype.once;
    queue.removeListener = EventEmitter.prototype.removeListener;

    // if user does not provide a process function, we just expose the queue
    if (!proc_fn) {
        return queue;
    }

    var lockopts = {
        wait: 5000,
        stale: 2000,
        retryWait: 1000,
        retries: 1000000000
    };

    // lock so other processes don't try to access the files
    lockfile.lock(lockfilename, lockopts, function(err) {
        // cannot lock, assume that something else has the lockfile
        if (err) {
            return;
        }

        // keep the lockfile fresh
        var lock_interval = setInterval(function() {
            debug('refeshing lockfile');
            touch.sync(lockfilename);
        }, 1000);

        lock_interval.unref();

        // we be done
        process.once('exit', function() {
            clearInterval(lock_interval);
        });

        debug('processing items for %s using pid %d', name, process.pid);

        // kick off an initial round of processing
        files_changed();

        // new files will trigger new processing
        fs.watch(basedir, files_changed);
    });

    var processing = false;

    function files_changed(type, fname) {
        if (fname === '.lock' || processing) {
            return;
        }

        var files = fs.readdirSync(basedir).filter(function(name) {
            return name.indexOf('.lock') < 0;
        });

        if (files.length === 0) {
            return;
        }

        processing = true;

        (function next() {
            var file = files.shift();
            if (!file) {
                processing = false;
                return files_changed();
            }

            var filename = path.join(basedir, file);
            debug('processing file %s', filename);

            try {
                // maybe this file was partially written
                // or maybe it is being deleted
                // we will come back to it once another file is created
                var details = JSON.parse(fs.readFileSync(filename, 'utf8'));
            } catch (err) {
                return next();
            }

            proc_fn(details, function(err) {
                if (err) {
                    var fail_filename = path.join(rejected_dir, file);
                    debug('failed %s', fail_filename);
                    fs.renameSync(filename, fail_filename);
                    queue.emit('error', err);
                }
                else {
                    debug('done processing %s', filename);
                    fs.unlinkSync(filename);
                }

                next();
            });
        })();
    };

    // return a function we can use to queue
    return queue;
}

module.exports = filequeue;
