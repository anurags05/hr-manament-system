import requests
import json

BASE_URL = 'http://127.0.0.1:5000/api'

def print_separator(title):
    print(f"\n{'='*20} {title} {'='*20}")

def test_add_employee():
    print_separator("Testing: Add Employee")
    payload = {
        "name": "John Doe",
        "role": "Software Engineer",
        "department": "IT",
        "contact": "john@example.com"
    }
    try:
        response = requests.post(f"{BASE_URL}/employees", json=payload)
        print(f"Status Code: {response.status_code}")
        print("Response:", json.dumps(response.json(), indent=2))
        return response.json().get('id')
    except requests.exceptions.ConnectionError:
        print("ERROR: Could not connect to server. Make sure 'python app.py' is running!")
        return None

def test_get_employees():
    print_separator("Testing: Get All Employees")
    response = requests.get(f"{BASE_URL}/employees")
    print(f"Status Code: {response.status_code}")
    print("Response:", json.dumps(response.json(), indent=2))

def test_request_leave(employee_id):
    if not employee_id:
        print("Skipping Leave Test (No Employee ID)")
        return

    print_separator("Testing: Request Leave")
    payload = {
        "employee_id": employee_id,
        "leave_type": "Sick Leave",
        "start_date": "2023-10-25",
        "end_date": "2023-10-26",
        "reason": "Not feeling well"
    }
    response = requests.post(f"{BASE_URL}/leaves", json=payload)
    print(f"Status Code: {response.status_code}")
    print("Response:", json.dumps(response.json(), indent=2))

if __name__ == "__main__":
    print("Starting Manual Backend Test...")
    print("Ensure your Flask server is running in another terminal!")
    
    emp_id = test_add_employee()
    test_get_employees()
    test_request_leave(emp_id)
