import sqlite3
from faker import Faker
import random
import bcrypt
from datetime import datetime, timedelta

fake = Faker()

def seed_database():
    connection = sqlite3.connect('database.db')
    cursor = connection.cursor()

    # Clear existing data
    cursor.execute('DELETE FROM employees')
    cursor.execute('DELETE FROM leaves')
    cursor.execute('DELETE FROM attendance')
    cursor.execute('DELETE FROM payroll')
    cursor.execute('DELETE FROM users')

    # Reset autoincrement counters so IDs start from 1
    cursor.execute('DELETE FROM sqlite_sequence WHERE name="employees"')
    cursor.execute('DELETE FROM sqlite_sequence WHERE name="leaves"')
    cursor.execute('DELETE FROM sqlite_sequence WHERE name="attendance"')
    cursor.execute('DELETE FROM sqlite_sequence WHERE name="payroll"')
    cursor.execute('DELETE FROM sqlite_sequence WHERE name="users"')

    employees = []

    # Define roles and departments as paired mappings
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
    gm_role = 'HR Manager'

    # Create 50 dummy employees
    for i in range(50):
        name = fake.name()
        role, department = random.choice(role_department_pairs)
        contact = fake.phone_number()
        date_joined = fake.date_between(start_date='-5y', end_date='today')
        status = 'Active'

        cursor.execute('''
            INSERT INTO employees (name, role, department, contact, date_joined, status)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (name, role, department, contact, date_joined, status))
        employees.append(cursor.lastrowid)

    print(f"Seeded {len(employees)} employees.")

    # Seed users table with RBAC roles
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

    # Seed Leaves
    for emp_id in employees:
        if random.choice([True, False]):
            for _ in range(random.randint(1, 3)):
                leave_type = random.choice(['Sick Leave', 'Casual Leave', 'Annual Leave'])
                start_date = fake.date_between(start_date='-1y', end_date='today')
                end_date = start_date + timedelta(days=random.randint(1, 5))
                reason = fake.sentence()
                status = random.choice(['Approved', 'Pending', 'Rejected'])

                cursor.execute('''
                    INSERT INTO leaves (employee_id, leave_type, start_date, end_date, reason, status)
                    VALUES (?, ?, ?, ?, ?, ?)
                ''', (emp_id, leave_type, start_date, end_date, reason, status))

    print("Seeded leave records.")

    # Seed Attendance for the last 7 days
    today = datetime.now().date()
    for i in range(7):
        date = today - timedelta(days=i)
        for emp_id in employees:
            if random.random() > 0.1:
                clock_in = datetime.combine(date, datetime.strptime('09:00', '%H:%M').time()) + timedelta(minutes=random.randint(-30, 30))
                clock_out = datetime.combine(date, datetime.strptime('17:00', '%H:%M').time()) + timedelta(minutes=random.randint(-30, 30))

                cursor.execute('''
                    INSERT INTO attendance (employee_id, date, clock_in_time, clock_out_time)
                    VALUES (?, ?, ?, ?)
                ''', (emp_id, date, clock_in, clock_out))

    print("Seeded attendance records.")

    # Seed Payroll for current month
    current_month = today.strftime('%Y-%m')
    for emp_id in employees:
        basic_salary = round(random.uniform(3000, 8000), 2)
        bonus = round(random.uniform(0, 1000), 2)
        deductions = round(random.uniform(0, 500), 2)
        net_pay = basic_salary + bonus - deductions

        cursor.execute('''
            INSERT INTO payroll (employee_id, month, basic_salary, bonus, deductions, net_pay)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (emp_id, current_month, basic_salary, bonus, deductions, net_pay))

    print("Seeded payroll records.")

    connection.commit()
    connection.close()
    print("Database seeded successfully.")
    print(f"Default password for all users: {default_password}")

if __name__ == '__main__':
    seed_database()
