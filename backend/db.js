import sql from 'mssql';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// For Azure SQL, set DB_SERVER to: <yourserver>.database.windows.net
// For local SQL Server, use: localhost or 127.0.0.1
const config = {
  server: process.env.DB_SERVER || 'localhost',
  port: parseInt(process.env.DB_PORT || '1434'),
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

// Validate critical DB config on startup
if (!config.password) {
  console.error('⚠️  DB_PASSWORD environment variable is required but not set!');
  console.error('Set DB_PASSWORD in your environment or .env file.');
}

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
    console.log('🔌 Connecting to SQL Server...');
    console.log(`   Server: ${config.server}:${config.port}`);
    console.log(`   Database: ${config.database}`);
    console.log(`   Encrypt: ${config.options.encrypt}`);
    
    const pool = await getPool();
    
    console.log('✅ Database connection established');
    
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

    // Create profile_skills table for rich skill metadata
    await pool.request().query(`
      IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='profile_skills' AND xtype='U')
      BEGIN
        CREATE TABLE profile_skills (
          id INT IDENTITY(1,1) PRIMARY KEY,
          profile_id INT NOT NULL,
          name NVARCHAR(200) NOT NULL,
          origin NVARCHAR(400) NULL, -- How the skill was obtained (e.g., project, program)
          started_year INT NULL,     -- First year using the skill
          started_on DATE NULL,      -- Or precise start date
          category NVARCHAR(100) NULL,
          proficiency TINYINT NULL,  -- 1-5 scale (optional)
          notes NVARCHAR(MAX) NULL,
          created_at DATETIME2 DEFAULT GETDATE(),
          CONSTRAINT FK_profile_skills_profile FOREIGN KEY (profile_id) REFERENCES portfolio_profile(id)
        );
        CREATE UNIQUE INDEX IX_profile_skills_unique ON profile_skills(profile_id, name);
      END
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

    // Seed profile_skills if table exists and empty (basic starter data based on initial skills array)
    const hasSkillTable = await pool.request().query("SELECT COUNT(*) AS cnt FROM sysobjects WHERE name='profile_skills' AND xtype='U'");
    if (hasSkillTable.recordset[0].cnt === 1) {
      const skillCount = await pool.request().query('SELECT COUNT(*) AS cnt FROM profile_skills WHERE profile_id = 1');
      if (skillCount.recordset[0].cnt === 0) {
        const seedSkills = [
          { name: 'JavaScript', origin: 'Self-directed projects & bootcamp', started_year: 2021, category: 'Programming', notes: 'Used across full-stack apps and automation scripts.' },
          { name: 'TypeScript', origin: 'Adopted in Node/React refactors', started_year: 2022, category: 'Programming', notes: 'Improved type safety and refactoring speed.' },
          { name: 'Node', origin: 'Backend APIs & tooling', started_year: 2021, category: 'Backend', notes: 'Express services, CLI scripts, integration tasks.' },
          { name: 'React', origin: 'Frontend UI builds', started_year: 2022, category: 'Frontend', notes: 'Component-driven dashboards and forms.' },
          { name: 'Express', origin: 'REST API development', started_year: 2021, category: 'Backend', notes: 'Routing, middleware, chat logging API.' },
          { name: 'SQL Server', origin: 'Reporting & data modeling', started_year: 2021, category: 'Database', notes: 'Schema design, query tuning, analytics.' }
        ];
        for (const s of seedSkills) {
          await pool.request()
            .input('profile_id', sql.Int, 1)
            .input('name', sql.NVarChar, s.name)
            .input('origin', sql.NVarChar, s.origin)
            .input('started_year', sql.Int, s.started_year)
            .input('category', sql.NVarChar, s.category)
            .input('notes', sql.NVarChar, s.notes)
            .query(`INSERT INTO profile_skills (profile_id, name, origin, started_year, category, notes) VALUES (@profile_id, @name, @origin, @started_year, @category, @notes)`);
        }
        console.log('✓ Seeded profile_skills metadata');
      }
    }

    console.log('Database schema initialized successfully');
  } catch (err) {
    console.error('❌ Database initialization error:', err.message);
    if (err.code === 'ELOGIN') {
      console.error('   → Check DB_USER and DB_PASSWORD are correct');
    } else if (err.code === 'ETIMEOUT' || err.code === 'ESOCKET') {
      console.error('   → Check DB_SERVER is reachable and firewall allows connection');
      console.error('   → For Azure SQL, ensure your IP is whitelisted in firewall rules');
    } else if (err.code === 'ENOTFOUND') {
      console.error('   → DB_SERVER hostname could not be resolved');
    }
    throw err;
  }
}

export { sql };
