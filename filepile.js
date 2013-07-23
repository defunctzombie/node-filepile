var fs = require('fs');
var path = require('path');

var uuid = require('uuid');
var lockfile = require('lockfile');
var touch = require('touch');
var debug = require('debug')('local-queue');

function filequeue(name, proc_fn) {
    var basedir = path.join('/tmp', name);
    var lockfilename = path.join(basedir, '.lock');

    if (!fs.existsSync(basedir)) {
        fs.mkdir(basedir);
    }

    // put an item into the queue and return the item id
    function queue(details) {
        var id = uuid();
        var filename = path.join(basedir, id + '.json');
        fs.writeFileSync(filename, JSON.stringify(details));
        return id;
    }

    var lockopts = {
        wait: 5000,
        stale: 2000,
        retryWait: 1000,
        retries: 1000000000
    };

    var processing = 0;

    // while we are processing, we see other changes
    // we will need to process those

    // lock so other processes don't try to access the files
    lockfile.lock(lockfilename, lockopts, function(err) {
        // cannot lock, assume that something else has the lockfile
        if (err) {
            return;
        }

        debug('processing items for %s using pid %d', name, process.pid);
        fs.watch(basedir, files_changed);

        // keep the lockfile fresh
        setInterval(function() {
            debug('refeshing lockfile');
            touch.sync(lockfilename);
        }, 1000);
    });

    function files_changed() {
        // already working through shits
        if (processing++ > 0) {
            return;
        }

        var files = fs.readdirSync(basedir).filter(function(name) {
            return name.indexOf('.lock') < 0;
        });

        (function next() {
            var file = files.shift();
            if (!file) {
                return (--processing > 0) ? files_changed() : null;
            }

            single_file(file, next);
        })();
    };

    function single_file(file, done) {
        var filename = path.join(basedir, file);
        debug('processing file %s', filename);
        var details = JSON.parse(fs.readFileSync(filename, 'utf8'));
        proc_fn(details, function(err) {
            if (err) {
                // TODO handle error'd jobs
                return done();
            }

            fs.unlinkSync(filename);
            done();
        });
    }

    // return a function we can use to queue
    return queue;
}

module.exports = filequeue;
