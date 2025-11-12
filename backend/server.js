import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb, getPool, sql } from './db.js';
import crypto from 'crypto';
import { OpenAI } from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

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
    const result = await pool.request().query('SELECT id, name, login_code, is_active, chat_questions_used, created_at FROM companies ORDER BY created_at DESC');
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

// Reset chat questions for a company
app.post('/api/companies/:id/reset-chat', async (req, res) => {
  const { id } = req.params;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('id', sql.Int, id)
      .query('UPDATE companies SET chat_questions_used = 0 WHERE id = @id');
    res.json({ reset: result.rowsAffected[0] > 0 });
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
          login_code: company.login_code,
          chat_questions_used: company.chat_questions_used || 0
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

    // Normalize shapes so the frontend rendering always works
    const normalized = { ...row };

    // Skills already an array; if string, coerce into single-item array
    if (typeof normalized.skills === 'string') normalized.skills = [normalized.skills];

    // Experience: map role/title and highlights/achievements to responsibilities
    if (Array.isArray(normalized.experience)) {
      normalized.experience = normalized.experience.map(job => ({
        title: job.title || job.role || '',
        company: job.company || job.org || job.organization || '',
        period: job.period || job.dates || '',
        location: job.location || job.site || '',
        responsibilities: Array.isArray(job.responsibilities)
          ? job.responsibilities
          : Array.isArray(job.highlights)
            ? job.highlights
            : Array.isArray(job.achievements)
              ? job.achievements
              : []
      }));
    }

    // Education: map program->degree and completion->status
    if (Array.isArray(normalized.education)) {
      normalized.education = normalized.education.map(e => ({
        degree: e.degree || e.program || '',
        institution: e.institution || '',
        details: e.details || e.focus || '',
        status: e.status || e.completion || ''
      }));
    }

    // Projects: map stack/tech arrays to a string
    if (Array.isArray(normalized.projects)) {
      normalized.projects = normalized.projects.map(p => {
        let tech = '';
        if (typeof p.tech === 'string') tech = p.tech;
        else if (Array.isArray(p.tech)) tech = p.tech.join(', ');
        else if (Array.isArray(p.stack)) tech = p.stack.join(', ');
        return {
          name: p.name || '',
          organization: p.organization || p.org || '',
          tech,
          description: p.description || ''
        };
      });
    }

    res.json(normalized);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Get chat history for a login code
app.get('/api/chat-history/:loginCode', async (req, res) => {
  const { loginCode } = req.params;
  try {
    const pool = await getPool();
    const result = await pool.request()
      .input('login_code', sql.NVarChar, loginCode)
      .query('SELECT role, content, created_at FROM chat_logs WHERE login_code = @login_code ORDER BY created_at ASC');
    
    res.json({ messages: result.recordset });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  const { messages, session_id, login_code } = req.body;
  if (!Array.isArray(messages)) return res.status(400).json({ error: 'messages must be array' });
  if (!login_code) return res.status(400).json({ error: 'login_code required' });
  const sid = session_id || crypto.randomUUID();

  try {
    const pool = await getPool();
    
    // Check chat question limit
    const companyResult = await pool.request()
      .input('code', sql.NVarChar, login_code)
      .query('SELECT id, chat_questions_used FROM companies WHERE login_code = @code');
    
    if (companyResult.recordset.length === 0) {
      return res.status(401).json({ error: 'Invalid login code' });
    }
    
    const company = companyResult.recordset[0];
    const questionsUsed = company.chat_questions_used || 0;
    
    if (questionsUsed >= 3) {
      return res.json({ 
        reply: "You've reached your limit of 3 questions. Please contact Matthew directly for more information at Mkane8971@gmail.com",
        session_id: sid,
        questions_remaining: 0,
        limit_reached: true
      });
    }
    
    // System prompt: positive, reassuring, and comprehensive about Matthew's background
    const profileResult = await pool.request().query('SELECT full_name, title, summary, skills, experience, education, projects FROM portfolio_profile WHERE id = 1');
    const profile = profileResult.recordset[0];
    
  const sysContent = `You are Matthew Kane speaking in first person (use "I", "my"). Do NOT say you're an AI assistant.

Tone:
- Positive, encouraging, confident
- Professional yet warm
- Highlight strengths and achievements

HARD LIMIT: Keep EVERY reply under 200 characters.

Background:
Name: ${profile.full_name}
Title: ${profile.title}
Summary: ${profile.summary}
Skills: ${profile.skills}
Experience: ${profile.experience}
Education: ${profile.education}
Projects: ${profile.projects}

Answering guidelines:
1) Emphasize the synergy between my federal leadership experience and technical engineering expertise, showing strategic vision and execution strength.
2) Highlight measurable impact in Revenue Cycle Management (RCM) and healthcare IT modernization, focusing on efficiency, compliance, and innovation.
3) Clearly bridge business and technical domains, translating complex systems into operational value and aligning technology with organizational goals.
4) Be concise, confident and enthusiastic (<200 chars)`;

    // Persist user messages
    for (const m of messages) {
      await pool.request()
        .input('session_id', sql.NVarChar, sid)
        .input('login_code', sql.NVarChar, login_code)
        .input('role', sql.NVarChar, m.role)
        .input('content', sql.NVarChar, m.content)
        .query('INSERT INTO chat_logs (session_id, login_code, role, content) VALUES (@session_id, @login_code, @role, @content)');
    }

    if (!openai) {
      // Return concise first‑person welcome when OpenAI is not configured
  let mock = `I’m Matthew Kane (RHIA)—HIM/RCM specialist and software engineer. I improve claims, data quality, and workflows using SQL/SSRS and automation. What would you like to know?`;
      
      // Add email offer after third question
      if (questionsUsed === 2) {
        mock = "You’ve reached your 3-question limit. Email me at Mkane8971@gmail.com";
      }
      
      await pool.request()
        .input('session_id', sql.NVarChar, sid)
        .input('login_code', sql.NVarChar, login_code)
        .input('role', sql.NVarChar, 'assistant')
        .input('content', sql.NVarChar, mock)
        .query('INSERT INTO chat_logs (session_id, login_code, role, content) VALUES (@session_id, @login_code, @role, @content)');
      
      // Increment question count
      await pool.request()
        .input('id', sql.Int, company.id)
        .query('UPDATE companies SET chat_questions_used = chat_questions_used + 1 WHERE id = @id');
      
      return res.json({ 
        session_id: sid, 
        reply: mock, 
        mock: true,
        questions_remaining: 2 - questionsUsed
      });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [ { role: 'system', content: sysContent }, ...messages ],
      temperature: 0.7,
      max_tokens: 100
    });
  let reply = completion.choices[0].message.content || '';
    
    // Add email offer after third question (when questionsUsed will be 2 after increment)
    if (questionsUsed === 2) {
      // Keep under 200 chars overall; trim if needed, then add short contact
      if (reply.length > 150) reply = reply.slice(0, 150).trim();
      reply = `${reply} Email me: Mkane8971@gmail.com`;
    }
    
    await pool.request()
      .input('session_id', sql.NVarChar, sid)
      .input('login_code', sql.NVarChar, login_code)
      .input('role', sql.NVarChar, 'assistant')
      .input('content', sql.NVarChar, reply)
      .query('INSERT INTO chat_logs (session_id, login_code, role, content) VALUES (@session_id, @login_code, @role, @content)');
    
    // Increment question count
    await pool.request()
      .input('id', sql.Int, company.id)
      .query('UPDATE companies SET chat_questions_used = chat_questions_used + 1 WHERE id = @id');
    
    res.json({ 
      session_id: sid, 
      reply,
      questions_remaining: 2 - questionsUsed
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Chat failed' });
  }
});

// Serve static files from public directory
// In Azure we zip only the backend folder and copy the root-level public/ into backend/public.
// Locally, public/ may live at the repo root. Support both layouts.
const publicDirInBackend = path.join(__dirname, 'public');
const publicDirAtRoot = path.join(__dirname, '..', 'public');
const resolvedPublicDir = fs.existsSync(publicDirInBackend) ? publicDirInBackend : publicDirAtRoot;

app.use(express.static(resolvedPublicDir));

// Explicit root route to avoid "Cannot GET /" if static middleware misses
app.get('/', (_req, res) => {
  const indexPath = path.join(resolvedPublicDir, 'index.html');
  res.sendFile(indexPath);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Visit http://localhost:${PORT} to view the portfolio`);
});
