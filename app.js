const async = require('async'),
    express = require('express'),
    logger = require('morgan'),
    bodyParser = require('body-parser'),
    busboy = require('connect-busboy'),
    jwt = require('jsonwebtoken'),
    _ = require('underscore'),
    moment = require('moment'),
    countdown = require('countdown'),
    path = require('path'),
    URL = require('url'),
    basicAuth = require('basic-auth'),
    email = require('./lib/email'),
    { Pool } = require('pg');

const config = {
    sendgridUsername: process.env.SENDGRID_USERNAME,
    sendgridPassword: process.env.SENDGRID_PASSWORD,
    cloudmailinForwardAddress: process.env.CLOUDMAILIN_FORWARD_ADDRESS,
    jwtSecret: process.env.JWT_SECRET || process.env.MONGOHQ_URL,
    name : process.env.NAME,
    email : process.env.EMAIL,
    webRoot : process.env.WEB_ROOT.replace(/\/$/, '')
};

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});

const sendgrid  = require('sendgrid')(config.sendgridUsername, config.sendgridPassword);

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hjs');

// uncomment after placing your favicon in /public
//app.use(favicon(__dirname + '/public/favicon.ico'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
//app.use(cookieParser());
app.use(busboy({
    immediate : true,
    limits : {
        files : -1,
        fileSize : -1
    }
}));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/pkgs', express.static(path.join(__dirname, '/bower_components')));

/**
 * Simple HTTP basic auth that looks for a valid, signed JWT in the password
 * field. Username is ignored.
 */
app.use(function (req, res, next) {
    function unauthorized(res) {
        res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
        return res.status(401).end();
    };

    var user = basicAuth(req);

    if (!user || !user.name || !user.pass) {
        return unauthorized(res);
    };

    jwt.verify(user.pass, config.jwtSecret, function(err, jwt) {
        if (err) {
            return unauthorized(res);
        }
        return next();
    });
});

app.get('/', function(req, res, next) {
    getEntries(function(err, entries) {
        if (err) {
            return next(err);
        }
        _.each(entries, function(entry) {
            entry.formattedDate = moment(entry.createdAt).format('MMMM Do YYYY');
            entry.formattedDay = moment(entry.createdAt).format('dddd');
            entry.formattedText = '<p>' + entry.text;
            entry.formattedText = entry.formattedText.replace(/\r/g, '');
            entry.formattedText = entry.formattedText.replace(/\n\n/g, '<p>');
            entry.formattedText = entry.formattedText.replace(/\n/g, ' ');
            entry.formattedText = entry.formattedText.trim();
        });
        res.render('index', {
            name : config.name,
            entries : entries
        });
    });
});

app.post('/emails', function(req, res, next) {
    var fields = {};
    req.busboy.on('field', function(field, value) {
        fields[field] = value;
    });
    req.busboy.on('finish', function() {
        if (!fields.plain) {
            return res.status(404).end();
        }
        var doc = {
            createdAt : new Date(),
            text : email.extractEmailText(fields.plain)
        };
        createEntry(doc, function(err) {
            if (err) {
                return next(err);
            }
            res.status(200).end();
        });
    });
});

app.post('/jobs/send', function(req, res, next) {
    function createPreviousEntriesUrl(webRoot) {
        var token = jwt.sign({},
            config.jwtSecret,
            { expiresIn : '24h' });
        var url = URL.parse(webRoot);
        url.auth = 'a:' + token;
        return URL.format(url);
    }

    async.auto({
        previousEntry : getRandomEntry,
        subject : [function(callback, results) {
            var date = moment().format('dddd, MMM Do');
            var params = {
                date : date
            };
            app.render('email-subject', params, callback);
        }],
        body : ['previousEntry', function(callback, results) {
            var previousEntry = results.previousEntry;
            var params = {
                previousEntriesUrl : createPreviousEntriesUrl(config.webRoot)
            };
            if (previousEntry) {
                params.previousEntryDate = capitalize(countdown(previousEntry.createdAt, null, null, 2));
                params.previousEntryBody = previousEntry.text;
            }
            app.render('email-body-text', params, callback);
        }],
        bodyHtml : ['previousEntry', function(callback, results) {
            var previousEntry = results.previousEntry;
            var params = {
                previousEntriesUrl : createPreviousEntriesUrl(config.webRoot)
            };
            if (previousEntry) {
                params.previousEntryDate = capitalize(countdown(previousEntry.createdAt, null, null, 2));
                params.previousEntryBody = previousEntry.text.replace(/\n/g, '<br>');
            }
            app.render('email-body-html', params, callback);
        }]
    }, function(err, results) {
        if (err) {
            return next(err);
        }

        var subject = results.subject;
        var body = results.body;
        var bodyHtml = results.bodyHtml;

        sendgrid.send({
            to: config.email,
            toname: config.name,
            from: config.cloudmailinForwardAddress,
            fromname: 'WhoaLife',
            subject: subject,
            text: body,
            html : bodyHtml
        }, function(err, json) {
            if (err) {
                return next(err);
            }
            res.status(200).end();
        });
    });
});

function getRandomEntry(callback) {
    getEntries(function(err, entries) {
        if (err) {
            return callback(err);
        }
        return callback(err, _.sample(entries));
    });
}

function createEntry(entry, callback) {
    console.log(entry);
    db.query('insert into entries (createdAt, text) values ($1, $2)', [entry.createdAt, entry.text], function(err, res) {
        if (err) {
            return callback(err);
        }

        return callback(null, res.rows);
    });
}

function getEntries(callback) {
    db.query('select * from entries order by createdAt desc', function(err, res) {
        if (err) {
            return callback(err);
        }

        return callback(null, res.rows);
    });
};

function capitalize(str) {
    if (!str || !str.length) {
        return str;
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = app;

// Print handy startup messages
var token = jwt.sign({}, config.jwtSecret);
var url = URL.parse(config.webRoot);
url.auth = 'a:' + token;
url = URL.format(url);

console.log('WhoaLife');
console.log();
console.log('Scheduler Send Mail Command: curl -XPOST \'' + url + 'jobs/send\'');
console.log();
console.log('Cloudmailin Target URL: ' + url + 'emails');
