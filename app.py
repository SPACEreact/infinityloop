from flask import Flask
from src.main import main_bp

app = Flask(__name__)

app.register_blueprint(main_bp)

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=3001, debug=True)
