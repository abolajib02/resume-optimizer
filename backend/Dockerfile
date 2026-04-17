FROM python:3.12-slim

WORKDIR /app

# System deps (none needed beyond slim base for this app)
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first — better layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download NLTK data at build time so containers start instantly
RUN python -c "\
import nltk; \
nltk.download('punkt',     quiet=True); \
nltk.download('punkt_tab', quiet=True); \
nltk.download('stopwords', quiet=True)"

# Copy application code
COPY app/ app/

EXPOSE 8000

# Healthcheck — used by docker compose depends_on condition
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
