var async = require('async'),
    express = require('express'),
    logger = require('morgan'),
    bodyParser = require('body-parser'),
    busboy = require('connect-busboy'),
    jwt = require('jsonwebtoken'),
    expressJwt = require('express-jwt'),
    _ = require('underscore'),
    moment = require('moment-timezone'),
    path = require('path');

var config = {
    mongoDbUrl : process.env.MONGOHQ_URL,
    sendgridUsername: process.env.SENDGRID_USERNAME,
    sendgridPassword: process.env.SENDGRID_PASSWORD,
    cloudmailinForwardAddress: process.env.CLOUDMAILIN_FORWARD_ADDRESS,
    jwtSecret: process.env.JWT_SECRET || process.env.MONGOHQ_URL
};

var db = require('monk')(config.mongoDbUrl),
    entries = db.get('entries'),
    settings = db.get('settings'),
    sendgrid  = require('sendgrid')(config.sendgridUsername, config.sendgridPassword);


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
 * This middleware looks for a query parameter called jwt and set it as
 * the Authorization header if one is missing. This is so we can use the
 * express-jwt middleware below unchanged when we don't want to make
 * the request with a header.
 */
app.use(function(req, res, next) {
    if (!req.get('Authorization') && req.query.jwt) {
        req.headers.authorization = 'Bearer ' + req.query.jwt;
    }
    next();
});
app.use(expressJwt({ secret : config.jwtSecret }));

app.get('/settings', function(req, res, next) {
    getSettings(function(err, settings) {
        if (err) {
            return next(err);
        }
        return res.send(settings);
    });
});

app.put('/settings', function(req, res, next) {
    var update = _.pick(req.body, [
        'name',
        'email',
        'timezone',
        'hour',
        'webRoot'
    ]);
    updateSettings(req.body, function(err) {
        if (err) {
            return next(err);
        }
        return res.status(200).end();
    });
});

app.get('/entries', function(req, res, next) {
    getEntries(function(err, entries) {
        if (err) {
            return next(err);
        }
        return res.send(entries);
    });
});

app.get('/entries/random', function(req, res, next) {
    getRandomEntry(function(err, entry) {
        if (err) {
            return next(err);
        }
        return res.send(entry);
    });
});

app.get('/entries/latest', function(req, res, next) {
    // TODO
    getRandomEntry(function(err, entry) {
        if (err) {
            return next(err);
        }
        return res.send(entry);
    });
});

app.post('/entries', function(req, res, next) {
    createEntry(req.body, function(err) {
        if (err) {
            return next(err);
        }
        return res.status(200).end();
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
            text : fields.plain
        };
        entries.insert(doc);
        res.status(200).end();
    });
});

app.post('/jobs/send', function(req, res, next) {
    async.auto({
        settings : getSettings,
        previousEntry : getRandomEntry,
        subject : ['settings', function(callback, results) {
            var settings = results.settings;
            var date = moment().tz(settings.timezone).format('dddd, MMM Do');
            date = date.charAt(0).toUpperCase() + date.slice(1);
            var params = {
                date : date
            };
            app.render('email-subject', params, callback);
        }],
        body : ['settings', 'previousEntry', function(callback, results) {
            var settings = results.settings;
            var previousEntry = results.previousEntry;
            var token = jwt.sign({},
                config.jwtSecret,
                { expiresInMinutes : 60 * 24 });
            var params = {
                previousEntryDate: moment(previousEntry.createdAt).fromNow(),
                previousEntryBody : previousEntry.text,
                previousEntriesUrl : settings.webRoot + '?jwt=' + token
            };
            app.render('email-body-text', params, callback);
        }],
        bodyHtml : ['settings', 'previousEntry', function(callback, results) {
            var settings = results.settings;
            var previousEntry = results.previousEntry;
            var token = jwt.sign({},
                config.jwtSecret,
                { expiresInMinutes : 60 * 24 });
            var params = {
                previousEntryDate: moment(previousEntry.createdAt).fromNow(),
                previousEntryBody : previousEntry.text.replace(/\n/g, '<br>'),
                previousEntriesUrl : settings.webRoot + '?jwt=' + token
            };
            app.render('email-body-html', params, callback);
        }]
    }, function(err, results) {
        if (err) {
            return next(err);
        }

        var settings = results.settings;
        var subject = results.subject;
        var body = results.body;
        var bodyHtml = results.bodyHtml;

        sendgrid.send({
            to: settings.email,
            toname: settings.name,
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

/**
 * Attempts to extract only the message from the email.
 * @param email
 */
function extractEmailText(email) {
    var lines = email.split(/\r?\n/);
    console.dir(lines);
    // find the first line that looks like quoted text
    var firstIndex = -1;
    for (var i = 0; i < lines.length; i++) {
        if (/^>/.test(lines[i])) {
            firstIndex = i;
            break;
        }
    }
    var lastIndex = -1;
    for (var i = lines.length - 1; i >= 0; i--) {
        if (/^>/.test(lines[i])) {
            lastIndex = i;
            break;
        }
    }
    if (firstIndex == -1) {
        return lines.join('\n');
    }
    lines = _.reject(lines, function(item, index) {
        return (index >= firstIndex && index <= lastIndex);
    });
    // find the last line that looks like quoted text
    // see if the line before the first line looks like quote header
    // remove
    return lines.join('\n');
}

function getRandomEntry(callback) {
    getEntries(function(err, entries) {
        if (err) {
            return callback(err);
        }
        return callback(err, _.sample(entries));
    });
}

function createEntry(entry, callback) {
    entries.insert(entry, callback);
}

function getEntries(callback) {
    entries.find({}, function(err, docs) {
        if (err) {
            return callback(err);
        }

        return callback(null, _.map(docs, function(doc) {
            return _.omit(doc, '_id');
        }));
    });
}

function getSettings(callback) {
    settings.findOne({}, function(err, doc) {
        if (err) {
            return callback(err);
        }
        if (!doc) {
            doc = {};
        }
        doc = _.defaults(doc, {
            name : null,
            email : null,
            timezone : 'America/Los_Angeles',
            hour : 20,
            webRoot : null,
            token : jwt.sign({}, config.jwtSecret)
        });
        return callback(null, _.omit(doc, '_id'));
    });
}

function updateSettings(values, callback) {
    if (values.webRoot) {
        values.webRoot = values.webRoot.replace(/\/+$/, '');
    }
    settings.update({}, { $set : values }, { upsert : true }, callback);
}

entries.index('createdAt');

module.exports = app;
