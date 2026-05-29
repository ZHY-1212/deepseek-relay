"""Multi-provider registry for AI model routing."""

from app.config import settings

PROVIDERS = {
    "deepseek": {
        "name": "DeepSeek",
        "base_url": "https://api.deepseek.com/v1",
        "api_key": settings.deepseek_api_key,
        "models": ["deepseek-chat", "deepseek-reasoner"],
    },
    "siliconflow": {
        "name": "硅基流动",
        "base_url": "https://api.siliconflow.cn/v1",
        "api_key": settings.siliconflow_api_key,
        "models": [
            "deepseek-ai/DeepSeek-V3",
            "deepseek-ai/DeepSeek-R1",
            "Qwen/Qwen2.5-72B-Instruct",
            "Qwen/Qwen2.5-VL-72B-Instruct",
            "Qwen/Qwen2.5-7B-Instruct",
            "zai-org/GLM-4.6",
            "THUDM/glm-4-9b-chat",
        ],
    },
    "vision_models": [
        "Qwen/Qwen2.5-VL-72B-Instruct",  # SiliconFlow vision model
    ],
    "dashscope": {
        "name": "阿里百炼",
        "base_url": "https://dashscope.aliyuncs.com/compatible-mode/v1",
        "api_key": settings.dashscope_api_key,
        "models": [
            "qwen-plus",
            "qwen-max",
            "qwen-turbo",
        ],
    },
    "zhipu": {
        "name": "智谱AI",
        "base_url": "https://open.bigmodel.cn/api/paas/v4",
        "api_key": settings.zhipu_api_key,
        "models": [
            "glm-4-plus",
            "glm-4-flash",
        ],
    },
    "volcengine": {
        "name": "豆包/火山方舟",
        "base_url": "https://ark.cn-beijing.volces.com/api/v3",
        "api_key": settings.volcengine_api_key,
        "models": [
            "doubao-pro-256k",
            "doubao-lite-128k",
        ],
    },
    "moonshot": {
        "name": "月之暗面Kimi",
        "base_url": "https://api.moonshot.cn/v1",
        "api_key": settings.moonshot_api_key,
        "models": [
            "moonshot-v1-128k",
            "moonshot-v1-8k",
        ],
    },
}


def resolve(model: str) -> dict:
    """Find the provider for a given model name. Returns provider dict or None."""
    for name, prov in PROVIDERS.items():
        if model in prov["models"]:
            return prov
    # Check prefix match
    for name, prov in PROVIDERS.items():
        for m in prov["models"]:
            if model.startswith(m) or m.startswith(model):
                return prov
    return None


def get_provider(name: str) -> dict | None:
    return PROVIDERS.get(name)


def list_all_models() -> list[dict]:
    """Return all available models with provider info."""
    result = []
    for pname, prov in PROVIDERS.items():
        for model in prov["models"]:
            result.append({
                "model": model,
                "provider": pname,
                "provider_name": prov["name"],
            })
    return result
