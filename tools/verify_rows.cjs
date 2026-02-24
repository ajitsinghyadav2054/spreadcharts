require('dotenv').config({ path: './server/.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
    const tables = ['coffee_c', 'cocoa', 'cotton_no_2', 'sugar_no_11'];
    for (const table of tables) {
        const res = await pool.query(
            `SELECT report_date_as_mm_dd_yyyy, cftc_contract_market_code, cftc_market_code,
                    cftc_region_code, cftc_commodity_code, open_interest_all
             FROM ${table} ORDER BY report_date_as_mm_dd_yyyy DESC LIMIT 4`
        );
        console.log(`\n── ${table} (last 4 rows) ──`);
        res.rows.forEach(r => {
            const nulls = Object.entries(r).filter(([k, v]) => v === null).map(([k]) => k);
            const date = r.report_date_as_mm_dd_yyyy
                ? new Date(r.report_date_as_mm_dd_yyyy).toISOString().split('T')[0] : 'NO DATE';
            console.log(`  ${date} | contract=${r.cftc_contract_market_code} | market=${r.cftc_market_code} | oi=${r.open_interest_all} | NULLs: ${nulls.length === 0 ? 'NONE' : nulls.join(',')}`);
        });
    }
    await pool.end();
}
main().catch(e => { console.error(e.message); pool.end(); });
