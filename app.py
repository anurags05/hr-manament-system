import os
from flask import Flask
from flask_cors import CORS
import db_utils

app = Flask(__name__)
CORS(app, supports_credentials=True, origins=['http://127.0.0.1:5500', 'http://localhost:5500', 'http://127.0.0.1:8000', 'http://localhost:8000', 'null'])

# Session configuration for RBAC auth
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-prod')
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = False  # Set True in production with HTTPS

# Register database teardown context
@app.teardown_appcontext
def close_connection(exception):
    db_utils.close_db(exception)

from routes import *

if __name__ == '__main__':
    app.run(debug=True)
