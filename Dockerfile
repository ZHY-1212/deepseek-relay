FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt --no-cache-dir

COPY . .
# Merge + minify all JS into single bundle
RUN cd app/static/js && cat api.js router.js auth.js welcome.js models.js models_intro.js dashboard.js chat.js history.js recharge.js pay.js admin.js docs.js profile.js pricing.js app.js pet.js | python3 -c "import sys,re; js=sys.stdin.read(); js=re.sub(r'//.*\n','\n',js); js=re.sub(r'/\*[\s\S]*?\*/','',js); js=re.sub(r'\n\s*\n','\n',js); print(js)" > bundle.js || cat api.js router.js auth.js welcome.js models.js models_intro.js dashboard.js chat.js history.js recharge.js pay.js admin.js docs.js profile.js pricing.js app.js pet.js > bundle.js
RUN mkdir -p data

EXPOSE 8000
# $PORT 由 Railway/Render 等平台自动注入，本地默认 8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --proxy-headers"]
