import { getPool } from './db.js';

async function migrateDatabase() {
  try {
    console.log('🔄 Checking database schema...');
    const pool = await getPool();
    
    // Check if is_active column exists
    const checkColumn = await pool.request().query(`
      SELECT COUNT(*) as cnt
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'companies' AND COLUMN_NAME = 'is_active'
    `);
    
    if (checkColumn.recordset[0].cnt === 0) {
      console.log('➕ Adding is_active column to companies table...');
      await pool.request().query(`
        ALTER TABLE companies
        ADD is_active BIT DEFAULT 1
      `);
      
      // Set all existing records to active
      await pool.request().query(`
        UPDATE companies
        SET is_active = 1
        WHERE is_active IS NULL
      `);
      
      console.log('✅ Migration completed successfully!');
    } else {
      console.log('✅ Database schema is up to date!');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration error:', err);
    process.exit(1);
  }
}

migrateDatabase();
