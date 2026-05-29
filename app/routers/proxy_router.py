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
    from app.main import user_store, usage_store, tier_store

    user = request.state.user

    # Replenish monthly tokens
    user = billing_service.check_and_replenish(user, tier_store, user_store)

    # Check quota
    billing_service.check_quota(user, tier_store, usage_store)

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
        tokens = data.get("usage", {}).get("total_tokens", 0)
        if tokens > 0:
            billing_service.deduct(user, tokens, body.model, user_store, usage_store)
        return JSONResponse(content=data)


async def _stream_with_billing(response, user, model):
    last_usage = 0
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
                                if "usage" in obj:
                                    last_usage = obj["usage"].get("total_tokens", 0)
                            except Exception:
                                pass
            except Exception:
                pass
    except Exception:
        # Stream interrupted — deduct whatever was consumed
        pass

    if last_usage > 0:
        from app.main import user_store, usage_store
        from app.services.billing_service import BillingService
        bs = BillingService()
        bs.deduct(user, last_usage, model, user_store, usage_store)
