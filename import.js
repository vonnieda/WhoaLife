var fs = require('fs'),
    moment = require('moment'),
    db = require('monk')(process.env.MONGOHQ_URL),
    dbEntries = db.get('entries'),
    async = require('async');

var file = fs.readFileSync(process.argv[2], 'utf8');

var lines = file.split(/\r?\n/);

var date;
var entry = [];

var entries = [];

function grabEntry() {
    entries.push({
        createdAt : date.toDate(),
        text : entry.join('\n').trim()
    });
}

for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (/^\d{4}-\d{2}-\d{2}$/.test(line)) {
        if (date) {
            grabEntry();
        }

        date = moment(line.trim());
        entry = [];
    }
    else {
        entry.push(line);
    }
}

if (date) {
    grabEntry();
}

async.eachSeries(entries, function(entry, callback) {
    dbEntries.insert(entry, callback);
});