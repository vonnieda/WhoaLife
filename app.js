var express = require('express'),
    logger = require('morgan'),
    bodyParser = require('body-parser'),
    busboy = require('connect-busboy'),
    db = require('monk')(process.env.MONGOHQ_URL),
    entries = db.get('entries'),
    jwt = require('jsonwebtoken'),
    expressJwt = require('express-jwt'),
    sendgrid  = require('sendgrid')(process.env.SENDGRID_USERNAME, process.env.SENDGRID_PASSWORD);

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

//sendgrid.send({
//    to:       'jason@vonnieda.org',
//    from:     process.env.CLOUDMAILIN_FORWARD_ADDRESS,
//    subject:  'It\'s Friday, Sep 19 - How did your day go?',
//    text:     'Just reply to this email with your entry.\r\nOh snap, remember this? One year ago you wrote...\r\n'
//}, function(err, json) {
//    if (err) {
//        return console.error(err);
//    }
//    console.log(json);
//});

module.exports = app;
