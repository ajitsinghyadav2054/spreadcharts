import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
pool.query("SELECT * FROM cocoa_product_ratios LIMIT 10").then(res => { console.log(JSON.stringify(res.rows, null, 2)); pool.end(); });
