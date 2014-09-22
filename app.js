var express = require('express'),
    logger = require('morgan'),
    bodyParser = require('body-parser'),
    busboy = require('connect-busboy'),
    db = require('monk')(process.env.MONGOHQ_URL),
    entries = db.get('entries'),
    jwt = require('jsonwebtoken'),
    expressJwt = require('express-jwt'),
    sendgrid  = require('sendgrid')(process.env.SENDGRID_USERNAME, process.env.SENDGRID_PASSWORD),
    _ = require('underscore'),
    moment = require('moment-timezone'),
    request = require('request');

if (!process.env.TO_EMAIL ||
    !process.env.TO_NAME ||
    !process.env.WEB_URL ||
    !process.env.SEND_TZ ||
    !process.env.SEND_HOUR) {
    console.error('Configuration incomplete. Please try the below commands:');
    console.error('heroku config:set TO_EMAIL=\'your_email@email.com\'');
    console.error('heroku config:set TO_NAME=\'Firstname Lastname\'');
    console.error('heroku config:set WEB_URL=\'http://your_app.herokuapp.com/\'');
    console.error('heroku config:set SEND_TZ=\'America/Los_Angeles\'');
    console.error('heroku config:set SEND_HOUR=\'20\'');
    process.exit(1);
}

var webUrl = process.env.WEB_URL.replace(/\/+$/, '');

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
        if (!fields.plain) {
            return res.status(404).end();
        }
        var doc = {
            createdAt : new Date(),
            text : fields.plain
        };
        console.log(fields.plain);
        entries.insert(doc);
        res.status(200).end();
    });
});

app.post('/jobs/send', function(req, res, next) {
    var subjectTemplate = _.template('It\'s <%= date %> - How did your day go?');

    var bodyTemplate = _.template(
        'Just reply to this email with your entry.' + '\r\n\r\n' +
        'Oh snap, remember this? <%= previousDate %> you wrote...' + '\r\n\r\n' +
        '<%= previous %>' + '\r\n\r\n' +
        'Past Entries: <%= previousUrl %>'
    );

    var subject = subjectTemplate({
        date : moment().tz(process.env.SEND_TZ).format('dddd, MMM Do')
    });

    var body = bodyTemplate({
        previousDate: 'One year ago',
        previous : '[previous entries not yet implemented]',
        previousUrl : webUrl + '/entries'
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

// Configure our cron job
var m = moment().tz(process.env.SEND_TZ);
m.hour(process.env.SEND_HOUR);

https://Rw6vZpy8QVy2Kv6U44QWUg:bev7ko1c7ponftaiqjcad3jr@api.temporize.net/v1/events/0 3 * * ?#http://whoalife.herokuapp.com/jobs/send
var url = process.env.TEMPORIZE_URL +
    '/v1/events/' +
    encodeURIComponent('0 ' + m.tz('UTC').hour() + '* * ?') +
    '#' +
    encodeURIComponent(webUrl + '/jobs/send');

console.log(url);

request.post(url, function(err, res) {
    console.log(err);
    console.log(res);
});

module.exports = app;
