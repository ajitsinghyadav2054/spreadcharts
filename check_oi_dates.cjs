const { Pool } = require('pg');

const pool = new Pool({
    connectionString: "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require",
});

async function checkDates() {
    try {
        const res = await pool.query(`
            SELECT 
                trade_date, 
                COUNT(qhcode) as num_contracts, 
                SUM(oi) as total_oi 
            FROM historic_open_interest 
            WHERE group_code = 'C'
            GROUP BY trade_date 
            ORDER BY trade_date DESC 
            LIMIT 10;
        `);
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

checkDates();
