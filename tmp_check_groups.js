import pool from './server/db.js';

async function check() {
    const r = await pool.query(`
        SELECT group_code, MAX(trade_date)::text as latest
        FROM historic_open_interest 
        GROUP BY group_code;
    `);
    console.table(r.rows);
    process.exit(0);
}
check();
