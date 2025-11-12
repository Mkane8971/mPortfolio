import sql from 'mssql';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const config = {
  server: 'localhost',
  port: 1434,
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME || 'portfolio',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

let pool = null;

export async function getPool() {
  if (!pool) {
    // First connect to master to ensure database exists
    const masterConfig = { ...config, database: 'master' };
    const masterPool = await sql.connect(masterConfig);
    
    // Check if portfolio database exists, create if not
    const dbCheck = await masterPool.request().query(`
      IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'portfolio')
      BEGIN
        CREATE DATABASE portfolio;
      END
    `);
    await masterPool.close();
    
    // Now connect to portfolio database
    pool = await sql.connect(config);
  }
  return pool;
}

export async function initDb() {
  try {
    const pool = await getPool();
    
    // Create companies table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='companies' AND xtype='U')
      CREATE TABLE companies (
        id INT IDENTITY(1,1) PRIMARY KEY,
        name NVARCHAR(255) NOT NULL,
        login_code NVARCHAR(100) NOT NULL UNIQUE,
        is_active BIT DEFAULT 1,
        chat_questions_used INT DEFAULT 0,
        created_at DATETIME2 DEFAULT GETDATE()
      );
    `);

    // Create portfolio_profile table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='portfolio_profile' AND xtype='U')
      CREATE TABLE portfolio_profile (
        id INT PRIMARY KEY CHECK (id = 1),
        full_name NVARCHAR(255) NOT NULL,
        title NVARCHAR(255),
        summary NVARCHAR(MAX),
        skills NVARCHAR(MAX),
        experience NVARCHAR(MAX),
        education NVARCHAR(MAX),
        projects NVARCHAR(MAX),
        updated_at DATETIME2 DEFAULT GETDATE()
      );
    `);

    // Create chat_logs table
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='chat_logs' AND xtype='U')
      CREATE TABLE chat_logs (
        id INT IDENTITY(1,1) PRIMARY KEY,
        session_id NVARCHAR(100) NOT NULL,
        login_code NVARCHAR(100) NOT NULL,
        role NVARCHAR(50) NOT NULL,
        content NVARCHAR(MAX) NOT NULL,
        created_at DATETIME2 DEFAULT GETDATE()
      );
    `);

    // Seed portfolio profile if not exists
    const checkProfile = await pool.request().query('SELECT COUNT(*) as cnt FROM portfolio_profile WHERE id = 1');
    if (checkProfile.recordset[0].cnt === 0) {
      await pool.request()
        .input('full_name', sql.NVarChar, 'Your Name')
        .input('title', sql.NVarChar, 'Software Engineer')
        .input('summary', sql.NVarChar, 'Passionate about building impactful solutions with JavaScript/TypeScript, Node.js, and cloud services.')
        .input('skills', sql.NVarChar, JSON.stringify(['JavaScript','TypeScript','Node','React','Express','SQL Server']))
        .input('experience', sql.NVarChar, JSON.stringify([]))
        .input('education', sql.NVarChar, JSON.stringify([]))
        .input('projects', sql.NVarChar, JSON.stringify([]))
        .query(`
          INSERT INTO portfolio_profile (id, full_name, title, summary, skills, experience, education, projects)
          VALUES (1, @full_name, @title, @summary, @skills, @experience, @education, @projects)
        `);
    }

    console.log('Database schema initialized successfully');
  } catch (err) {
    console.error('Database initialization error:', err);
    throw err;
  }
}

export { sql };
