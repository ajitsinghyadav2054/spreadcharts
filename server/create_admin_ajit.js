
import pool from './db.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config({ path: './server/.env' });

async function createAjitUser() {
    try {
        console.log('🚀 Creating/Updating user "ajit.yadav"...');

        const username = 'ajit.yadav';
        const password = 'Ajit@2002';
        const email = 'ajit.yadav@example.com'; // Placeholder email

        // 1. Hash the password
        console.log('🔐 Hashing password...');
        const hashedPassword = await bcrypt.hash(password, 10);

        // 2. Check if user exists
        const checkRes = await pool.query('SELECT * FROM users WHERE username = $1', [username]);

        if (checkRes.rows.length > 0) {
            // Update existing user
            console.log('ℹ️ User exists. Updating password...');
            await pool.query(
                'UPDATE users SET password_hash = $1 WHERE username = $2',
                [hashedPassword, username]
            );
            console.log('✅ Updated password for ajit.yadav');
        } else {
            // Insert new user
            console.log('➕ Creating new user...');
            await pool.query(
                'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)',
                [username, email, hashedPassword]
            );
            console.log('✅ Created user: ajit.yadav');
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        pool.end();
    }
}

createAjitUser();
