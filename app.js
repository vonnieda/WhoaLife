var express = require('express'),
    logger = require('morgan'),
    bodyParser = require('body-parser'),
    busboy = require('connect-busboy'),
    db = require('monk')(process.env.MONGOHQ_URL),
    entries = db.get('entries'),
    jwt = require('jsonwebtoken'),
    expressJwt = require('express-jwt'),
    sendgrid  = require('sendgrid')(process.env.SENDGRID_USERNAME, process.env.SENDGRID_PASSWORD),
    _ = require('underscore');

if (!process.env.TO_EMAIL || !process.env.TO_NAME) {
    console.error('Please set TO_EMAIL and TO_NAME:');
    console.error('heroku config:set TO_EMAIL \'your_email@email.com\'');
    console.error('heroku config:set TO_NAME \'Firstname Lastname\'');
    process.exit(1);
}

var app = express();

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(busboy({
    immediate : true,
    limits : {
        files : -1,
        fileSize : -1
    }
}));

app.get('/entries', function(req, res, next) {
    entries.find({}, function(err, docs) {
        if (err) {
            return next(err);
        }
        return res.send(docs);
    });
});

app.post('/emails', function(req, res, next) {
    var fields = {};
    req.busboy.on('field', function(field, value) {
        fields[field] = value;
    });
    req.busboy.on('finish', function() {
        var doc = {
            createdAt : new Date(),
            text : fields.plain
        };
        entries.insert(doc);
        res.status(200).end();
    });
});

//Just reply to this email with your entry.
//
//Oh snap, remember this? One year ago you wrote...
//
//Went out to North Bend to find a house hidden in the woods. Very fun adventure! Then North Ben Bar and Grill, Costco Gas and Target for socks and a sweater. Spent like $200 tonight! Cripes!
//
//Past entries | Unsubscribe

app.post('/jobs/send', function(req, res, next) {
    // Friday, Sep 19
    var subjectTemplate = _.template('It\'s <%= date %> - How did your day go?');

    var bodyTemplate = _.template(
        'Just reply to this email with your entry.' + '\r\n\r\n' +
        'Oh snap, remember this? One year ago you wrote...' + '\r\n\r\n' +
        '<%= previous %>' + '\r\n\r\n' +
        'Previous Entries: <%= previousUrl %>'
    );

    var subject = subjectTemplate({
//        date : 'Friday, Sep 19'
        date : new Date().toString()
    });

    var body = bodyTemplate({
        previous : 'Something really cool!',
        previousUrl : 'http://whoalife.herokuapp.com/entries'
    });

    sendgrid.send({
        to: process.env.TO_EMAIL,
        toname: process.env.TO_NAME,
        from: process.env.CLOUDMAILIN_FORWARD_ADDRESS,
        fromname: 'WhoaLife',
        subject: subject,
        text: body
    }, function(err, json) {
        if (err) {
            return next(err);
        }
        console.log(json);
        res.status(200).end();
    });
});

module.exports = app;
