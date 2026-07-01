import pool from './server/db.js';

async function check() {
    const r1 = await pool.query("SELECT qhcode FROM historic_open_interest WHERE group_code='KC' AND trade_date='2026-04-06'");
    const r2 = await pool.query("SELECT qhcode FROM historic_open_interest WHERE group_code='KC' AND trade_date='2026-04-02'");

    const d1 = r1.rows.map(x => x.qhcode);
    const d2 = r2.rows.map(x => x.qhcode);

    console.log("Missing on 04-06:", d2.filter(x => !d1.includes(x)));
    process.exit(0);
}
check();
