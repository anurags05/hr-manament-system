import os
from flask import Flask, send_from_directory
from flask_cors import CORS
import db_utils

app = Flask(__name__, static_folder=None)

# Environment-driven CORS (same-origin in production, but kept flexible)
_cors_origins_env = os.environ.get('CORS_ORIGINS')
if _cors_origins_env:
    _origins = [o.strip() for o in _cors_origins_env.split(',') if o.strip()]
else:
    _origins = [
        'http://127.0.0.1:5500',
        'http://localhost:5500',
        'http://127.0.0.1:8000',
        'http://localhost:8000',
        'http://127.0.0.1:5000',
        'http://localhost:5000',
        'null',
    ]
CORS(app, supports_credentials=True, origins=_origins)

# Session configuration for RBAC auth
_is_prod = os.environ.get('FLASK_ENV') == 'production'
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-prod')
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = _is_prod  # True in production with HTTPS

# Register database teardown context
@app.teardown_appcontext
def close_connection(exception):
    db_utils.close_db(exception)

# Static file serving for SPA (frontend lives at repo root)
@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/assets/<path:filename>')
def assets(filename):
    return send_from_directory('assets', filename)

@app.route('/favicon.ico')
def favicon():
    return send_from_directory('assets', 'favicon.ico', mimetype='image/x-icon') \
        if os.path.exists(os.path.join('assets', 'favicon.ico')) \
        else ('', 204)

# SPA fallback — serve index.html for any non-/api route so client-side routing works
@app.route('/<path:path>')
def spa_fallback(path):
    if path.startswith('api/'):
        return ('Not Found', 404)
    if os.path.isfile(path):
        return send_from_directory('.', path)
    return send_from_directory('.', 'index.html')

from routes import *

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=not _is_prod)
