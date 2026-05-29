import json
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from app.models.schemas import ChatRequest
from app.services.proxy_service import ProxyService
from app.services.billing_service import BillingService

router = APIRouter(prefix="/v1", tags=["API 代理"])
proxy_service = ProxyService()
billing_service = BillingService()


@router.get("/models")
async def list_models():
    from app.services.provider_registry import list_all_models
    models = list_all_models()
    result = []
    for m in models:
        result.append({
            "id": m["model"],
            "object": "model",
            "owned_by": m["provider_name"],
        })
    return {"object": "list", "data": result}


@router.post("/chat/completions")
async def chat_completions(request: Request, body: ChatRequest):
    from app.main import user_store, usage_store, tier_store, settings_store

    user = request.state.user

    # IP whitelist check (for API key auth)
    if request.state.auth_method == "api_key" and user.ip_whitelist:
        client_ip = request.client.host if request.client else "unknown"
        if client_ip not in user.ip_whitelist:
            raise HTTPException(status_code=403, detail="IP 不在白名单中")

    # Check if model is disabled
    disabled = settings_store.get("disabled_models", [])
    if body.model in disabled:
        raise HTTPException(status_code=503, detail=f"模型 {body.model} 已下架")

    # Per-model RPM check
    model_rpm = settings_store.get("model_rpm", {})
    rpm = model_rpm.get(body.model, 0)
    if rpm > 0:
        today_key = f"rpm_{user.id}_{body.model}"
        count = usage_store.count_requests_today(today_key)
        if count >= rpm:
            raise HTTPException(status_code=429, detail=f"模型 {body.model} 每分钟限制 {rpm} 次，已达上限")

    # Replenish monthly tokens
    user = billing_service.check_and_replenish(user, tier_store, user_store)

    # Check quota
    billing_service.check_quota(user, body.model, tier_store, usage_store)

    body_dict = body.model_dump()

    if body.stream:
        body_dict["stream_options"] = {"include_usage": True}

    try:
        deepseek_resp = await proxy_service.proxy_chat(body_dict)
    except HTTPException as e:
        billing_service.record_failed(user, body.model, usage_store)
        raise e

    if body.stream:
        return StreamingResponse(
            _stream_with_billing(deepseek_resp, user, body.model),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )
    else:
        data = deepseek_resp.json()
        usage_info = data.get("usage", {})
        tokens = usage_info.get("total_tokens", 0)
        tokens_in = usage_info.get("prompt_tokens", 0)
        tokens_out = usage_info.get("completion_tokens", 0)
        if tokens > 0:
            billing_service.deduct(user, tokens, tokens_in, tokens_out, body.model, user_store, usage_store)
        return JSONResponse(content=data)


async def _stream_with_billing(response, user, model):
    last_usage = 0
    last_in = 0
    last_out = 0
    try:
        async for chunk in response.aiter_bytes():
            yield chunk
            try:
                text = chunk.decode()
                if '"usage"' in text and '"total_tokens"' in text:
                    for line in text.strip().split("\n"):
                        if line.startswith("data: ") and "[DONE]" not in line:
                            try:
                                obj = json.loads(line[6:])
                                usage_data = obj.get("usage", {})
                                if "total_tokens" in usage_data:
                                    last_usage = usage_data.get("total_tokens", 0)
                                    last_in = usage_data.get("prompt_tokens", 0)
                                    last_out = usage_data.get("completion_tokens", 0)
                            except Exception:
                                pass
            except Exception:
                pass
    except Exception:
        pass

    if last_usage > 0:
        from app.main import user_store, usage_store
        from app.services.billing_service import BillingService
        bs = BillingService()
        bs.deduct(user, last_usage, last_in, last_out, model, user_store, usage_store)
