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


@router.post("/payment-qr")
async def set_payment_qr(request: Request):
    """Admin uploads their personal payment QR code (base64 image)."""
    from app.main import tier_store
    body = await request.json()
    qr_data = body.get("qr_image", "")
    tier_store.update("payment", {"qr_image": qr_data})
    return {"message": "收款码已更新"}


@router.get("/payment-qr")
async def get_payment_qr():
    from app.main import tier_store
    data = tier_store.get("payment") or {}
    return {"qr_image": data.get("qr_image", "")}


@router.get("/all-users")
async def all_users_dashboard(request: Request):
    from app.main import usage_store, user_store, tier_store

    get_current_user(request)
    users = user_store.list_all()
    all_usage = usage_store._all()

    total_balance = sum(u.balance_tokens for u in users)
    total_deducted = sum(r.get("tokens_deducted", 0) for r in all_usage if r.get("success"))
    total_api_tokens = sum(r.get("tokens_consumed", 0) for r in all_usage if r.get("success"))
    total_requests = sum(1 for r in all_usage if r.get("success"))
    failed_requests = sum(1 for r in all_usage if not r.get("success"))

    # Per-user stats
    user_stats = []
    for u in users:
        user_records = [r for r in all_usage if r.get("user_id") == u.id and r.get("success")]
        user_deducted = sum(r.get("tokens_deducted", 0) for r in user_records)
        user_api_tokens = sum(r.get("tokens_consumed", 0) for r in user_records)
        user_reqs = len(user_records)
        user_stats.append({
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "tier": u.tier.value,
            "balance": u.balance_tokens,
            "total_deducted": user_deducted,
            "total_api_tokens": user_api_tokens,
            "total_requests": user_reqs,
            "created_at": u.created_at,
        })

    # Sort by consumption
    user_stats.sort(key=lambda x: x["total_deducted"], reverse=True)

    # Conversion: 1 platform token = ¥0.0001 (¥10 per 100K tokens)
    revenue = round(total_deducted * 0.0001, 2)

    return {
        "overview": {
            "total_users": len(users),
            "total_balance": total_balance,
            "total_deducted": total_deducted,
            "total_api_tokens": total_api_tokens,
            "total_requests": total_requests,
            "failed_requests": failed_requests,
            "estimated_revenue": revenue,
            "avg_tokens_per_user": total_deducted // max(1, len(users)),
        },
        "users": user_stats,
        "tiers": tier_store.list_all(),
    }
