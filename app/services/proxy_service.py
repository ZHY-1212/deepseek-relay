import httpx
from fastapi import HTTPException
from app.config import settings

DEEPSEEK_BASE = "https://api.deepseek.com"


class ProxyService:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=120.0)

    async def proxy_chat(self, body: dict) -> httpx.Response:
        headers = {
            "Authorization": f"Bearer {settings.deepseek_api_key}",
            "Content-Type": "application/json",
        }
        url = f"{DEEPSEEK_BASE}/v1/chat/completions"

        response = await self.client.post(url, json=body, headers=headers)
        if response.status_code != 200:
            detail = response.text
            try:
                detail = response.json()
            except Exception:
                pass
            raise HTTPException(status_code=response.status_code, detail=detail)
        return response

    async def close(self):
        await self.client.aclose()
