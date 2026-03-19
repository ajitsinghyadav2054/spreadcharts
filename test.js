import db from './server/db.js';

async function test() {
    const res = await db.query("SELECT report_date_as_mm_dd_yyyy FROM coffee_c ORDER BY report_date_as_mm_dd_yyyy DESC LIMIT 5");
    console.log("From DB:", res.rows);
    const mapped = res.rows.map(r => new Date(r.report_date_as_mm_dd_yyyy).toISOString().split('T')[0]);
    console.log("Mapped:", mapped);
    process.exit(0);
}
test();
