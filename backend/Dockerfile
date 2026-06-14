FROM public.ecr.aws/lambda/python:3.12

# Copy requirements file
COPY requirements.txt ${LAMBDA_TASK_ROOT}

# Install dependencies
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r ${LAMBDA_TASK_ROOT}/requirements.txt

# Copy all files from backend directory
COPY . ${LAMBDA_TASK_ROOT}

# Set the CMD to our handler
CMD ["lambda_handler.handler"]
