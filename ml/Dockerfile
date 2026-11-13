FROM python:3.11-slim

# LibreOffice (headless) s� para calcular as f�rmulas das planilhas preenchidas (recalc.py)
RUN apt-get update && apt-get install -y --no-install-recommends libreoffice-calc fonts-liberation     && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000
# Treina no startup (com as env vars do banco já disponíveis) e sobe o serviço.
# Os templates (data/templates/) são baixados do Blob Storage no startup do app.
CMD ["sh", "-c", "python train.py && uvicorn app:app --host 0.0.0.0 --port 8000"]
