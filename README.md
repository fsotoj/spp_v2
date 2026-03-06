# SPP V2 – Subnational Politics Project

Modern data architecture and visualization platform for the Subnational Politics Project.

## Project Structure

```text
spp_v2/
├── backend/              # Python FastAPI + SQLModel
│   ├── api/              # API Routers & Endpoints
│   ├── core/             # ETL & Logic
│   └── db/               # Database Models & Session
├── frontend/             # React + Vite + Tailwind
├── data/                 # Centralized Data Store (Gitignored)
│   ├── db/               # SQLite databases
│   ├── raw/              # Source Excel files
│   └── geo/              # GeoJSON assets
├── vercel.json           # Frontend Deployment Config
├── railway.json          # Backend Deployment Config
└── pyproject.toml        # Python Dependencies
```

## Quick Start (Local Dev)

### 1. Backend Setup
```bash
# From the root directory
python -m venv .venv
.\.venv\Scripts\activate

# Install dependencies
pip install -e .

# Run the API
python -m uvicorn backend.api.main:app --reload
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

The frontend is configured to proxy `/api` requests to the backend at `localhost:8000`.

## Deployment

- **Backend**: Deployed on **Railway** with persistent volume at `/app/data/db/`.
- **Frontend**: Deployed on **Vercel** with SPA routing.
