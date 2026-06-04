# HR Management System

A full-stack HR management web application with role-based access control (RBAC), employee directory management, leave tracking, attendance, and payroll features.

The frontend is a vanilla JavaScript single-page app, the backend is a Python Flask API, and the data lives in a single-file SQLite database.

---

## Live Demo

Deployed on Render: **https://hr-management-system.onrender.com**

> Note: Render's free tier sleeps after 15 minutes of inactivity. The first request after sleep takes ~50 seconds to wake the service.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.13, Flask 3.1.2, flask-cors |
| Database | SQLite (file-based, `database.db`) |
| Auth | Flask sessions + bcrypt password hashing |
| Frontend | Vanilla HTML5, CSS, JavaScript ES6+ (no framework) |
| Server (prod) | gunicorn (2 workers) |
| Icons / Fonts | Lucide (CDN), Google Fonts (Outfit) |
| Avatars | DiceBear API |

---

## Default Login Credentials

The seeded database ships with 50 fake employees. All users share the same password.

- **Password:** `password123`

| Role | How to log in |
|---|---|
| **General Manager (GM)** | Employee ID `1` |
| **HR Manager / Recruiter** | Any employee with role "HR Manager" or "Recruiter" (try IDs 2-10) |
| **Employee** | Any other employee ID (try 11-50) |

---

## Local Setup (Windows)

```powershell
# 1. Clone the repo
git clone https://github.com/anurags05/hr-manament-system.git
cd hr-manament-system

# 2. Run the setup script (creates venv, installs deps)
.\setup_backend.bat

# 3. (Optional) Reset and re-seed the database
python setup_db.py
python seed_db.py

# 4. Start the Flask backend
python app.py

# 5. Open the frontend
# Option A: Open index.html directly in your browser (file://)
# Option B: Serve via VS Code Live Server on port 5500
```

The backend listens on `http://127.0.0.1:5000` by default. The frontend expects the API at `/api` (relative), so opening `index.html` through Flask itself (`http://127.0.0.1:5000/`) avoids CORS issues entirely.

---

## Deploying to Render (Blueprint)

This repo includes a `render.yaml` that provisions the service in one click.

### One-time setup

1. Push the repo to GitHub (default branch: `main`).
2. Go to [dashboard.render.com](https://dashboard.render.com) and sign in.
3. Click **New +** → **Blueprint**.
4. Connect the `hr-manament-system` repo.
5. Render detects `render.yaml` automatically. Review the settings:
   - **Name:** `hr-management-system` (or change to something unique if taken)
   - **Plan:** Free
   - **Build Command:** `pip install --upgrade pip && pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120`
6. Click **Apply**. Render will:
   - Generate a secure `SECRET_KEY` automatically.
   - Install dependencies (~3-5 min first build).
   - Start the service on `https://hr-management-system.onrender.com`.

### Subsequent deploys

Every push to `main` triggers an automatic redeploy (`autoDeploy: true` in `render.yaml`).

### Caveats

- **Ephemeral filesystem** on the free tier: any data added through the UI (new employees, leave requests, attendance, payroll) is lost on redeploy. The seeded `database.db` committed to the repo is restored on each build.
- **Cold starts**: the free tier sleeps after 15 min of inactivity.

---

## Environment Variables

| Variable | Required | Purpose | Default |
|---|---|---|---|
| `SECRET_KEY` | Yes (prod) | Flask session signing | Insecure dev fallback |
| `FLASK_ENV` | No | Set to `production` to enable secure cookies + disable debug | `development` |
| `PORT` | No | Local dev port | `5000` |
| `CORS_ORIGINS` | No | Comma-separated cross-origin allowlist | Local dev origins |

See `.env.example` for the full template. For local development, copy it to `.env`.

---

## Project Structure

```
.
├── app.py                  # Flask entry point; serves API + static frontend
├── routes.py               # All /api/* endpoints
├── db_utils.py             # SQLite connection helpers
├── setup_db.py             # Creates empty DB schema
├── seed_db.py              # Populates DB with 50 employees + fake data
├── requirements.txt        # Python dependencies (incl. gunicorn)
├── runtime.txt             # Pins Python 3.13.0 for Render
├── render.yaml             # Render Blueprint service definition
├── .env.example            # Environment variable template
├── index.html              # Frontend entry point
├── assets/
│   ├── css/styles.css      # Frontend styles
│   └── js/app.js           # Frontend SPA logic (2148 lines)
├── database.db             # Seeded SQLite database (committed to git)
├── setup_backend.bat       # Windows setup script
├── test_api.py             # API tests
└── venv/                   # Python virtualenv (gitignored)
```

---

## API Endpoints

All endpoints are prefixed with `/api/`. All routes (except `/api/auth/login`) require a valid session cookie.

| Method | Endpoint | Auth | Role | Purpose |
|---|---|---|---|---|
| POST | `/api/auth/login` | None | — | Login |
| POST | `/api/auth/logout` | Session | — | Logout |
| GET | `/api/auth/me` | Session | — | Get current user |
| GET | `/api/stats` | Session | — | Dashboard statistics |
| GET | `/api/employees` | Session | hr | List employees |
| POST | `/api/employees` | Session | hr | Add employee |
| PUT | `/api/employees/<id>` | Session | hr | Update employee |
| DELETE | `/api/employees/<id>` | Session | hr | Delete employee |
| GET | `/api/leaves` | Session | — | List leaves |
| POST | `/api/leaves` | Session | — | Request leave |
| PUT | `/api/leaves/<id>/status` | Session | hr | Approve/reject leave |
| GET | `/api/attendance` | Session | — | List attendance |
| POST | `/api/attendance/clock-in` | Session | employee/gm/hr | Clock in |
| POST | `/api/attendance/clock-out` | Session | employee/gm/hr | Clock out |
| GET | `/api/payroll` | Session | — | List payroll |
| POST | `/api/payroll/generate` | Session | hr | Generate payroll |

---

## Development Notes

- The frontend's `API_BASE_URL` is defined at the top of `assets/js/app.js` and uses a relative path (`/api`), so it works in both local dev and production without configuration.
- The SQLite database file is committed to the repo so the app is immediately usable after a fresh clone. The `.gitignore` keeps it uncommented on purpose.
- For local dev with `debug=True`, the Flask server auto-reloads on code changes. The default CORS allowlist permits common local dev origins (`127.0.0.1:5500`, `127.0.0.1:8000`, `127.0.0.1:5000`).

---

## License

Internal SEPM project. All rights reserved.
