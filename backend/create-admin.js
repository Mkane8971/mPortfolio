import sql from 'mssql';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const config = {
  server: 'localhost',
  port: 1434,
  user: 'sa',
  password: 'Pass123!',
  database: 'portfolio',
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

async function createInitialAdmin() {
  try {
    const pool = await sql.connect(config);
    
    // Create the initial admin access code
    const adminCode = 'admin-mkane-2024';
    
    // Check if admin code already exists
    const existing = await pool.request()
      .input('code', sql.NVarChar, adminCode)
      .query('SELECT id FROM companies WHERE login_code = @code');
    
    if (existing.recordset.length > 0) {
      console.log('⚠️  Admin login code already exists');
      console.log('\nUse this code to access the portfolio:');
      console.log(`   ${adminCode}`);
    } else {
      // Insert the admin login code
      await pool.request()
        .input('name', sql.NVarChar, 'Matthew Kane - Admin Access')
        .input('login_code', sql.NVarChar, adminCode)
        .query('INSERT INTO companies (name, login_code) VALUES (@name, @login_code)');
      
      console.log('✓ Admin login code created successfully!');
      console.log('\n📋 Your Portfolio Access Code:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`   ${adminCode}`);
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('\nUse this code to log into your portfolio at:');
      console.log('   http://localhost:3000');
    }
    
    // Show all login codes
    const allCodes = await pool.request().query('SELECT name, login_code, created_at FROM companies ORDER BY created_at DESC');
    
    console.log('\n📊 All Login Codes in Database:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    allCodes.recordset.forEach(code => {
      console.log(`   ${code.name}`);
      console.log(`   Code: ${code.login_code}`);
      console.log(`   Created: ${code.created_at}`);
      console.log('   ──────────────────────────────');
    });
    
    await pool.close();
  } catch (err) {
    console.error('❌ Error creating admin:', err.message);
  }
}

createInitialAdmin();
