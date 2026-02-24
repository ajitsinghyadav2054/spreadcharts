
import pool from './db.js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Fix path for .env since this script is in server/
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '.env') });

async function createSanjuUser() {
    try {
        console.log('🚀 Creating/Updating user "sanju.reddy"...');

        const username = 'sanju.reddy';
        const password = 'Sanju@2000';
        const email = 'sanju.reddy@example.com';

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
            console.log('✅ Updated password for sanju.reddy');
        } else {
            // Insert new user
            console.log('➕ Creating new user...');
            await pool.query(
                'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)',
                [username, email, hashedPassword]
            );
            console.log('✅ Created user: sanju.reddy');
        }

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        pool.end();
    }
}

createSanjuUser();
