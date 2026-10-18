# PrismHire AI - Autonomous AI Talent & Hiring Automation Platform

PrismHire AI is an autonomous, end-to-end recruitment platform powered by **FastAPI**, **React (Vite)**, **MongoDB**, and **AI models (Gemini / OpenAI)**. It streamlines multi-stage talent evaluation across AI resume vetting, conversational voice interviews, DSA coding arena, HR video coordination, and ML-powered job recommendations for candidates.

---

## 📁 Repository Structure

```text
ARP/
├── backend/               # FastAPI backend service
│   ├── app/
│   │   ├── routers/       # API route handlers (auth, jobs, applications, interview rounds)
│   │   ├── config.py      # App configuration & environment loader
│   │   ├── database.py    # Async MongoDB connection (Motor)
│   │   ├── models.py      # Pydantic schemas & data models
│   │   ├── resume_screener.py # AI resume parsing & score matching
│   │   └── main.py        # FastAPI entry point & CORS configuration
│   ├── .env               # Backend environment variables
│   ├── .env.example       # Example template for environment variables
│   └── requirements.txt   # Python dependencies
├── frontend/              # React 19 + Vite frontend
│   ├── src/
│   │   ├── pages/         # Dashboard, Jobs, Apply, Applications, DSA/Voice Interviews
│   │   ├── components/    # Reusable UI components & layouts
│   │   └── api/           # Axios HTTP client configuration
│   ├── .env               # Frontend environment variables
│   └── package.json       # Node scripts & dependencies
└── README.md              # Project documentation & run guide
```

---

## ⚙️ Prerequisites

Before running the application, make sure you have installed:

1. **Python 3.10+** (Tested on Python 3.12)
   - Verify with: `python --version`
2. **Node.js 18+** & **npm**
   - Verify with: `node -v` and `npm -v`
3. **MongoDB**:
   - **MongoDB Atlas** (Cloud) connection string, OR
   - **Local MongoDB** instance running on `mongodb://localhost:27017`
4. *(Optional but recommended)* **AI API Key**:
   - Google Gemini API key or OpenAI API key for live AI resume screening and interview evaluation.

---

## 🚀 Step-by-Step Execution Guide

### 1. Backend Setup & Run

Open a terminal (PowerShell or Command Prompt) and navigate to the `backend` folder:

```powershell
cd c:\ARP\backend
```

#### A. (Optional) Create a Python Virtual Environment
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```
*(If you are using global Python and packages are already installed, you can skip this step).*

#### B. Install Python Dependencies
```powershell
pip install -r requirements.txt
```

#### C. Configure Backend Environment (`backend/.env`)
Ensure `backend/.env` has your MongoDB connection string and API keys configured:

```env
APP_NAME="SmartHire AI"
APP_ENV="development"
DEBUG=true
FRONTEND_URL="http://localhost:5173"

# MongoDB Connection String (Atlas or Local):
MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.tczkoqd.mongodb.net/?retryWrites=true&w=majority"
MONGODB_DB_NAME="smarthire"

# JWT Secret for Company Auth
JWT_SECRET_KEY="smarthire-super-secret-jwt-key-2025-production-grade"
JWT_ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# AI Provider Keys (Gemini or OpenAI)
GEMINI_API_KEY="your-gemini-api-key"
OPENAI_API_KEY=""
PRIMARY_AI_PROVIDER="gemini"

# Storage & Base URL
STORAGE_BACKEND="local"
LOCAL_UPLOAD_DIR="./uploads"
BASE_URL="http://localhost:8000"
```

#### D. Start the Backend Server
Run Uvicorn server:

```powershell
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- **API Root**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **API Health Check**: [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health)
- **Interactive Swagger Documentation**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### 2. Frontend Setup & Run

Open a second terminal window and navigate to the `frontend` folder:

```powershell
cd c:\ARP\frontend
```

#### A. Install Node Dependencies
```powershell
npm install
```

#### B. Check Frontend Environment (`frontend/.env`)
Verify `frontend/.env` points to the backend server:

```env
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=SmartHire AI
```

#### C. Start the Development Server
```powershell
npm run dev
```

The frontend will start on:
- **Web App URL**: [http://localhost:5173](http://localhost:5173)

---

## ⚡ Quick Start: Run Both Servers Simultaneously (Windows)

You can run both backend and frontend easily with two separate terminal tabs, or run the following PowerShell commands:

### Terminal 1 (Backend):
```powershell
cd c:\ARP\backend
python -m uvicorn app.main:app --reload --port 8000
```

### Terminal 2 (Frontend):
```powershell
cd c:\ARP\frontend
npm run dev
```

---

## 🔍 Verification & Health Check

1. **Verify Backend**:
   Open [http://127.0.0.1:8000/health](http://127.0.0.1:8000/health) in your browser. You should receive:
   ```json
   {"status":"healthy","env":"development"}
   ```

2. **Verify Frontend**:
   Open [http://localhost:5173](http://localhost:5173) in your browser. You should see the PrismHire AI login and dashboard interface.

3. **Verify API Docs**:
   Open [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) to explore all available endpoints for Jobs, Candidates, Screening, and Interview rounds.

---

## 🛠️ Common Troubleshooting

| Issue | Cause | Solution |
| :--- | :--- | :--- |
| **`pymongo.errors.ServerSelectionTimeoutError`** | MongoDB Atlas IP not whitelisted or incorrect URI | In MongoDB Atlas, go to **Network Access** and ensure your IP (or `0.0.0.0/0`) is whitelisted. |
| **Port 8000 already in use** | A previous Python or Uvicorn process is still running | Find and stop the process: `Get-Process python \| Stop-Process` or use another port (`--port 8001`). |
| **Port 5173 already in use** | Vite picked port 5174 | Check terminal output for the active URL (e.g. `http://localhost:5174`). |
| **No AI response / Screening fallback** | Missing `GEMINI_API_KEY` in `backend/.env` | Add a valid Google Gemini API key to `backend/.env`. |
