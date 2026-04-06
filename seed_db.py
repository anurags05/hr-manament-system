import sqlite3
import argparse
from faker import Faker
import random
import bcrypt
from datetime import datetime, timedelta

fake = Faker()

LEAVE_REASONS = [
    "Medical appointment and health checkup",
    "Family function and ceremony",
    "Personal work at government office",
    "Festival celebration",
    "Health recovery and rest",
    "Child's school event",
    "Home maintenance and repair work",
    "Wedding attendance",
    "Travel and vacation",
    "Dental appointment",
    "Bank work and financial errands",
    "Religious ceremony",
    "Emergency personal matter",
    "Moving house",
    "Parent-teacher meeting",
]

BANK_NAMES = [
    "State Bank of India",
    "HDFC Bank",
    "ICICI Bank",
    "Axis Bank",
    "Punjab National Bank",
    "Bank of Baroda",
    "Kotak Mahindra Bank",
    "Yes Bank",
]

def create_tables(cursor):
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS employees (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            role TEXT NOT NULL,
            department TEXT NOT NULL,
            contact TEXT,
            date_joined DATE DEFAULT (DATE('now')),
            status TEXT DEFAULT 'Active'
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            emp_id INTEGER NOT NULL UNIQUE,
            pass_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('employee', 'hr', 'gm')),
            FOREIGN KEY (emp_id) REFERENCES employees (id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS leaves (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            leave_type TEXT NOT NULL,
            start_date DATE NOT NULL,
            end_date DATE NOT NULL,
            reason TEXT,
            status TEXT DEFAULT 'Pending',
            FOREIGN KEY (employee_id) REFERENCES employees (id)
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            date DATE DEFAULT (DATE('now')),
            clock_in_time DATETIME,
            clock_out_time DATETIME,
            hours_worked REAL,
            FOREIGN KEY (employee_id) REFERENCES employees (id)
        )
    ''')

    cursor.execute('''
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
    ''')

def drop_tables(cursor):
    cursor.execute('DROP TABLE IF EXISTS payroll')
    cursor.execute('DROP TABLE IF EXISTS attendance')
    cursor.execute('DROP TABLE IF EXISTS leaves')
    cursor.execute('DROP TABLE IF EXISTS users')
    cursor.execute('DROP TABLE IF EXISTS employees')

def seed_database(force=False):
    connection = sqlite3.connect('database.db')
    cursor = connection.cursor()

    if not force:
        confirm = input("This will DROP ALL TABLES and reseed the database. Continue? (y/N): ")
        if confirm.lower() != 'y':
            print("Aborted.")
            connection.close()
            return

    drop_tables(cursor)
    create_tables(cursor)

    employees = []

    role_department_pairs = [
        ('Controller', 'Finance'),
        ('Accountant', 'Finance'),
        ('Account Manager', 'Sales & Marketing'),
        ('Contract Manager', 'Sales & Marketing'),
        ('Designer', 'IT/Engg'),
        ('Developer', 'IT/Engg'),
        ('HR Manager', 'HR'),
        ('Recruiter', 'HR'),
    ]

    hr_roles = ('HR Manager', 'Recruiter')

    for i in range(50):
        name = fake.name()
        role, department = random.choice(role_department_pairs)
        contact = f"+91 {random.randint(6000000000, 9999999999)}"
        date_joined = fake.date_between(start_date='-5y', end_date='today')
        status = 'Active'

        cursor.execute('''
            INSERT INTO employees (name, role, department, contact, date_joined, status)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (name, role, department, contact, date_joined, status))
        employees.append(cursor.lastrowid)

    print(f"Seeded {len(employees)} employees.")

    default_password = 'password123'
    password_hash = bcrypt.hashpw(default_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    for idx, emp_id in enumerate(employees):
        cursor.execute('SELECT role FROM employees WHERE id = ?', (emp_id,))
        job_role = cursor.fetchone()[0]

        if job_role in hr_roles:
            access_role = 'hr'
        elif idx == 0:
            access_role = 'gm'
        else:
            access_role = 'employee'

        cursor.execute('''
            INSERT INTO users (emp_id, pass_hash, role)
            VALUES (?, ?, ?)
        ''', (emp_id, password_hash, access_role))

    print(f"Seeded {len(employees)} users with RBAC roles.")

    for emp_id in employees:
        num_leaves = random.randint(24, 30)
        for _ in range(num_leaves):
            leave_type = random.choice(['Sick Leave', 'Casual Leave', 'Annual Leave'])
            start_date = fake.date_between(start_date='-1y', end_date='today')
            end_date = start_date + timedelta(days=random.randint(1, 5))
            reason = random.choice(LEAVE_REASONS)
            status = random.choice(['Approved', 'Pending', 'Rejected'])

            cursor.execute('''
                INSERT INTO leaves (employee_id, leave_type, start_date, end_date, reason, status)
                VALUES (?, ?, ?, ?, ?, ?)
            ''', (emp_id, leave_type, start_date, end_date, reason, status))

    print("Seeded leave records.")

    today = datetime.now().date()
    for i in range(90):
        date = today - timedelta(days=i)
        for emp_id in employees:
            if random.random() > 0.1:
                clock_in = datetime.combine(date, datetime.strptime('09:00', '%H:%M').time()) + timedelta(minutes=random.randint(-30, 30))
                clock_out = datetime.combine(date, datetime.strptime('17:00', '%H:%M').time()) + timedelta(minutes=random.randint(-30, 30))
                hours_worked = round((clock_out - clock_in).total_seconds() / 3600, 2)

                cursor.execute('''
                    INSERT INTO attendance (employee_id, date, clock_in_time, clock_out_time, hours_worked)
                    VALUES (?, ?, ?, ?, ?)
                ''', (emp_id, date, clock_in, clock_out, hours_worked))

    print("Seeded attendance records.")

    for month_offset in range(12):
        target_date = today - timedelta(days=30 * month_offset)
        month_str = target_date.strftime('%Y-%m')

        for emp_id in employees:
            base_salary = round(random.uniform(3000, 8000), 2)
            bank_name = random.choice(BANK_NAMES)

            for week_num in range(1, 5):
                bonus = round(random.uniform(0, 250), 2)
                deductions = round(random.uniform(0, 125), 2)
                net_pay = round(base_salary + bonus - deductions, 2)

                cursor.execute('''
                    INSERT INTO payroll (employee_id, month, week_number, basic_salary, bonus, deductions, net_pay, bank_name)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ''', (emp_id, month_str, week_num, base_salary, bonus, deductions, net_pay, bank_name))

    print("Seeded payroll records.")

    connection.commit()
    connection.close()
    print("Database seeded successfully.")
    print(f"Default password for all users: {default_password}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--force', action='store_true', help='Skip confirmation prompt')
    args = parser.parse_args()
    seed_database(force=args.force)
