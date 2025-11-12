import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const dbPath = process.env.DB_PATH || path.resolve(process.cwd(), 'data', 'portfolio.db');
fs.mkdirSync(path.dirname(dbPath), { recursive: true });
const db = new Database(dbPath);

function applyMigration(file) {
  const sql = fs.readFileSync(file, 'utf8');
  db.exec(sql);
  console.log(`Applied migration: ${path.basename(file)}`);
}

const migrationsDir = path.resolve(process.cwd(), 'backend', 'migrations');
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
for (const f of files) {
  applyMigration(path.join(migrationsDir, f));
}

console.log('All migrations applied.');
