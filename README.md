# Portfolio Site (Node + MSSQL)

A minimal portfolio + admin login code management + OpenAI-powered chat (mockable) built with Express, Microsoft SQL Server, and a static HTML/JS frontend served by the backend.

## Features
- Public portfolio profile (single-row table) with name, title, summary, skills.
- Company login codes (for tracking which companies you gave access). Not required for viewing portfolio or chatting.
- Admin panel (password based) to create/update/delete company login codes.
- Chat endpoint that answers positively & accurately about your background using OpenAI (falls back to mock if no key).
- Microsoft SQL Server database; automatically initializes DB and tables on first run.

## Tech Choices
- Microsoft SQL Server (mssql driver). Local dev uses a local SQL Server instance (default port 1434). Production can use Azure SQL Database.
- Express for quick API server and static hosting (`public/`).
- Single static HTML file for UI (no build step).

## Local Setup
1. Create `.env` in the repo root (same folder that contains `backend/` and `public/`) and set values:
```
PORT=5000
JWT_SECRET=change-me
ADMIN_PASSWORD=supersecret
# Optional: OpenAI key to enable real chat model
OPENAI_API_KEY=

# SQL Server (local dev defaults shown)
DB_USER=sa
DB_PASSWORD=YourStrong(!)Password
DB_NAME=portfolio
DB_ENCRYPT=false
DB_TRUST_SERVER_CERTIFICATE=true
```

2. Install dependencies and start backend:
```
cd backend
npm install
npm start
```
Then open `http://localhost:5000`.

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
You can run `backend/update-profile.js` to seed/update profile fields, or update row id=1 in `portfolio_profile` directly in SQL Server.

## Chat Behavior
System prompt assembled from profile row. If `OPENAI_API_KEY` is missing, the API returns a concise mock response for testing.

## Testing (Manual Quick Checks)
- Start server `npm start`.
- Navigate to `public/index.html` in a static server or root if served.
- Admin login with your password -> create a company code -> validate in Company Login block.
- Ask chat questions about your background.

## Deploying with GitHub + Azure App Service
Because this app uses SQL Server, the simplest fully online setup is:
- Azure SQL Database (managed SQL Server)
- Azure App Service for the Node backend (serves the `public/` frontend)
- GitHub Actions for CI/CD

This repo already includes a workflow at `.github/workflows/deploy-azure.yml`. To use it:

1) Create Azure resources (one-time):
- Azure SQL Database (any small tier is fine to start)
- Azure App Service (Runtime stack: Node 20 LTS)

2) In your GitHub repo settings -> Secrets and variables -> Actions, add:
- `AZURE_WEBAPP_NAME` = your App Service name
- `AZURE_WEBAPP_PUBLISH_PROFILE` = publish profile XML for your App Service (download from Azure Portal)

3) In the App Service Configuration (Application settings), add environment variables:
- `PORT` = 8080 (or leave unset; App Service sets `PORT` automatically)
- `ADMIN_PASSWORD` = your admin password
- `JWT_SECRET` = a strong secret
- `OPENAI_API_KEY` = optional
- `DB_USER` = your Azure SQL login
- `DB_PASSWORD` = your Azure SQL password
- `DB_NAME` = your database name
- `DB_ENCRYPT` = true
- `DB_TRUST_SERVER_CERTIFICATE` = false

4) Push to `main`. The workflow will:
- Install backend deps
- Copy `public/` into `backend/public/` so the backend serves the static site
- Zip and deploy the backend to the App Service

After deploy, visit: `https://<your-app-service-name>.azurewebsites.net`

Notes:
- The backend binds to `process.env.PORT` (required by App Service) or 5000 locally.
- The database initializer creates tables if they don’t exist. Ensure your Azure SQL firewall allows the App Service to connect.

## Future Enhancements
- Add JWT / cookie-based sessions.
- Add profile edit UI for admin.
- Persist admin tokens with expiry.
- Add rate limiting for chat endpoint.
- Add tests (supertest) and CI.

## License
MIT
