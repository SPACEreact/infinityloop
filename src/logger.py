import logging  

def setup_logger():
    """Set up and return the configured application logger."""

    logger = logging.getLogger('flask-api-service')
    logger.setLevel(logging.INFO)

    if not logger.handlers:
        handler = logging.StreamHandler()
        formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)

    return logger
