import logging
import sys
from pathlib import Path

import pytest
from flask import Flask

# Ensure the application package is importable when running tests directly.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.main import main_bp


@pytest.fixture
def app():
    app = Flask(__name__)
    app.register_blueprint(main_bp)
    return app


@pytest.fixture
def client(app):
    return app.test_client()


def test_status_endpoint(client):
    response = client.get('/status')

    assert response.status_code == 200
    assert response.get_json() == {'status': 'running'}


def test_welcome_endpoint_logs_request(client, caplog):
    with caplog.at_level(logging.INFO, logger='flask-api-service'):
        response = client.get('/welcome')

    assert response.status_code == 200
    assert response.get_json() == {'message': 'Welcome to the Flask API Service!'}
    assert any(
        'Request received: GET /welcome' in record.getMessage()
        for record in caplog.records
    )
