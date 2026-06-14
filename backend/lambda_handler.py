import os
import yfinance as yf

# Fixes matplotlib slow init and read-only filesystem issues
os.environ["MPLCONFIGDIR"] = "/tmp"

# Configure yfinance tz cache to /tmp for AWS Lambda read-only filesystem
cache_dir = "/tmp/.cache/py-yfinance"
os.makedirs(cache_dir, exist_ok=True)
try:
    yf.set_tz_cache_location(cache_dir)
except Exception:
    pass

from apig_wsgi import make_lambda_handler

# We cache the handler globally so warm starts are fast
_handler = None

def handler(event, context):
    global _handler
    if _handler is None:
        # Lazy load the app here to bypass the 10-second Lambda init timeout limit!
        # This will use the 300-second execution timeout instead for heavy imports.
        from app import app
        _handler = make_lambda_handler(app)
        
    return _handler(event, context)

