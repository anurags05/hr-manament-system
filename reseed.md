# Database Reseed Implementation Plan

## Overview
Rewrite `seed_db.py` to be fully self-contained (Option B) — handles both schema creation and data population in a single script using raw sqlite3. This eliminates the need to run `setup_db.py` separately.

---

## Schema Changes

### `setup_db.py` — Update existing schema definitions

#### 1. `attendance` table
- **Add:** `hours_worked REAL` column
- **Purpose:** Store calculated work hours (clock_out - clock_in) for each attendance record

```sql
CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    date DATE DEFAULT (DATE('now')),
    clock_in_time DATETIME,
    clock_out_time DATETIME,
    hours_worked REAL,
    FOREIGN KEY (employee_id) REFERENCES employees (id)
)
```

#### 2. `payroll` table
- **Add:** `week_number INTEGER` column (1-4, identifies which week of the month)
- **Add:** `bank_name TEXT` column (bank name for salary crediting)

```sql
CREATE TABLE IF NOT EXISTS payroll (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL,
    month TEXT NOT NULL,
    week_number INTEGER,
    basic_salary REAL NOT NULL,
    bonus REAL DEFAULT 0.0,
    deductions REAL DEFAULT 0.0,
    net_pay REAL NOT NULL,
    bank_name TEXT,
    FOREIGN KEY (employee_id) REFERENCES employees (id)
)
```

---

### `seed_db.py` — Make self-contained with raw sqlite3

#### Schema Creation (new)
- Drop all existing tables (`DROP TABLE IF EXISTS`)
- Recreate all 5 tables with updated schema (including new columns above)
- Order: users -> leaves -> attendance -> payroll -> employees (reverse FK order for drops, forward for creates)

#### Data Population Changes

##### 1. Phone Numbers — Indian Format
- **Before:** `fake.phone_number()` (random international format)
- **After:** `+91 {random 10-digit number}`
- **Format:** `+91 98765 43210` style
- **Implementation:** `f"+91 {random.randint(6000000000, 9999999999)}"`

##### 2. Leave Reasons — Realistic Strings
- **Before:** `fake.sentence()` (random word salad)
- **After:** Predefined array of 15+ realistic reasons:
  - "Medical appointment and health checkup"
  - "Family function and ceremony"
  - "Personal work at government office"
  - "Festival celebration"
  - "Health recovery and rest"
  - "Child's school event"
  - "Home maintenance and repair work"
  - "Wedding attendance"
  - "Travel and vacation"
  - "Dental appointment"
  - "Bank work and financial errands"
  - "Religious ceremony"
  - "Emergency personal matter"
  - "Moving house"
  - "Parent-teacher meeting"

##### 3. Attendance — 3 Months of Data
- **Before:** Last 7 days only
- **After:** Last 90 days (3 months)
- **Structure:** One clock-in/clock-out pair per employee per day
- **Absence rate:** 10% random absence (unchanged)
- **Hours calculation:** `hours_worked = (clock_out - clock_in).total_seconds() / 3600`
- **Clock times:** 9:00 AM +- 30 min, 5:00 PM +- 30 min (unchanged)

##### 4. Leaves — 1 Year Span
- **Before:** `-1y` to `today` (already correct range, but low density)
- **After:** Ensure leaves are distributed across the full 12-month period
- **Increase density:** Some employees get 2-5 leaves spread across the year

##### 5. Payslips — Weekly, 12 Months
- **Before:** 1 payslip per employee for current month only
- **After:** 4 payslips per employee per month x 12 months = ~48 payslips per employee
- **Structure:**
  - `week_number`: 1, 2, 3, 4 (identifies week within month)
  - `month`: `YYYY-MM` format
  - Each week has slightly varied `basic_salary`, `bonus`, `deductions`
  - `bank_name`: Randomly assigned from common Indian banks
