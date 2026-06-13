FROM python:3.11-slim

# Set the working directory
WORKDIR /code

# Copy the requirements file from the backend folder
COPY ./backend/requirements.txt /code/requirements.txt

# Install dependencies
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copy the rest of the backend files
COPY ./backend /code

# Hugging Face Spaces REQUIRES the app to run on port 7860
ENV PORT=7860
EXPOSE 7860

# Start the Flask app using Gunicorn on port 7860
CMD ["gunicorn", "-b", "0.0.0.0:7860", "app:app"]
