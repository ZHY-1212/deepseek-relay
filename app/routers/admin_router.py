from datetime import datetime, timezone

from fastapi import APIRouter, Request, HTTPException
from app.dependencies import get_current_user
from app.services.stats_service import StatsService
from app.models.user import TierEnum
from app.models.schemas import ChangeTierRequest

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/dashboard")
async def admin_dashboard(request: Request):
    from app.main import user_store, usage_store, tier_store

    get_current_user(request)
    return StatsService.get_admin_dashboard(user_store, usage_store, tier_store)


@router.get("/users")
async def list_users(request: Request):
    from app.main import user_store

    get_current_user(request)
    users = user_store.list_all()
    return [{
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "api_key_prefix": u.api_key_prefix,
        "tier": u.tier.value,
        "balance_tokens": u.balance_tokens,
        "is_admin": u.is_admin,
        "is_banned": u.is_banned,
        "created_at": u.created_at,
    } for u in users]


@router.put("/users/{user_id}/ban")
async def toggle_ban(user_id: str, request: Request):
    from app.main import user_store

    admin = get_current_user(request)
    user = user_store.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    if user.is_admin:
        raise HTTPException(status_code=400, detail="不能封禁管理员")

    user.is_banned = not user.is_banned
    user.updated_at = datetime.now(timezone.utc).isoformat()
    user_store.update(user)
    return {"id": user.id, "is_banned": user.is_banned}


@router.put("/users/{user_id}/tier")
async def change_tier(user_id: str, body: ChangeTierRequest, request: Request):
    from app.main import user_store, tier_store

    get_current_user(request)
    tier = body.tier
    if tier not in ("free", "pro", "vip"):
        raise HTTPException(status_code=400, detail="无效的套餐类型")

    user = user_store.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    tier_def = tier_store.get(tier)
    user.tier = TierEnum(tier)
    user.balance_tokens = tier_def["tokens_per_month"]
    user.last_replenished_month = datetime.now(timezone.utc).strftime("%Y-%m")
    user.updated_at = datetime.now(timezone.utc).isoformat()
    user_store.update(user)
    return {"id": user.id, "tier": user.tier.value}


@router.get("/stats")
async def platform_stats(request: Request):
    from app.main import usage_store, user_store

    get_current_user(request)
    stats = usage_store.get_platform_stats()
    stats["total_users"] = user_store.count()
    return stats
