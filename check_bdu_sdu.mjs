import pool from './server/db.js';

const res = await pool.query(`
    SELECT origin, age_category, sdu_ldu_mt, bdu_mt, total_mt
    FROM cocoa_london_origin_stock
    WHERE trade_date = (SELECT MAX(trade_date) FROM cocoa_london_origin_stock)
      AND age_category = 'TOTAL Valid'
    ORDER BY origin
    LIMIT 20
`);

console.log('\n=== Latest date BDU/SDU values (TOTAL Valid) ===');
console.table(res.rows);

// Also check if BDU values look larger than SDU (which would indicate a swap)
const grandTotal = res.rows.find(r => r.origin === 'GRAND_TOTAL');
if (grandTotal) {
    console.log('\nGrand Total → sdu_ldu_mt:', grandTotal.sdu_ldu_mt, '| bdu_mt:', grandTotal.bdu_mt, '| total_mt:', grandTotal.total_mt);
    console.log('Expected: sdu_ldu_mt + bdu_mt ≈ total_mt');
}

await pool.end();
process.exit(0);
