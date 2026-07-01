const { Pool } = require('pg');
const pool = new Pool({
    connectionString: "postgres://neondb_owner:npg_1sNlnWK8TPqk@ep-muddy-cloud-aiw1nyc6.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require",
});

async function verify() {
    try {
        const res = await pool.query(`
      SELECT qhcode as qh, oi 
      FROM historic_open_interest 
      WHERE group_code = 'C' AND trade_date = '2025-12-09' 
      ORDER BY qhcode;
    `);
        console.log('Results for 2025-12-09 (London Cocoa C):');
        console.table(res.rows);

        const rows = res.rows;
        if (rows.length === 0) {
            console.log('No data found for this date.');
            return;
        }
        const total = rows.reduce((sum, r) => sum + Number(r.oi), 0);

        const MONTH_ORDER = { 'F': 1, 'G': 2, 'H': 3, 'J': 4, 'K': 5, 'M': 6, 'N': 7, 'Q': 8, 'U': 9, 'V': 10, 'X': 11, 'Z': 12 };
        const parseContract = (str) => {
            const match = str.match(/([FGHJKMNQUVXZ])(\d{2})$/);
            if (!match) return { year: 99, month: 99 };
            return { month: MONTH_ORDER[match[1]] || 0, year: parseInt(match[2]) };
        };

        const sorted = rows.sort((a, b) => {
            const pA = parseContract(a.qh);
            const pB = parseContract(b.qh);
            if (pA.year !== pB.year) return pA.year - pB.year;
            return pA.month - pB.month;
        });

        const front = Number(sorted[0].oi);
        const second = Number(sorted[1].oi);

        const rpi = front / (front + second);
        const bri = front / total;
        const div = rpi - bri;

        const backOi = Math.max(0, total - front - second);
        const backOiPct = total > 0 ? (backOi / total) : 0;

        console.log(`\nCalculated Values:`);
        console.log(`Total OI: ${total}`);
        console.log(`Front (${sorted[0].qh}): ${front}`);
        console.log(`Second (${sorted[1].qh}): ${second}`);
        console.log(`RPI (front / (front+second)): ${rpi.toFixed(3)}`);
        console.log(`BRI (front / total): ${bri.toFixed(3)}`);
        console.log(`Divergence (RPI - BRI): ${div.toFixed(3)}`);
        console.log(`Back OI (Abs sum 3+): ${backOi}`);
        console.log(`Back OI % of total: ${(backOiPct * 100).toFixed(2)}%`);

    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

verify();
