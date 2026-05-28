# DeepSeek Relay - AI API Platform

AI API relay platform supporting user management, API key authentication, token billing, tiered pricing, and an admin dashboard.

## Quick Start

```bash
# Clone & setup
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env: set SECRET_KEY and DEEPSEEK_API_KEY

# Run
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Open http://localhost:8000/app

## Features

- User registration/login with JWT + API Key
- OpenAI-compatible `/v1/chat/completions` proxy to DeepSeek
- Token billing with monthly balance and daily rate limits
- Tier system (Free/Pro/VIP)
- Web dashboard with usage stats and chat interface
- Admin panel for user management

## Tier Plans

| Plan | Tokens/Month | Requests/Day | Price |
|------|-------------|-------------|-------|
| Free | 100,000 | 100 | $0 |
| Pro  | 1,000,000 | 1,000 | $29 |
| VIP  | 10,000,000 | Unlimited | $99 |

## API Usage

```bash
# Register
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"a@b.com","password":"..."}'

# Chat proxy (use API key from registration)
curl -X POST http://localhost:8000/v1/chat/completions \
  -H "Authorization: Bearer sk-relay-XXXX" \
  -H "Content-Type: application/json" \
  -d '{"model":"deepseek-chat","messages":[{"role":"user","content":"hello"}]}'
```

## Docker

```bash
docker build -t deepseek-relay .
docker run -p 8000:8000 -e DEEPSEEK_API_KEY=sk-xxx deepseek-relay
```
