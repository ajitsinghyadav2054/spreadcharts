const { Pool } = require('pg');

const pool = new Pool({
    connectionString: "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require",
});

async function simulate() {
    try {
        const query = `
            SELECT TO_CHAR(trade_date, 'YYYY-MM-DD') as date, qhcode, oi
            FROM historic_open_interest
            WHERE group_code = 'C' AND trade_date >= CURRENT_DATE - INTERVAL '180 days'
            ORDER BY trade_date ASC;
        `;
        const { rows } = await pool.query(query);

        const totalOiMap = new Map();
        rows.forEach(row => {
            const date = row.date;
            const oi = Number(row.oi); // ensure number
            if (!totalOiMap.has(date)) totalOiMap.set(date, 0);
            totalOiMap.set(date, totalOiMap.get(date) + oi);
        });

        const dates = Array.from(totalOiMap.keys()).sort();
        console.log(`Dates: ${dates.length}`);
        const lastDates = dates.slice(-5);

        lastDates.forEach(d => {
            console.log(d, totalOiMap.get(d));
        });

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

simulate();
