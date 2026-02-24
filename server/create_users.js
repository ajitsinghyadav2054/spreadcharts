
import pool from './db.js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config({ path: './server/.env' });

async function createUsersTable() {
    try {
        console.log('🚀 Creating "users" table...');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Users table created successfully.');

        // Check if admin exists
        const res = await pool.query('SELECT * FROM users WHERE username = $1', ['admin']);
        if (res.rows.length === 0) {
            console.log('🔑 Creating default admin user...');
            const hash = await bcrypt.hash('admin123', 10);
            await pool.query(
                'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)',
                ['admin', 'admin@example.com', hash]
            );
            console.log('✅ Created user: admin / admin123');
        } else {
            console.log('ℹ️ Admin user already exists.');
        }

    } catch (err) {
        console.error('❌ Error creating users table:', err);
    } finally {
        pool.end();
    }
}

createUsersTable();
