from flask import Flask
from flask_cors import CORS
import db_utils

app = Flask(__name__)
CORS(app)

# Register database teardown context
@app.teardown_appcontext
def close_connection(exception):
    db_utils.close_db(exception)

from routes import *

if __name__ == '__main__':
    app.run(debug=True)
