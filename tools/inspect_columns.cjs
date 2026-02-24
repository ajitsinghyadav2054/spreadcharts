require('dotenv').config({ path: './server/.env' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function main() {
    // Get ALL column names in ordinal position order
    const colRes = await pool.query(
        `SELECT column_name FROM information_schema.columns WHERE table_name='coffee_c' ORDER BY ordinal_position`
    );
    const dbColumns = colRes.rows.map(r => r.column_name).filter(c => c !== 'id');
    console.log(`Total DB columns (excl id): ${dbColumns.length}`);
    dbColumns.forEach((c, i) => console.log(`${String(i).padStart(3, ' ')}: ${c}`));
    await pool.end();
}
main().catch(e => { console.error(e.message); pool.end(); });
