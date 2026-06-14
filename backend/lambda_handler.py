import os
import yfinance as yf

# Configure yfinance tz cache to /tmp for AWS Lambda read-only filesystem
cache_dir = "/tmp/.cache/py-yfinance"
os.makedirs(cache_dir, exist_ok=True)
try:
    yf.set_tz_cache_location(cache_dir)
except Exception:
    pass

from apig_wsgi import make_lambda_handler
from app import app

# This adapter routes API Gateway proxy events directly to the Flask app
handler = make_lambda_handler(app)

