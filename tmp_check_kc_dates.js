import pool from './server/db.js';

async function check() {
    const r = await pool.query(`
        SELECT trade_date::text, COUNT(DISTINCT qhcode) as contracts 
        FROM historic_open_interest 
        WHERE group_code = 'KC'
        GROUP BY trade_date 
        ORDER BY trade_date DESC 
        LIMIT 10;
    `);
    console.table(r.rows);
    process.exit(0);
}
check();
