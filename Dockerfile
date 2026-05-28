FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt --no-cache-dir

COPY . .
RUN mkdir -p data

EXPOSE 8000
# $PORT 由 Railway/Render 等平台自动注入，本地默认 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers"]
