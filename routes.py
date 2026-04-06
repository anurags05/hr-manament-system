from functools import wraps
from flask import request, jsonify, session
from app import app
from db_utils import get_db, query_db
from datetime import datetime
import bcrypt

# --- Auth Middleware Decorators ---

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not session.get('logged_in'):
            return jsonify({'error': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated

def role_required(*allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if session.get('role') not in allowed_roles:
                return jsonify({'error': 'Forbidden'}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator

# --- Auth Routes ---

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    if not all(k in data for k in ('emp_id', 'password')):
        return jsonify({'error': 'Missing emp_id or password'}), 400

    emp_id = data['emp_id']
    password = data['password']

    user = query_db('SELECT * FROM users WHERE emp_id = ?', [emp_id], one=True)
    if not user:
        return jsonify({'error': 'Invalid credentials'}), 401

    if not bcrypt.checkpw(password.encode('utf-8'), user['pass_hash'].encode('utf-8')):
        return jsonify({'error': 'Invalid credentials'}), 401

    employee = query_db('SELECT * FROM employees WHERE id = ?', [emp_id], one=True)
    if not employee:
        return jsonify({'error': 'Employee record not found'}), 401

    session['logged_in'] = True
    session['emp_id'] = emp_id
    session['role'] = user['role']

    return jsonify({
        'id': emp_id,
        'name': employee['name'],
        'role': user['role'],
        'emp_role': employee['role'],
        'department': employee['department']
    }), 200

@app.route('/api/auth/logout', methods=['POST'])
@login_required
def logout():
    session.clear()
    return jsonify({'message': 'Logged out successfully'}), 200

@app.route('/api/auth/me', methods=['GET'])
@login_required
def get_me():
    emp_id = session['emp_id']
    employee = query_db('SELECT * FROM employees WHERE id = ?', [emp_id], one=True)
    if not employee:
        session.clear()
        return jsonify({'error': 'Employee record not found'}), 401

    return jsonify({
        'id': emp_id,
        'name': employee['name'],
        'role': session['role'],
        'emp_role': employee['role'],
        'department': employee['department']
    }), 200

@app.route('/api/stats', methods=['GET'])
@login_required
def get_stats():
    user_role = session['role']
    emp_id = session['emp_id']

    if user_role == 'hr':
        total_employees = query_db('SELECT COUNT(*) as count FROM employees', one=True)['count']
        active_leaves = query_db("SELECT COUNT(*) as count FROM leaves WHERE status = 'Approved'", one=True)['count']
        today = query_db("SELECT COUNT(*) as count FROM attendance WHERE date = DATE('now')", one=True)['count']
        on_time = query_db("SELECT COUNT(*) as count FROM attendance WHERE date = DATE('now') AND clock_in_time <= '09:30:00'", one=True)['count']
    else:
        # Non-HR users only see their own stats
        total_employees = query_db('SELECT COUNT(*) as count FROM employees WHERE status != ?', ('Terminated',), one=True)['count']
        active_leaves = query_db("SELECT COUNT(*) as count FROM leaves WHERE employee_id = ? AND status = 'Approved'", [emp_id], one=True)['count']
        today = query_db("SELECT COUNT(*) as count FROM attendance WHERE employee_id = ? AND date = DATE('now')", [emp_id], one=True)['count']
        on_time = query_db("SELECT COUNT(*) as count FROM attendance WHERE employee_id = ? AND date = DATE('now') AND clock_in_time <= '09:30:00'", [emp_id], one=True)['count']

    return jsonify({
        'total_employees': total_employees,
        'active_leaves': active_leaves,
        'present_today': today,
        'on_time': on_time
    }), 200

# --- Employee Routes ---

@app.route('/api/employees', methods=['GET'])
@login_required
@role_required('hr')
def get_employees():
    employees = query_db('SELECT * FROM employees')
    return jsonify([dict(e) for e in employees])

@app.route('/api/employees', methods=['POST'])
@login_required
@role_required('hr')
def add_employee():
    data = request.json
    if not all(k in data for k in ('name', 'role', 'department')):
        return jsonify({'error': 'Missing required fields'}), 400

    name = data['name']
    role = data['role']
    department = data['department']
    contact = data.get('contact', '')
    status = data.get('status', 'Active')
    date_joined = datetime.utcnow().date()

    db = get_db()
    cursor = db.execute('''
        INSERT INTO employees (name, role, department, contact, date_joined, status)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (name, role, department, contact, date_joined, status))
    db.commit()

    new_id = cursor.lastrowid
    new_employee = query_db('SELECT * FROM employees WHERE id = ?', [new_id], one=True)

    return jsonify(dict(new_employee)), 201

@app.route('/api/employees/<int:id>', methods=['PUT'])
@login_required
@role_required('hr')
def update_employee(id):
    data = request.json
    db = get_db()

    fields = []
    values = []

    if 'name' in data:
        fields.append('name = ?')
        values.append(data['name'])
    if 'role' in data:
        fields.append('role = ?')
        values.append(data['role'])
    if 'department' in data:
        fields.append('department = ?')
        values.append(data['department'])
    if 'contact' in data:
        fields.append('contact = ?')
        values.append(data['contact'])
    if 'status' in data:
        fields.append('status = ?')
        values.append(data['status'])

    if not fields:
        return jsonify({'error': 'No fields to update'}), 400

    values.append(id)
    query = f"UPDATE employees SET {', '.join(fields)} WHERE id = ?"
    result = db.execute(query, values)
    db.commit()

    if result.rowcount == 0:
        return jsonify({'error': 'Employee not found'}), 404

    updated_employee = query_db('SELECT * FROM employees WHERE id = ?', [id], one=True)
    return jsonify(dict(updated_employee)), 200

@app.route('/api/employees/<int:id>', methods=['DELETE'])
@login_required
@role_required('hr')
def delete_employee(id):
    db = get_db()
    result = db.execute('DELETE FROM employees WHERE id = ?', [id])
    db.commit()

    if result.rowcount == 0:
        return jsonify({'error': 'Employee not found'}), 404

    return jsonify({'message': 'Employee deleted'}), 200

# --- Leave Routes ---

@app.route('/api/leaves', methods=['GET'])
@login_required
def get_leaves():
    user_role = session['role']
    emp_id = session['emp_id']

    if user_role == 'hr':
        leaves = query_db('''
            SELECT l.*, e.name as employee_name
            FROM leaves l
            LEFT JOIN employees e ON l.employee_id = e.id
        ''')
    else:
        leaves = query_db('''
            SELECT l.*, e.name as employee_name
            FROM leaves l
            LEFT JOIN employees e ON l.employee_id = e.id
            WHERE l.employee_id = ?
        ''', [emp_id])

    return jsonify([dict(l) for l in leaves])

@app.route('/api/leaves', methods=['POST'])
@login_required
def request_leave():
    data = request.json
    user_role = session['role']
    emp_id = session['emp_id']

    try:
        leave_type = data['leave_type']
        start_date = data['start_date']
        end_date = data['end_date']
        reason = data.get('reason', '')

        if user_role == 'hr':
            employee_id = data.get('employee_id', emp_id)
            status = 'Approved'
        else:
            employee_id = emp_id
            status = 'Pending'

        if query_db('SELECT id FROM employees WHERE id = ?', [employee_id], one=True) is None:
            return jsonify({'error': 'Employee not found'}), 404

        db = get_db()
        cursor = db.execute('''
            INSERT INTO leaves (employee_id, leave_type, start_date, end_date, reason, status)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (employee_id, leave_type, start_date, end_date, reason, status))
        db.commit()

        new_id = cursor.lastrowid
        new_leave = query_db('SELECT * FROM leaves WHERE id = ?', [new_id], one=True)
        return jsonify(dict(new_leave)), 201

    except KeyError as e:
        return jsonify({'error': f'Missing field: {str(e)}'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/leaves/<int:id>/status', methods=['PUT'])
@login_required
@role_required('hr')
def update_leave_status(id):
    data = request.json
    if 'status' not in data:
        return jsonify({'error': 'Status not provided'}), 400

    status = data['status']
    db = get_db()
    result = db.execute('UPDATE leaves SET status = ? WHERE id = ?', (status, id))
    db.commit()

    if result.rowcount == 0:
        return jsonify({'error': 'Leave request not found'}), 404

    updated_leave = query_db('SELECT * FROM leaves WHERE id = ?', [id], one=True)
    return jsonify(dict(updated_leave)), 200

# --- Attendance Routes ---

@app.route('/api/attendance', methods=['GET'])
@login_required
def get_attendance():
    user_role = session['role']
    emp_id = session['emp_id']

    if user_role == 'hr':
        attendance = query_db('''
            SELECT a.*, e.name as employee_name
            FROM attendance a
            LEFT JOIN employees e ON a.employee_id = e.id
            ORDER BY a.date DESC
        ''')
    else:
        attendance = query_db('''
            SELECT a.*, e.name as employee_name
            FROM attendance a
            LEFT JOIN employees e ON a.employee_id = e.id
            WHERE a.employee_id = ?
            ORDER BY a.date DESC
        ''', [emp_id])

    return jsonify([dict(a) for a in attendance])

@app.route('/api/attendance/clock-in', methods=['POST'])
@login_required
@role_required('employee', 'gm', 'hr')
def clock_in():
    employee_id = session['emp_id']
    date = datetime.utcnow().date()
    clock_in_time = datetime.utcnow()

    db = get_db()
    cursor = db.execute('''
        INSERT INTO attendance (employee_id, date, clock_in_time)
        VALUES (?, ?, ?)
    ''', (employee_id, date, clock_in_time))
    db.commit()

    new_id = cursor.lastrowid
    new_attendance = query_db('SELECT * FROM attendance WHERE id = ?', [new_id], one=True)
    return jsonify(dict(new_attendance)), 201

@app.route('/api/attendance/clock-out', methods=['POST'])
@login_required
@role_required('employee', 'gm', 'hr')
def clock_out():
    employee_id = session['emp_id']
    today = datetime.utcnow().date()
    clock_out_time = datetime.utcnow()

    attendance = query_db('SELECT * FROM attendance WHERE employee_id = ? AND date = ? AND clock_out_time IS NULL',
                          (employee_id, today), one=True)

    if attendance:
        db = get_db()
        db.execute('UPDATE attendance SET clock_out_time = ? WHERE id = ?', (clock_out_time, attendance['id']))
        db.commit()

        updated_attendance = query_db('SELECT * FROM attendance WHERE id = ?', [attendance['id']], one=True)
        return jsonify(dict(updated_attendance)), 200
    else:
        return jsonify({'error': 'No active clock-in record found for today'}), 404

# --- Payroll Routes ---

@app.route('/api/payroll', methods=['GET'])
@login_required
def get_payroll():
    user_role = session['role']
    emp_id = session['emp_id']

    if user_role == 'hr':
        payrolls = query_db('''
            SELECT p.*, e.name as employee_name, e.role as employee_role
            FROM payroll p
            LEFT JOIN employees e ON p.employee_id = e.id
        ''')
    else:
        payrolls = query_db('''
            SELECT p.*, e.name as employee_name, e.role as employee_role
            FROM payroll p
            LEFT JOIN employees e ON p.employee_id = e.id
            WHERE p.employee_id = ?
        ''', [emp_id])

    return jsonify([dict(p) for p in payrolls])

@app.route('/api/payroll/generate', methods=['POST'])
@login_required
@role_required('hr')
def generate_payroll():
    data = request.json
    employee_id = data['employee_id']
    month = data['month']
    basic_salary = data['basic_salary']
    bonus = data.get('bonus', 0.0)
    deductions = data.get('deductions', 0.0)
    net_pay = basic_salary + bonus - deductions

    if query_db('SELECT id FROM employees WHERE id = ?', [employee_id], one=True) is None:
        return jsonify({'error': 'Employee not found'}), 404

    db = get_db()
    cursor = db.execute('''
        INSERT INTO payroll (employee_id, month, basic_salary, bonus, deductions, net_pay)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (employee_id, month, basic_salary, bonus, deductions, net_pay))
    db.commit()

    new_id = cursor.lastrowid
    new_payroll = query_db('SELECT * FROM payroll WHERE id = ?', [new_id], one=True)
    return jsonify(dict(new_payroll)), 201
