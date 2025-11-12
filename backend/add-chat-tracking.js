import { getPool } from './db.js';

async function addChatQuestionTracking() {
  try {
    console.log('🔄 Adding chat question tracking...');
    const pool = await getPool();
    
    // Check if chat_questions_used column exists
    const checkColumn = await pool.request().query(`
      SELECT COUNT(*) as cnt
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'companies' AND COLUMN_NAME = 'chat_questions_used'
    `);
    
    if (checkColumn.recordset[0].cnt === 0) {
      console.log('➕ Adding chat_questions_used column...');
      await pool.request().query(`
        ALTER TABLE companies
        ADD chat_questions_used INT DEFAULT 0
      `);
      
      // Set all existing records to 0
      await pool.request().query(`
        UPDATE companies
        SET chat_questions_used = 0
        WHERE chat_questions_used IS NULL
      `);
      
      console.log('✅ Chat question tracking added successfully!');
    } else {
      console.log('✅ Chat question tracking already exists!');
    }
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration error:', err);
    process.exit(1);
  }
}

addChatQuestionTracking();
