import os
import yfinance as yf

# Configure yfinance tz cache to /tmp for AWS Lambda read-only filesystem
cache_dir = "/tmp/.cache/py-yfinance"
os.makedirs(cache_dir, exist_ok=True)
try:
    yf.set_tz_cache_location(cache_dir)
except Exception:
    pass

import aws_lambda_wsgi
from app import app

def handler(event, context):
    # This adapter routes API Gateway proxy events directly to the Flask app
    return aws_lambda_wsgi.response(app, event, context)

