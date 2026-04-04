import sqlite3
from faker import Faker
import random
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

    employees = []
    
    # Create 10 dummy employees
    for _ in range(10):
        name = fake.name()
        role = random.choice(['Developer', 'Manager', 'Analyst', 'HR', 'Designer'])
        department = random.choice(['IT', 'Sales', 'HR', 'Marketing', 'Finance'])
        contact = fake.phone_number()
        date_joined = fake.date_between(start_date='-2y', end_date='today')
        status = 'Active'

        cursor.execute('''
            INSERT INTO employees (name, role, department, contact, date_joined, status)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (name, role, department, contact, date_joined, status))
        employees.append(cursor.lastrowid)

    print(f"Seeded {len(employees)} employees.")

    # Seed Leaves
    for emp_id in employees:
        if random.choice([True, False]): # 50% chance of having leave records
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
            if random.random() > 0.1: # 90% attendance rate
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

if __name__ == '__main__':
    seed_database()
