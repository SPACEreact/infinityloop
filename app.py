"""Entry point for running the Flask API service locally."""
from __future__ import annotations

from src.main import create_app

app = create_app()

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=3001, debug=True)
