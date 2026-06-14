import boto3
import time
import os
import sys

region = 'us-east-2'
aws_lambda = boto3.client('lambda', region_name=region)
apigw = boto3.client('apigateway', region_name=region)
sts = boto3.client('sts', region_name=region)

try:
    account_id = sts.get_caller_identity()['Account']
except Exception as e:
    print(f"Error getting AWS Account ID: {e}")
    sys.exit(1)

function_name = 'finai-api-v2-production-docker'
image_uri = f"{account_id}.dkr.ecr.{region}.amazonaws.com/finai-api-image:latest"
role_arn = f"arn:aws:iam::{account_id}:role/finai-lambda-role-final"

# Production environment variables
env_vars = {
    "SUPABASE_URL": "https://iaozluyveedsascwjgsv.supabase.co",
    "SUPABASE_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlhb3psdXl2ZWVkc2FzY3dqZ3N2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMjI2OTcsImV4cCI6MjA5NDY5ODY5N30.1MErkTaUBL4NMYWM2bx8sWky5KID6tADhXWeqwRV0Hs",
    "JWT_SECRET_KEY": "finai-nexus-jwt-secret-key-2026-production"
}

# 1. Create or Update Lambda Function
try:
    print(f"Checking if Lambda function {function_name} exists...")
    aws_lambda.get_function(FunctionName=function_name)
    print(f"Function {function_name} exists. Updating code to image: {image_uri}")
    aws_lambda.update_function_code(
        FunctionName=function_name,
        ImageUri=image_uri
    )
    
    # Wait for function update to complete
    print("Waiting for Lambda function code update to complete...")
    for _ in range(30):
        status = aws_lambda.get_function_configuration(FunctionName=function_name)
        state = status.get('LastUpdateStatus', '')
        if state == 'Successful':
            print("Lambda update completed successfully.")
            break
        elif state == 'Failed':
            print("Lambda update failed configuration status check.")
            sys.exit(1)
        time.sleep(5)
    
    print("Updating function configuration (timeout, memory, environment)...")
    aws_lambda.update_function_configuration(
        FunctionName=function_name,
        Timeout=300,
        MemorySize=2048,
        Environment={'Variables': env_vars}
    )
except aws_lambda.exceptions.ResourceNotFoundException:
    print(f"Function {function_name} does not exist. Creating new function...")
    aws_lambda.create_function(
        FunctionName=function_name,
        PackageType='Image',
        Code={'ImageUri': image_uri},
        Role=role_arn,
        Timeout=300,
        MemorySize=2048,
        Environment={'Variables': env_vars}
    )
    print(f"Function {function_name} created successfully.")
    # Wait for creation to finish
    time.sleep(10)

# 2. Find and update API Gateway integrations
print("Searching for API Gateway rest APIs...")
apis = apigw.get_rest_apis()
api_id = None
for api in apis.get('items', []):
    # Match on Zappa's created API name
    if api['name'] == 'finai-api-v2-production':
        api_id = api['id']
        break

if api_id:
    print(f"Found API Gateway with ID: {api_id}. Updating integrations...")
    resources = apigw.get_resources(restApiId=api_id)
    for resource in resources.get('items', []):
        resource_id = resource['id']
        resource_methods = resource.get('resourceMethods', {})
        for method in resource_methods.keys():
            try:
                integration = apigw.get_integration(
                    restApiId=api_id,
                    resourceId=resource_id,
                    httpMethod=method
                )
                uri = integration.get('uri', '')
                # If integration points to the old zip-based function, update it
                if 'finai-api-v2-production' in uri and 'finai-api-v2-production-docker' not in uri:
                    new_uri = uri.replace('finai-api-v2-production', 'finai-api-v2-production-docker')
                    print(f"Updating integration URI for resource {resource.get('path', '/')} method {method}...")
                    apigw.update_integration(
                        restApiId=api_id,
                        resourceId=resource_id,
                        httpMethod=method,
                        patchOperations=[
                            {
                                'op': 'replace',
                                'path': '/uri',
                                'value': new_uri
                            }
                        ]
                    )
            except Exception as e:
                print(f"Error checking/updating integration for resource {resource_id} {method}: {e}")

    # 3. Add API Gateway invocation permission to Docker Lambda
    try:
        print(f"Adding API Gateway execution permission to {function_name}...")
        aws_lambda.add_permission(
            FunctionName=function_name,
            StatementId='AllowAPIGatewayInvokeDocker',
            Action='lambda:InvokeFunction',
            Principal='apigateway.amazonaws.com',
            SourceArn=f"arn:aws:execute-api:{region}:{account_id}:{api_id}/*"
        )
        print("API Gateway permission added.")
    except aws_lambda.exceptions.ResourceConflictException:
        print("API Gateway permission already exists.")
    except Exception as e:
        print(f"Error adding Lambda permission: {e}")

    # 4. Redeploy API Gateway stages
    stages = apigw.get_stages(restApiId=api_id)
    for stage in stages.get('item', []):
        stage_name = stage['stageName']
        print(f"Redeploying API to stage: {stage_name}...")
        apigw.create_deployment(
            restApiId=api_id,
            stageName=stage_name,
            description="Swapped backend to Docker-based Lambda"
        )
        print(f"Redeployed stage {stage_name}.")
else:
    print("REST API 'finai-api-v2-production' was not found. Skip integration updates.")

# 5. Clean up old ZIP-based resources
print("Starting cleanup of old ZIP-based resources...")
try:
    print("Deleting old ZIP function 'finai-api-v2-production'...")
    aws_lambda.delete_function(FunctionName='finai-api-v2-production')
    print("Old ZIP function deleted.")
except aws_lambda.exceptions.ResourceNotFoundException:
    print("Old ZIP function already deleted.")
except Exception as e:
    print(f"Error deleting old ZIP function: {e}")

for layer_name in ['finai-ml-layer', 'finai-ml-layer-v3']:
    try:
        print(f"Listing versions for layer '{layer_name}'...")
        versions = aws_lambda.list_layer_versions(LayerName=layer_name)
        for version in versions.get('LayerVersions', []):
            version_num = version['Version']
            print(f"Deleting version {version_num} of layer '{layer_name}'...")
            aws_lambda.delete_layer_version(LayerName=layer_name, VersionNumber=version_num)
        print(f"Old layer '{layer_name}' versions cleaned up.")
    except Exception as e:
        print(f"Error cleaning up layer '{layer_name}': {e}")

bucket_name = 'finai-zappa-deployments-bucket'
try:
    print(f"Emptying and deleting S3 bucket '{bucket_name}'...")
    s3_client = boto3.client('s3', region_name=region)
    s3_resource = boto3.resource('s3', region_name=region)
    bucket = s3_resource.Bucket(bucket_name)
    bucket.objects.all().delete()
    s3_client.delete_bucket(Bucket=bucket_name)
    print("Old S3 bucket deleted.")
except Exception as e:
    print(f"Error cleaning up old S3 bucket: {e}")

