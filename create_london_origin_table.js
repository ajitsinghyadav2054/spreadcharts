import pool from './server/db.js';

(async () => {
    try {
        console.log('Creating cocoa_london_origin_stock table...');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS cocoa_london_origin_stock (
                id SERIAL PRIMARY KEY,
                trade_date DATE NOT NULL,
                age_category VARCHAR(50) NOT NULL,
                origin VARCHAR(50) NOT NULL,
                sdu_ldu_mt INTEGER DEFAULT 0,
                bdu_mt INTEGER DEFAULT 0,
                total_mt INTEGER DEFAULT 0,
                UNIQUE(trade_date, age_category, origin)
            );
        `);

        console.log('✅ cocoa_london_origin_stock table created successfully!');
    } catch (err) {
        console.error('❌ Error creating table:', err);
    } finally {
        process.exit(0);
    }
})();
