-- Create core tables
CREATE TABLE IF NOT EXISTS companies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  login_code TEXT NOT NULL UNIQUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portfolio_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  full_name TEXT NOT NULL,
  title TEXT,
  summary TEXT,
  skills TEXT, -- comma separated or JSON string
  experience JSON,
  education JSON,
  projects JSON,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS chat_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL, -- user|assistant|system
  content TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Seed single profile row if missing
INSERT OR IGNORE INTO portfolio_profile (id, full_name, title, summary, skills, experience, education, projects)
VALUES (1, 'Your Name', 'Software Engineer', 'Passionate about building impactful solutions.', 'JavaScript,Node,React,SQL', '[]', '[]', '[]');
