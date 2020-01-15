const { Pool } = require('pg');

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});

(async () => {
    try {
        await db.query('create table entries (createdat timestamp with time zone, text text)');
        await db.query('insert into entries values (now(), "Today I started a new diary.");)');
        var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
        console.log(fullUrl);
    } catch (e) {
        console.err(e);
    }
})();

