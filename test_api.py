import requests
import time
import subprocess
import sys

def test_endpoints():
    # Start the Flask app in a separate process
    process = subprocess.Popen([sys.executable, 'app.py'], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    
    print("Starting Flask app...")
    time.sleep(5) # Wait for app to start

    try:
        base_url = 'http://127.0.0.1:5000/api'
        
        # Test GET /employees
        response = requests.get(f'{base_url}/employees')
        if response.status_code == 200:
            print("GET /employees: SUCCESS")
            print(f"Count: {len(response.json())}")
        else:
            print(f"GET /employees: FAILED ({response.status_code})")
            print(response.text)

        # Test GET /leaves
        response = requests.get(f'{base_url}/leaves')
        if response.status_code == 200:
            print("GET /leaves: SUCCESS")
        else:
            print(f"GET /leaves: FAILED ({response.status_code})")

    except Exception as e:
        print(f"An error occurred: {e}")
    finally:
        process.terminate()
        print("Flask app stopped.")

if __name__ == '__main__':
    test_endpoints()
