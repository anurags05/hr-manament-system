import sqlite3

def create_tables():
    connection = sqlite3.connect('database.db')
    cursor = connection.cursor()

    # Create Employees Table
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

    # Create Leaves Table
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

    # Create Attendance Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            date DATE DEFAULT (DATE('now')),
            clock_in_time DATETIME,
            clock_out_time DATETIME,
            FOREIGN KEY (employee_id) REFERENCES employees (id)
        )
    ''')

    # Create Payroll Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS payroll (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            employee_id INTEGER NOT NULL,
            month TEXT NOT NULL,
            basic_salary REAL NOT NULL,
            bonus REAL DEFAULT 0.0,
            deductions REAL DEFAULT 0.0,
            net_pay REAL NOT NULL,
            FOREIGN KEY (employee_id) REFERENCES employees (id)
        )
    ''')

    # Create Users Table (for RBAC authentication)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            emp_id INTEGER NOT NULL UNIQUE,
            pass_hash TEXT NOT NULL,
            role TEXT NOT NULL CHECK(role IN ('employee', 'hr', 'gm')),
            FOREIGN KEY (emp_id) REFERENCES employees (id)
        )
    ''')

    connection.commit()
    connection.close()
    print("Database initialized and tables created successfully.")

if __name__ == '__main__':
    create_tables()
