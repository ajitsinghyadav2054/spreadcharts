const { Pool } = require('pg');
require('dotenv').config({ path: './server/.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'coffee_c' ORDER BY ordinal_position`)
    .then(r => {
        r.rows.forEach(x => console.log(x.column_name));
        process.exit(0);
    })
    .catch(e => { console.error(e.message); process.exit(1); });
