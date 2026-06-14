import aws_lambda_wsgi
from app import app

def handler(event, context):
    # This adapter routes API Gateway proxy events directly to the Flask app
    return aws_lambda_wsgi.response(app, event, context)
