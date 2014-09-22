var express = require('express'),
    logger = require('morgan'),
    bodyParser = require('body-parser'),
    busboy = require('connect-busboy'),
    db = require('monk')(process.env.MONGOHQ_URL),
    entries = db.get('entries'),
    settings = db.get('settings'),
    jwt = require('jsonwebtoken'),
    expressJwt = require('express-jwt'),
    sendgrid  = require('sendgrid')(process.env.SENDGRID_USERNAME, process.env.SENDGRID_PASSWORD),
    _ = require('underscore'),
    moment = require('moment-timezone');

var app = express();

app.use(express.static(__dirname + '/public'));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(busboy({
    immediate : true,
    limits : {
        files : -1,
        fileSize : -1
    }
}));

app.get('/settings', function(req, res, next) {
    getSettings(function(err, settings) {
        if (err) {
            return next(err);
        }
        return res.send(settings);
    });
});

app.put('/settings', function(req, res, next) {
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
    getSettings(function(err, settings) {
        var subjectTemplate = _.template('It\'s <%= date %> - How did your day go?');

        var bodyTemplate = _.template(
                'Just reply to this email with your entry.' + '\r\n\r\n' +
                'Oh snap, remember this? <%= previousDate %> you wrote...' + '\r\n\r\n' +
                '<%= previous %>' + '\r\n\r\n' +
                'Past Entries: <%= previousUrl %>'
        );

        var subject = subjectTemplate({
            date : moment().tz(settings.timezone).format('dddd, MMM Do')
        });

        var body = bodyTemplate({
            previousDate: 'One year ago',
            previous : '[previous entries not yet implemented]',
            previousUrl : settings.webRoot + '/entries'
        });

        sendgrid.send({
            to: settings.email,
            toname: settings.name,
            from: process.env.CLOUDMAILIN_FORWARD_ADDRESS,
            fromname: 'WhoaLife',
            subject: subject,
            text: body
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
            webRoot : null
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

var email =
    '1Today I worked a lot\r\n\r\n' +
    '2Today I worked a lot\r\n\r\n' +
    '\r\n' +
    '3Today I worked a lot\r\n\r\n' +
    '> 4Today I worked a lot\r\n' +
    '> 5Today I worked a lot\r\n' +
    '> \r\n' +
    '> 7Today I worked a lot\r\n' +
    '> 8Today I worked a lot\r\n';

console.log('------------');
console.log(extractEmailText(email));

module.exports = app;
