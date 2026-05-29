from datetime import datetime, timezone

from fastapi import APIRouter, Request, HTTPException
from app.dependencies import get_current_user
from app.auth.api_key_handler import generate_api_key
from app.models.schemas import UpgradeRequest
from app.services.stats_service import StatsService

router = APIRouter(prefix="/dashboard", tags=["仪表盘"])


@router.get("/profile")
async def profile(request: Request):
    from app.main import user_store, usage_store

    user = get_current_user(request)
    return StatsService.get_user_dashboard(user, user_store, usage_store)


@router.get("/usage")
async def usage(request: Request):
    from app.main import usage_store

    user = get_current_user(request)
    return usage_store.get_user_stats(user.id)


@router.post("/upgrade")
async def upgrade(request: Request, req: UpgradeRequest):
    from app.main import user_store, tier_store, usage_store

    user = get_current_user(request)
    tier = tier_store.get(req.tier.value)
    if not tier:
        raise HTTPException(status_code=400, detail="无效的套餐类型")

    user.tier = req.tier
    user.balance_tokens = tier["tokens_per_month"]
    user.last_replenished_month = datetime.now(timezone.utc).strftime("%Y-%m")
    user.updated_at = datetime.now(timezone.utc).isoformat()
    user_store.update(user)

    return StatsService.get_user_dashboard(user, user_store, usage_store)


@router.get("/history")
async def usage_history(request: Request, page: int = 1, size: int = 20, model: str = "", search: str = ""):
    from app.main import usage_store
    user = get_current_user(request)
    result = usage_store.get_user_history(user.id, page=page, size=size, model=model, search=search)
    return result


@router.post("/reset-api-key")
async def reset_api_key(request: Request):
    from app.main import user_store

    user = get_current_user(request)
    raw_key, key_hash, key_prefix = generate_api_key()

    user.api_key_hash = key_hash
    user.api_key_prefix = key_prefix
    user.updated_at = datetime.now(timezone.utc).isoformat()
    user_store.update(user)

    return {"api_key": raw_key, "api_key_prefix": key_prefix}
