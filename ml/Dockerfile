FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
# Treina os modelos na imagem (reconhecedor com os 2 templates + mapeador com os
# exemplos de treino em fields.py). Não depende dos laudos da pasta 2025/.
RUN python train.py

EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
