from flask import Blueprint, jsonify, request

from src.logger import setup_logger  

main_bp = Blueprint('main', __name__)  

logger = setup_logger()

@main_bp.route('/status', methods=['GET'])
def status():
    """
    Returns the status of the service
    """
    return jsonify({'status': 'running'})

@main_bp.route('/welcome', methods=['GET'])
def welcome():
    """
    Returns a welcome message
    """
    logger.info(f"Request received: {request.method} {request.path}")
    return jsonify({'message': 'Welcome to the Flask API Service!'})
