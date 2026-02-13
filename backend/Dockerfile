FROM python:3.11-slim

WORKDIR /app

# Install system dependencies if needed (e.g. for Pillow)
# RUN apt-get update && apt-get install -y --no-install-recommends ...

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Ensure upload directories exist
RUN mkdir -p uploads/avatars uploads/covers uploads/logo uploads/favs uploads/files/og-preview

EXPOSE 8000

CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8000"]
