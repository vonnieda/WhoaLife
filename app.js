var express = require('express');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var busboy = require('connect-busboy');

var app = express();

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(busboy({
    immediate : true,
    limits : {
        files : -1,
        fileSize : -1
    }
}));
app.use(cookieParser());

app.post('/emails', function(req, res, next) {
    var fields = {};
    req.busboy.on('field', function(field, value) {
        fields[field] = value;
    });
    req.busboy.on('finish', function() {
        console.log(fields);
        res.status(200).end();
    });
});

module.exports = app;
