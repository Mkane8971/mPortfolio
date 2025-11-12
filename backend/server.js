import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb, getPool, sql } from './db.js';
import crypto from 'crypto';
import { OpenAI } from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

// Simple session in-memory store (could be replaced with JWTs)
const sessions = new Map();

// Initialize database
await initDb();

function isAdmin(req) {
  const token = req.headers['x-admin-token'];
  return token && sessions.get(token) === 'admin';
}

app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (!ADMIN_PASSWORD) return res.status(500).json({ error: 'ADMIN_PASSWORD not set' });
  if (password === ADMIN_PASSWORD) {
    const token = crypto.randomBytes(24).toString('hex');
    sessions.set(token, 'admin');
    return res.json({ token });
  }
  return res.status(401).json({ error: 'Invalid password' });
});

// Companies CRUD (admin only)
app.get('/api/companies', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT id, name, login_code, created_at FROM companies ORDER BY created_at DESC');
    res.json(result.recordset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/api/companies', async (req, res) => {
  const { name, login_code } = req.body;
  if (!name || !login_code) return res.status(400).json({ error: 'name and login_code required' });
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('name', sql.NVarChar, name)
      .input('login_code', sql.NVarChar, login_code)
      .query('INSERT INTO companies (name, login_code) OUTPUT INSERTED.id VALUES (@name, @login_code)');
    res.status(201).json({ id: result.recordset[0].id, name, login_code });
  } catch (err) {
    if (err.number === 2627) { // Unique constraint violation
      return res.status(409).json({ error: 'login_code already exists' });
    }
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.put('/api/companies/:id', async (req, res) => {
  const { id } = req.params;
  const { name, login_code, is_active } = req.body;
  try {
    const pool = await getPool();
    
    // Build dynamic query based on provided fields
    let query = 'UPDATE companies SET ';
    const updates = [];
    const request = pool.request().input('id', sql.Int, id);
    
    if (name !== undefined) {
      updates.push('name = @name');
      request.input('name', sql.NVarChar, name);
    }
    if (login_code !== undefined) {
      updates.push('login_code = @login_code');
      request.input('login_code', sql.NVarChar, login_code);
    }
    if (is_active !== undefined) {
      updates.push('is_active = @is_active');
      request.input('is_active', sql.Bit, is_active ? 1 : 0);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    query += updates.join(', ') + ' WHERE id = @id';
    const result = await request.query(query);
    res.json({ updated: result.rowsAffected[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

app.delete('/api/companies/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('DELETE FROM companies WHERE id = @id');
    res.json({ deleted: result.rowsAffected[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
});

// Validate login code
app.post('/api/login-code', async (req, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'code required' });
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('code', sql.NVarChar, code)
      .query('SELECT id, name, login_code, is_active FROM companies WHERE login_code = @code');
    
    if (result.recordset.length > 0) {
      const company = result.recordset[0];
      const isActive = company.is_active === undefined || company.is_active === 1 || company.is_active === true;
      
      if (!isActive) {
        return res.status(401).json({ 
          valid: false, 
          message: 'This login code has been deactivated. Please contact Matthew for assistance.' 
        });
      }
      
      return res.json({ 
        valid: true, 
        company: {
          id: company.id,
          name: company.name,
          login_code: company.login_code
        }
      });
    }
    return res.status(401).json({ valid: false, message: 'Invalid login code' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Portfolio profile
app.get('/api/profile', async (req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT full_name, title, summary, skills, experience, education, projects FROM portfolio_profile WHERE id = 1');
    if (result.recordset.length === 0) return res.status(404).json({ error: 'Profile not found' });
    const row = result.recordset[0];
    // Parse JSON fields
    ['skills','experience','education','projects'].forEach(f => {
      if (row[f]) {
        try { row[f] = JSON.parse(row[f]); } catch (_) {}
      }
    });
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  const { messages, session_id } = req.body;
  if (!Array.isArray(messages)) return res.status(400).json({ error: 'messages must be array' });
  const sid = session_id || crypto.randomUUID();

  try {
    const pool = await getPool();
    
    // System prompt: positive, reassuring, and comprehensive about Matthew's background
    const profileResult = await pool.request().query('SELECT full_name, title, summary, skills, experience, education, projects FROM portfolio_profile WHERE id = 1');
    const profile = profileResult.recordset[0];
    
    const sysContent = `You are an enthusiastic and supportive AI assistant representing Matthew Kane, a talented RCM Specialist and Software Engineer. 

Your tone is always:
- Positive and encouraging
- Reassuring and confident
- Professional yet warm
- Highlighting strengths and achievements

Background Information:
Name: ${profile.full_name}
Title: ${profile.title}
Summary: ${profile.summary}

Skills: ${profile.skills}

Professional Experience: ${profile.experience}

Education & Certifications: ${profile.education}

Projects: ${profile.projects}

When answering questions:
1. Always emphasize Matthew's unique combination of federal leadership experience and technical expertise
2. Highlight his proven track record in revenue cycle management and healthcare IT
3. Showcase his ability to bridge technical and business domains
4. Mention his commitment to continuous learning (pursuing Master's degree)
5. Be enthusiastic about his diverse skill set and adaptability
6. Frame any challenges as opportunities for growth
7. Reassure that Matthew's background makes him an exceptional candidate for roles in healthcare IT, software engineering, data analytics, or RCM

Remember: You're here to present Matthew in the best possible light while being truthful and accurate.`;

    // Persist user messages
    for (const m of messages) {
      await pool.request()
        .input('session_id', sql.NVarChar, sid)
        .input('role', sql.NVarChar, m.role)
        .input('content', sql.NVarChar, m.content)
        .query('INSERT INTO chat_logs (session_id, role, content) VALUES (@session_id, @role, @content)');
    }

    if (!openai) {
      // Return encouraging mock response
      const mock = `I'd love to tell you about Matthew's impressive background! He's a unique professional who combines deep federal leadership experience with cutting-edge software engineering skills. His work in revenue cycle management and healthcare IT demonstrates his ability to solve complex problems while maintaining a focus on real-world impact. What specific aspect of his background interests you?`;
      await pool.request()
        .input('session_id', sql.NVarChar, sid)
        .input('role', sql.NVarChar, 'assistant')
        .input('content', sql.NVarChar, mock)
        .query('INSERT INTO chat_logs (session_id, role, content) VALUES (@session_id, @role, @content)');
      return res.json({ session_id: sid, reply: mock, mock: true });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [ { role: 'system', content: sysContent }, ...messages ],
      temperature: 0.7
    });
    const reply = completion.choices[0].message.content;
    await pool.request()
      .input('session_id', sql.NVarChar, sid)
      .input('role', sql.NVarChar, 'assistant')
      .input('content', sql.NVarChar, reply)
      .query('INSERT INTO chat_logs (session_id, role, content) VALUES (@session_id, @role, @content)');
    res.json({ session_id: sid, reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Chat failed' });
  }
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '..', 'public')));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to view the portfolio`);
});
