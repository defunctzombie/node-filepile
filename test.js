var cluster = require('cluster');

if (cluster.isMaster) {
    var workers = 2;

    for (var i = 0; i < workers; ++i) {
        cluster.fork();
    }

    cluster.on('exit', function(worker, code, signal) {
        console.log('worker ' + worker.process.pid + ' died');
    });

    return;
}

var email_proc = require('./email-proc');

var queue = email_proc('test-email', function(details, done) {
    console.log(details);
    done();
    //done(new Error('foo'));
});

setInterval(function() {
    queue({ foo: 'bar' });
}, 2000);