- **Bank names pool:**
  - "State Bank of India"
  - "HDFC Bank"
  - "ICICI Bank"
  - "Axis Bank"
  - "Punjab National Bank"
  - "Bank of Baroda"
  - "Kotak Mahindra Bank"
  - "Yes Bank"

---

## Files to Modify

| File | Changes |
|------|---------|
| `setup_db.py` | Add `hours_worked` to attendance, `week_number` + `bank_name` to payroll |
| `seed_db.py` | Make self-contained (drop/create tables), add `--force` flag, update all 5 data population areas |

---

## Execution Flow

```
1. Run: python seed_db.py
   |-- Drops all existing tables
   |-- Creates fresh schema with new columns
   |-- Seeds 50 employees with Indian phone numbers
   |-- Seeds users with RBAC roles
   |-- Seeds 1 year of leaves with realistic reasons
   |-- Seeds 3 months of attendance with hours_worked
   +-- Seeds 12 months x 4 weeks of payslips with bank_name
```

---

## Expected Data Volume

| Table | Records |
|-------|---------|
| employees | 50 |
| users | 50 |
| leaves | ~100-150 (spread across 1 year) |
| attendance | ~4,050 (50 employees x 90 days x 90% attendance) |
| payroll | ~2,400 (50 employees x 12 months x 4 weeks) |

---

## Default Credentials
- **Password:** `test` (all users)
- **GM:** Employee ID 1 (first seeded employee, HR Manager role)
- **HR:** All employees with HR Manager or Recruiter roles
- **Employee:** All others

---

## Proposed Improvements

### 1. Clarify `week_number` Calculation Logic
The plan specifies `week_number: 1, 2, 3, 4` but does not define how weeks map to calendar dates.

**Proposed formula:** `week_number = min((day_of_month - 1) // 7 + 1, 4)`
- Days 1-7 -> Week 1
- Days 8-14 -> Week 2
- Days 15-21 -> Week 3
- Days 22-28 -> Week 4
- Days 29-31 -> Week 4 (capped to last week)

**Implementation in `seed_db.py`:**
```python
for month_offset in range(12):
    target_month = today.replace(month=today.month - month_offset) if today.month > month_offset else today.replace(year=today.year - 1, month=today.month + 12 - month_offset)
    month_str = target_month.strftime('%Y-%m')
    for week_num in range(1, 5):
        # Generate one payslip per week
```

---

### 2. Add `--force` Flag to `seed_db.py`
The script uses `DROP TABLE IF EXISTS` which is **destructive** — all existing data is permanently lost. To prevent accidental data loss in shared/dev environments:

**Proposed behavior:**
- Default (no flag): Prompt user for confirmation before dropping tables
- `--force` flag: Skip confirmation, proceed immediately
- `--dry-run` flag (optional): Show what would be done without executing

```python
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--force', action='store_true', help='Skip confirmation prompt')
args = parser.parse_args()

if not args.force:
    confirm = input("This will DROP ALL TABLES and reseed. Continue? (y/N): ")
    if confirm.lower() != 'y':
        print("Aborted.")
        exit()
```

---

### 3. Frontend Pagination Warning
~2,400 payroll records and ~4,050 attendance records will be seeded. If the frontend loads these without pagination or date filtering, performance will degrade.

**Recommendation:** Ensure the following API endpoints support filtering:
- `GET /api/payroll?employee_id=X&month=YYYY-MM`
- `GET /api/attendance?employee_id=X&from=YYYY-MM-DD&to=YYYY-MM-DD`

Verify `routes.py` already supports these query parameters, or add them as part of this change.

---

### 4. `hours_worked` Null Safety
The plan correctly states `hours_worked = (clock_out - clock_in).total_seconds() / 3600`. Since absent days produce no attendance record, `hours_worked` will only be set when both `clock_in_time` and `clock_out_time` exist. No additional null handling needed — but confirm the frontend/API handles `hours_worked: null` gracefully if a partial record exists (clock_in but no clock_out).
