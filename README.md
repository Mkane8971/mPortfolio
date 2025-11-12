# Portfolio Site (Minimal)

A minimal portfolio + admin login code management + OpenAI-powered chat (mockable) built with Express + SQLite + static HTML/JS.

## Features
- Public portfolio profile (single-row table) with name, title, summary, skills.
- Company login codes (for tracking which companies you gave access). Not required for viewing portfolio or chatting.
- Admin panel (password based) to create/update/delete company login codes.
- Chat endpoint that answers positively & accurately about your background using OpenAI (falls back to mock if no key).
- SQLite local file DB (single file). No ORMs for simplicity.

## Tech Choices
- SQLite (via better-sqlite3) for zero-config persistence.
- Express for quick API server.
- Single static HTML file for UI (no build step).

## Setup
1. Copy `.env.example` to `.env` and set values:
```
PORT=5000
JWT_SECRET=change-me
ADMIN_PASSWORD=supersecret
OPENAI_API_KEY=sk-...
DB_PATH= # optional
```

2. Install dependencies:
```
cd backend
npm install
```

3. Run dev server:
```
npm start
```
Then open `http://localhost:5000` (configure static serving if you host differently).

Currently `public/index.html` expects the API mounted at `/api`. You can serve the `public` directory with a static server or add this snippet in `server.js` if you want the backend to serve it:
```js
import path from 'path';
import express from 'express';
app.use(express.static(path.resolve(process.cwd(), 'public')));
```
(Place above `app.listen`).

## Admin Login
Send POST `/api/admin/login` with JSON `{ "password": "<ADMIN_PASSWORD>" }`.
Response: `{ token }` – include it in `x-admin-token` header for mutations.

## Endpoints
- `POST /api/admin/login` -> token
- `GET /api/companies` -> list (public for display; restrict if needed)
- `POST /api/companies` (admin) -> create
- `PUT /api/companies/:id` (admin) -> update
- `DELETE /api/companies/:id` (admin) -> delete
- `POST /api/login-code` -> validate code `{ code }`
- `GET /api/profile` -> portfolio profile
- `POST /api/chat` -> chat with body `{ messages: [{role, content}], session_id? }`

## Modifying Portfolio Profile
Update row id=1 in `portfolio_profile` table manually:
```sql
UPDATE portfolio_profile SET summary = 'New summary', updated_at = CURRENT_TIMESTAMP WHERE id = 1;
```
(You could add an admin endpoint similarly.)

## Chat Behavior
System prompt assembled from profile row. If `OPENAI_API_KEY` missing, returns mock response for testing.

## Testing (Manual Quick Checks)
- Start server `npm start`.
- Navigate to `public/index.html` in a static server or root if served.
- Admin login with your password -> create a company code -> validate in Company Login block.
- Ask chat questions about your background.

## Future Enhancements
- Add JWT / cookie-based sessions.
- Add profile edit UI for admin.
- Persist admin tokens with expiry.
- Add rate limiting for chat endpoint.
- Add tests (supertest) and CI.

## License
MIT
