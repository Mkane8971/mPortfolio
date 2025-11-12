# Deployment Guide - GitHub Actions → Azure App Service

This guide walks you through deploying your portfolio app to Azure using GitHub Actions.

## Prerequisites
- GitHub account (you already have the repo: `Mkane8971/mPortfolio`)
- Azure account ([create free account](https://azure.microsoft.com/free/))

---

## Step 1: Create Azure SQL Database

### 1.1 Navigate to Azure Portal
- Go to [portal.azure.com](https://portal.azure.com)
- Click **"Create a resource"** → Search for **"SQL Database"** → Click **Create**

### 1.2 Configure Database
Fill in the form:

**Basics tab:**
- **Subscription:** Your Azure subscription
- **Resource Group:** Create new → Name it `portfolio-rg`
- **Database name:** `portfolioDB`
- **Server:** Click **"Create new"**
  - **Server name:** `portfolio-sql-<your-unique-name>` (must be globally unique)
  - **Location:** Choose closest region (e.g., East US)
  - **Authentication method:** Use SQL authentication
  - **Server admin login:** `portfolioadmin`
  - **Password:** Create a strong password and **save it** (you'll need this)
  - Click **OK**
- **Want to use SQL elastic pool?** No
- **Compute + storage:** Click **Configure database**
  - Select **Basic** tier (cheapest, ~$5/month) for testing
  - Click **Apply**

**Networking tab:**
- **Connectivity method:** Public endpoint
- **Firewall rules:**
  - ✅ **Allow Azure services and resources to access this server** (IMPORTANT - enables App Service access)
  - ✅ **Add current client IP address** (for your local testing)

Click **Review + create** → **Create**

Wait 2-3 minutes for deployment to complete.

### 1.3 Get Connection Details
After deployment:
1. Go to your SQL Database → Click **"Connection strings"** in left menu
2. Copy the **ADO.NET** connection string - it looks like:
   ```
   Server=tcp:portfolio-sql-xyz.database.windows.net,1433;Initial Catalog=portfolioDB;Persist Security Info=False;User ID=portfolioadmin;Password={your_password};...
   ```
3. **Save these values** (you'll need them later):
   - **DB_SERVER:** `portfolio-sql-xyz.database.windows.net` (the part after `tcp:` and before `,1433`)
   - **DB_USER:** `portfolioadmin`
   - **DB_PASSWORD:** Your password
   - **DB_NAME:** `portfolioDB`

---

## Step 2: Create Azure App Service

### 2.1 Create Web App
- In Azure Portal, click **"Create a resource"** → Search for **"Web App"** → Click **Create**

### 2.2 Configure Web App
**Basics tab:**
- **Subscription:** Your Azure subscription
- **Resource Group:** Select `portfolio-rg` (same as database)
- **Name:** `portfolio-app-<your-name>` (must be globally unique)
  - This becomes your URL: `https://portfolio-app-<your-name>.azurewebsites.net`
- **Publish:** Code
- **Runtime stack:** Node 20 LTS
- **Operating System:** Linux
- **Region:** Same as your database (e.g., East US)
- **Pricing plan:** 
  - Click **"Create new"** → Name it `portfolio-plan`
  - Click **"Explore pricing plans"**
  - Select **Basic B1** (~$13/month) or **Free F1** (limited, but good for testing)
  - Click **Select**

Click **Review + create** → **Create**

Wait 1-2 minutes for deployment.

### 2.3 Get Publish Profile
After deployment:
1. Go to your App Service → Click **"Get publish profile"** in the top toolbar
2. A file downloads: `portfolio-app-xyz.PublishSettings`
3. Open this XML file in a text editor and **copy the entire contents**

---

## Step 3: Configure GitHub Secrets

### 3.1 Add Repository Secrets
1. Go to your GitHub repo: `https://github.com/Mkane8971/mPortfolio`
2. Click **Settings** (top menu)
3. In left sidebar, click **Secrets and variables** → **Actions**
4. Click **"New repository secret"** and add each of these:

**Secret 1:**
- Name: `AZURE_WEBAPP_NAME`
- Value: `portfolio-app-<your-name>` (your App Service name from Step 2.2)
- Click **Add secret**

**Secret 2:**
- Name: `AZURE_WEBAPP_PUBLISH_PROFILE`
- Value: Paste the entire XML content from the `.PublishSettings` file (Step 2.3)
- Click **Add secret**

---

## Step 4: Configure App Service Environment Variables

### 4.1 Set Application Settings
1. Go to Azure Portal → Your App Service
2. In left menu, click **"Configuration"** → **"Application settings"** tab
3. Click **"+ New application setting"** for each variable below:

**Required Settings:**

| Name | Value | Notes |
|------|-------|-------|
| `DB_SERVER` | `portfolio-sql-xyz.database.windows.net` | From Step 1.3 |
| `DB_USER` | `portfolioadmin` | From Step 1.3 |
| `DB_PASSWORD` | Your SQL password | From Step 1.3 |
| `DB_NAME` | `portfolioDB` | From Step 1.3 |
| `DB_ENCRYPT` | `true` | Required for Azure SQL |
| `DB_TRUST_SERVER_CERTIFICATE` | `false` | Security best practice for Azure |
| `ADMIN_PASSWORD` | Your chosen admin password | For admin panel login |
| `JWT_SECRET` | Generate random string | For session security (e.g., `openssl rand -base64 32`) |

**Optional Settings:**

| Name | Value | Notes |
|------|-------|-------|
| `OPENAI_API_KEY` | `sk-...` | If you want real AI chat instead of mock |
| `PORT` | Leave unset | Azure sets this automatically |

### 4.2 Save Configuration
- After adding all settings, click **"Save"** at the top
- Click **"Continue"** to confirm restart

---

## Step 5: Deploy via GitHub Actions

### 5.1 Trigger Deployment
The workflow (`.github/workflows/deploy-azure.yml`) is already in your repo and runs automatically on push to `main`.

To trigger your first deployment:
1. Make any small change (or just push):
   ```bash
   git commit --allow-empty -m "trigger deployment"
   git push origin main
   ```

2. Watch the deployment:
   - Go to GitHub → Your repo → Click **"Actions"** tab
   - You'll see a workflow run called **"Deploy to Azure App Service (Node)"**
   - Click on it to see progress
   - Takes ~2-3 minutes

### 5.2 Verify Deployment
When the workflow completes (green checkmark):

1. Visit your site: `https://portfolio-app-<your-name>.azurewebsites.net`
2. You should see your portfolio homepage!

If you see an error:
- Go to Azure Portal → Your App Service → **"Log stream"** to see logs
- Check that all environment variables are set correctly in Configuration

---

## Step 6: Test Your Deployed App

### 6.1 Test Portfolio Page
- Visit: `https://portfolio-app-<your-name>.azurewebsites.net`
- Verify your name, skills, experience, projects display

### 6.2 Test Admin Panel
1. Click **"Admin Login"** button
2. Enter the `ADMIN_PASSWORD` you set in Step 4.1
3. Create a company login code (e.g., `TEST123`)
4. Log out

### 6.3 Test Chat
1. Use **"Company Login"** with code `TEST123`
2. Ask 3 questions about your background
3. Verify you get responses (mock or OpenAI)
4. After 3rd question, verify email offer appears

### 6.4 Test Admin Chat Viewing
1. Log back into admin panel
2. Click **"View Chats"** for the company you created
3. Verify chat history displays

---

## Troubleshooting

### Database Connection Failed
**Error:** `ELOGIN` or authentication errors

**Fix:**
1. Verify `DB_USER` and `DB_PASSWORD` in App Service Configuration match your SQL Server credentials
2. Go to Azure SQL Server (not database) → **Networking** → Ensure **"Allow Azure services..."** is enabled

### Site Shows Application Error
**Fix:**
1. Azure Portal → App Service → **"Log stream"**
2. Look for specific error messages
3. Common issues:
   - Missing environment variables
   - Database connection timeout (check firewall)

### Workflow Failed
**Fix:**
1. GitHub → Actions → Click the failed run
2. Expand the failed step to see error
3. Common issues:
   - Wrong secret names (must match exactly: `AZURE_WEBAPP_NAME`, `AZURE_WEBAPP_PUBLISH_PROFILE`)
   - Publish profile expired (download new one from Azure Portal)

### Chat Not Working
**Fix:**
- If you set `OPENAI_API_KEY`, verify it's valid and has credits
- If not set, chat will use mock responses (this is expected)

---

## Next Steps

### Update Profile Data
Run the profile update script to populate your real data:

**Option A: Azure Cloud Shell**
1. Azure Portal → Click **Cloud Shell** icon (>_) in top toolbar
2. Select **Bash**
3. Clone your repo and run:
   ```bash
   git clone https://github.com/Mkane8971/mPortfolio.git
   cd mPortfolio/backend
   npm install
   # Set environment variables temporarily
   export DB_SERVER="portfolio-sql-xyz.database.windows.net"
   export DB_USER="portfolioadmin"
   export DB_PASSWORD="your-password"
   export DB_NAME="portfolioDB"
   export DB_ENCRYPT="true"
   export DB_TRUST_SERVER_CERTIFICATE="false"
   node update-profile.js
   ```

**Option B: Connect from Local Machine**
1. Azure SQL Server → **Networking** → Add your current IP to firewall
2. Update your local `.env`:
   ```
   DB_SERVER=portfolio-sql-xyz.database.windows.net
   DB_USER=portfolioadmin
   DB_PASSWORD=your-password
   DB_NAME=portfolioDB
   DB_ENCRYPT=true
   DB_TRUST_SERVER_CERTIFICATE=false
   ```
3. Run: `cd backend && node update-profile.js`

### Set Up Custom Domain (Optional)
1. Azure App Service → **Custom domains**
2. Follow wizard to add your domain
3. Configure DNS with your domain registrar

### Monitor and Scale
- **Metrics:** App Service → Monitoring → Metrics (CPU, Memory, Response Time)
- **Scale Up:** App Service → Scale up → Choose higher tier
- **Scale Out:** App Service → Scale out → Increase instance count

---

## Summary: What You Need to Do

1. ✅ **Azure SQL Database** - Create with connection details saved
2. ✅ **Azure App Service** - Create and download publish profile  
3. ✅ **GitHub Secrets** - Add `AZURE_WEBAPP_NAME` and `AZURE_WEBAPP_PUBLISH_PROFILE`
4. ✅ **App Configuration** - Set all environment variables (DB connection + admin password)
5. ✅ **Deploy** - Push to main or trigger workflow
6. ✅ **Test** - Visit your site and verify features work

**Estimated Time:** 20-30 minutes for first-time setup  
**Estimated Cost:** ~$18-20/month (Basic SQL + Basic App Service) or ~$5/month (Basic SQL + Free App Service)

Need help? Check Azure Portal logs or GitHub Actions output for specific error messages.
