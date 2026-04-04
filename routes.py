from flask import request, jsonify
from app import app
from db_utils import get_db, query_db
from datetime import datetime

# --- Employee Routes ---
@app.route('/api/employees', methods=['GET'])
def get_employees():
    employees = query_db('SELECT * FROM employees')
    return jsonify([dict(e) for e in employees])

@app.route('/api/employees', methods=['POST'])
def add_employee():
    data = request.json
    # Basic validation
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
def update_employee(id):
    data = request.json
    db = get_db()
    
    # Build dynamic UPDATE query
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
def delete_employee(id):
    db = get_db()
    result = db.execute('DELETE FROM employees WHERE id = ?', [id])
    db.commit()
    
    if result.rowcount == 0:
        return jsonify({'error': 'Employee not found'}), 404
        
    return jsonify({'message': 'Employee deleted'}), 200

# --- Leave Routes ---
@app.route('/api/leaves', methods=['GET'])
def get_leaves():
    # Join with employees to get employee name
    leaves = query_db('''
        SELECT l.*, e.name as employee_name
        FROM leaves l
        LEFT JOIN employees e ON l.employee_id = e.id
    ''')
    return jsonify([dict(l) for l in leaves])

@app.route('/api/leaves', methods=['POST'])
def request_leave():
    data = request.json
    try:
        employee_id = data['employee_id']
        leave_type = data['leave_type']
        start_date = data['start_date'] # Assumes YYYY-MM-DD format
        end_date = data['end_date']     # Assumes YYYY-MM-DD format
        reason = data.get('reason', '')
        status = 'Pending'

        # Verify employee exists
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
def get_attendance():
    attendance = query_db('SELECT * FROM attendance ORDER BY date DESC')
    return jsonify([dict(a) for a in attendance])

@app.route('/api/attendance/clock-in', methods=['POST'])
def clock_in():
    data = request.json
    employee_id = data['employee_id']
    date = datetime.utcnow().date()
    clock_in_time = datetime.utcnow()

    # Verify employee exists
    if query_db('SELECT id FROM employees WHERE id = ?', [employee_id], one=True) is None:
            return jsonify({'error': 'Employee not found'}), 404

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
def clock_out():
    data = request.json
    employee_id = data['employee_id']
    today = datetime.utcnow().date()
    clock_out_time = datetime.utcnow()

    # Find active clock-in for today (where clock_out_time is NULL)
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
def get_payroll():
    payrolls = query_db('SELECT * FROM payroll')
    return jsonify([dict(p) for p in payrolls])

@app.route('/api/payroll/generate', methods=['POST'])
def generate_payroll():
    data = request.json
    employee_id = data['employee_id']
    month = data['month']
    basic_salary = data['basic_salary']
    bonus = data.get('bonus', 0.0)
    deductions = data.get('deductions', 0.0)
    net_pay = basic_salary + bonus - deductions

    # Verify employee exists
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
