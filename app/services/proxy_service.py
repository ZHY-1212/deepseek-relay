import httpx
from fastapi import HTTPException
from app.services.provider_registry import resolve


class ProxyService:
    def __init__(self):
        self.clients: dict[str, httpx.AsyncClient] = {}

    def _get_client(self, base_url: str) -> httpx.AsyncClient:
        if base_url not in self.clients:
            self.clients[base_url] = httpx.AsyncClient(timeout=120.0)
        return self.clients[base_url]

    async def proxy_chat(self, body: dict) -> httpx.Response:
        model = body.get("model", "")

        # Find the right provider
        provider = resolve(model)
        if not provider:
            # Default to DeepSeek
            provider = {
                "base_url": "https://api.deepseek.com/v1",
                "api_key": "sk-placeholder",
            }
            from app.config import settings
            provider["api_key"] = settings.deepseek_api_key

        base_url = provider["base_url"]
        api_key = provider["api_key"]

        if not api_key:
            raise HTTPException(
                status_code=503,
                detail=f"模型 {model} 的 API Key 未配置，请联系管理员",
            )

        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        url = f"{base_url}/chat/completions"

        client = self._get_client(base_url)
        response = await client.post(url, json=body, headers=headers)
        if response.status_code != 200:
            detail = response.text
            try:
                detail = response.json()
            except Exception:
                pass
            raise HTTPException(status_code=response.status_code, detail=detail)
        return response

    async def close(self):
        for client in self.clients.values():
            await client.aclose()
