import pool from './server/db.js';

// Check specific date matching Excel file date
const res = await pool.query(`
    SELECT origin, age_category, sdu_ldu_mt, bdu_mt, total_mt
    FROM cocoa_london_origin_stock
    WHERE trade_date = '2026-01-30'
      AND age_category = 'TOTAL Valid'
    ORDER BY origin
`);

console.log('\n=== DB values for 2026-01-30, TOTAL Valid ===');
console.table(res.rows);

// From Excel (TOTAL Valid row):
// ECU: SDU=5670, BDU=17000, total=22670
// CAM: SDU=0, BDU=1000, total=1000
console.log('\nExpected from Excel (TOTAL Valid):');
console.log('  ECU → sdu_ldu_mt=5670, bdu_mt=17000');
console.log('  CAM → sdu_ldu_mt=0, bdu_mt=1000');

const ecu = res.rows.find(r => r.origin === 'ECU');
const cam = res.rows.find(r => r.origin === 'CAM');
if (ecu) {
    console.log('\nDB ECU → sdu_ldu_mt:', ecu.sdu_ldu_mt, 'bdu_mt:', ecu.bdu_mt);
    console.log('ECU MATCH:', ecu.sdu_ldu_mt == 5670 && ecu.bdu_mt == 17000 ? '✅ CORRECT' : '❌ SWAPPED or WRONG');
}
if (cam) {
    console.log('DB CAM → sdu_ldu_mt:', cam.sdu_ldu_mt, 'bdu_mt:', cam.bdu_mt);
    console.log('CAM MATCH:', cam.sdu_ldu_mt == 0 && cam.bdu_mt == 1000 ? '✅ CORRECT' : '❌ SWAPPED or WRONG');
}

await pool.end();
process.exit(0);
