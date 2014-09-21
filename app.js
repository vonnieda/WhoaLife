var express = require('express'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    busboy = require('connect-busboy'),
    db = require('monk')(process.env.MONGOHQ_URL),
    entries = db.get('entries'),
    jwt = require('jsonwebtoken'),
    expressJwt = require('express-jwt');

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
    console.log(req.body);
    var fields = {};
    req.busboy.on('field', function(field, value) {
        fields[field] = value;
    });
    req.busboy.on('finish', function() {
        // fields.text is newline formatted text
        var doc = {
            createdAt : new Date(),
            text : fields.text
        };
        entries.insert(doc);
        res.status(200).end();
    });
});

module.exports = app;
