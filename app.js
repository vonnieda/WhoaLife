const express = require('express'),
    logger = require('morgan'),
    bodyParser = require('body-parser'),
    jwt = require('jsonwebtoken'),
    _ = require('underscore'),
    moment = require('moment'),
    countdown = require('countdown'),
    path = require('path'),
    URL = require('url'),
    basicAuth = require('basic-auth'),
    { Pool } = require('pg');

const config = {
    cloudmailinForwardAddress: process.env.CLOUDMAILIN_FORWARD_ADDRESS,
    jwtSecret: process.env.JWT_SECRET || process.env.DATABASE_URL,
    name : process.env.NAME,
    email : process.env.EMAIL,
    webRoot : process.env.WEB_ROOT.replace(/\/$/, '')
};

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});

const nodemailer = require('nodemailer');
const mg = require('nodemailer-mailgun-transport');
const auth = {
    auth: {
        api_key: process.env.MAILGUN_API_KEY,
        domain: process.env.MAILGUN_DOMAIN,
    },
}
const nodemailerMailgun = nodemailer.createTransport(mg(auth));

function createBasicAuth(username, password) {
    return 'Basic ' + Buffer.from(username + ':' + password).toString('base64');
}

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hjs');

app.use(logger('dev'));
app.use(bodyParser.json());
app.use('/public', express.static(path.join(__dirname, 'public')));

/**
 * Convert app.render to an async function for use in async routes.
 * @param name
 * @param options
 * @returns {Promise<unknown>}
 */
async function render(name, options) {
    return new Promise((resolve, reject) => {
        app.render(name, options, function(err, res) {
            if (err) {
                reject(err);
            }
            else {
                resolve(res);
            }
        })
    });
}

/**
 * Simple HTTP basic auth that looks for a valid, signed JWT in the password
 * field. Username is ignored.
 */
app.use(function (req, res, next) {
    function unauthorized(res) {
        res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
        return res.status(401).end();
    };

    const user = basicAuth(req);

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

app.get('/', async function(req, res, next) {
    try {
        const entries = await getEntries();
        _.each(entries, function (entry) {
            entry.formattedDate = moment(entry.createdat).format('MMMM Do YYYY');
            entry.formattedDay = moment(entry.createdat).format('dddd');
            entry.formattedText = '<p>' + entry.text;
            entry.formattedText = entry.formattedText.replace(/\r/g, '');
            entry.formattedText = entry.formattedText.replace(/\n\n/g, '<p>');
            entry.formattedText = entry.formattedText.replace(/\n/g, ' ');
            entry.formattedText = entry.formattedText.trim();
        });
        res.render('index', {
            name: config.name,
            entries: entries
        });
    }
    catch (err) {
        return next(err);
    }
});

app.post('/emails', async function(req, res, next) {
    try {
        if (!req.body.reply_plain) {
            return res.status(404).end();
        }
        const doc = {
            createdat : new Date(),
            text : req.body.reply_plain.trim()
        };
        await createEntry(doc);
        res.status(200).end();
    }
    catch (err) {
        return next(err);
    }
});

app.post('/jobs/send', async function(req, res, next) {
    function createPreviousEntriesUrl(webRoot) {
        const token = jwt.sign({},
            config.jwtSecret,
            { expiresIn : '24h' });
        const url = URL.parse(webRoot);
        url.auth = 'a:' + token;
        return URL.format(url);
    }

    try {
        const previousEntry = await getRandomEntry();
        const previousEntriesUrl = createPreviousEntriesUrl(config.webRoot);

        const subject = await render('email-subject', {
            date : moment().format('dddd, MMM Do'),
        });

        let bodyParams = {
            previousEntriesUrl : createPreviousEntriesUrl(config.webRoot),
        };
        if (previousEntry) {
            bodyParams.previousEntryDate = capitalize(countdown(previousEntry.createdat, null, null, 2));
            bodyParams.previousEntryBody = previousEntry.text;
        }
        const body = await render('email-body-text', bodyParams);

        let bodyHtmlParams = {
            previousEntriesUrl : createPreviousEntriesUrl(config.webRoot),
        };
        if (previousEntry) {
            bodyHtmlParams.previousEntryDate = capitalize(countdown(previousEntry.createdat, null, null, 2));
            bodyHtmlParams.previousEntryBody = previousEntry.text.replace(/\n/g, '<br>');
        }
        const bodyHtml = await render('email-body-html', bodyHtmlParams);

        await nodemailerMailgun.sendMail({
            from: `"WhoaLife" <${config.cloudmailinForwardAddress}>`,
            to: `"${config.name}" <${config.email}>`,
            subject: subject,
            text: body,
            html: bodyHtml
        });

        res.status(200).end();
    }
    catch (err) {
        console.log(err);
        return next(err);
    }
});

async function getRandomEntry() {
    let rows = (await db.query(`
        select * from entries 
        where date_part('month', createdat) = date_part('month', now()) 
            and date_part('day', createdat) = date_part('day', now())
    `)).rows;
    if (!rows.length) {
        rows = (await db.query("select * from entries where date_part('dow', createdat) = date_part('dow', now())")).rows;
    }
    if (!rows.length) {
        rows = (await db.query("select * from entries where date_part('day', createdat) = date_part('day', now())")).rows;
    }
    if (!rows.length) {
        rows = (await db.query("select * from entries")).rows;
    }
    return _.sample(rows);
}

async function getEntries() {
    return (await db.query('select * from entries order by createdat desc')).rows;
}

async function createEntry(entry) {
    return (await db.query('insert into entries (createdat, text) values ($1, $2)', [entry.createdat, entry.text])).rows;
}

function capitalize(str) {
    if (!str || !str.length) {
        return str;
    }
    return str.charAt(0).toUpperCase() + str.slice(1);
}

module.exports = app;

// Print handy startup messages
const token = jwt.sign({}, config.jwtSecret);
let url = URL.parse(config.webRoot);
url.auth = 'a:' + token;
url = URL.format(url);

console.log('WhoaLife');
console.log();
console.log('Scheduler Send Mail Command: curl -XPOST \'' + url + 'jobs/send\'');
console.log();
console.log('Cloudmailin Target URL: ' + url + 'emails');
