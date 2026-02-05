FROM mcr.microsoft.com/playwright/python:v1.49.1-jammy

WORKDIR /app

# Install dependencies based on requirements.txt
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Playwright browsers (although the image should have them, ensure matching versions)
RUN playwright install chromium

COPY . .

# Expose port
EXPOSE 8000

# Start command
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
