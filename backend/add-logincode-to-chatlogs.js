import { getPool } from './db.js';

async function addLoginCodeToChatLogs() {
  try {
    console.log('🔄 Adding login_code to chat_logs...');
    const pool = await getPool();
    
    // Check if login_code column exists
    const checkColumn = await pool.request().query(`
      SELECT COUNT(*) as cnt
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'chat_logs' AND COLUMN_NAME = 'login_code'
    `);
    
    if (checkColumn.recordset[0].cnt === 0) {
      console.log('➕ Adding login_code column...');
      await pool.request().query(`
        ALTER TABLE chat_logs
        ADD login_code NVARCHAR(100)
      `);
      
      console.log('✅ login_code column added successfully!');
    } else {
      console.log('✅ login_code column already exists!');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration error:', err);
    process.exit(1);
  }
}

addLoginCodeToChatLogs();
