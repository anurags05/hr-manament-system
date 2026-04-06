# SQLAlchemy Dead Code Removal Guide

## Background
This project uses raw `sqlite3` exclusively (via `db_utils.py`, `setup_db.py`, `seed_db.py`, `routes.py`). SQLAlchemy and `models.py` are **never imported or used** anywhere in the application. They are dead code.

## Verification (Before You Start)
Run these commands to confirm nothing references SQLAlchemy.

**ripgrep (recommended):**
```cmd
rg "from models import"
rg "import models"
rg "db\.session"
rg "db\.create_all"
rg "db\.drop_all"
rg "flask_sqlalchemy"
```

All should return nothing — confirming no references exist.

---

## Step-by-Step Removal

### Step 1: Delete `models.py`
```cmd
del models.py
```

This file is never imported. Safe to delete.

### Step 2: Remove 3 lines from `requirements.txt`
Open `requirements.txt` and delete these exact lines:

```
Flask-SQLAlchemy==3.1.1
greenlet==3.3.1
SQLAlchemy==2.0.46
```

These are on lines 8, 9, and 26 respectively.

### Step 3: Verify no other files import from models
```cmd
rg "models"
```

If any results appear in `app.py`, `routes.py`, or other active files, remove those import lines.

### Step 4: Uninstall from local environment (optional cleanup)
```cmd
pip uninstall Flask-SQLAlchemy SQLAlchemy greenlet
```

### Step 5: Commit and push to remote
```cmd
git rm models.py
git add requirements.txt
git commit -m "remove dead sqlalchemy and models.py - project uses raw sqlite3"
git push
```

---

## What This Removes
| Item | Action |
|------|--------|
| `models.py` | Delete file |
| `Flask-SQLAlchemy==3.1.1` | Remove from requirements.txt line 8 |
| `greenlet==3.3.1` | Remove from requirements.txt line 9 |
| `SQLAlchemy==2.0.46` | Remove from requirements.txt line 26 |
| Local packages | `pip uninstall Flask-SQLAlchemy SQLAlchemy greenlet` |
| Git history | Commit deletion (history preserved, file removed from HEAD) |

## What This Does NOT Affect
- `db_utils.py` — uses raw sqlite3, untouched
- `setup_db.py` — uses raw sqlite3, untouched
- `seed_db.py` — uses raw sqlite3, untouched
- `routes.py` — uses raw sqlite3 via db_utils, untouched
- `app.py` — imports db_utils, not models, untouched
- `database.db` — SQLite database file, untouched

## Post-Removal Verification
After committing, verify the app still works:
```cmd
python app.py
```
The app should start normally — it never depended on SQLAlchemy.
