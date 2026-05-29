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


@router.put("/users/{user_id}/admin")
async def toggle_admin(user_id: str, request: Request):
    from app.main import user_store
    admin = get_current_user(request)
    if not admin.is_admin:
        raise HTTPException(status_code=403, detail="需要管理员权限")
    user = user_store.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    user.is_admin = not user.is_admin
    user.updated_at = datetime.now(timezone.utc).isoformat()
    user_store.update(user)
    return {"id": user.id, "is_admin": user.is_admin}


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, request: Request):
    from app.main import user_store
    admin = get_current_user(request)
    if not admin.is_admin:
        raise HTTPException(status_code=403, detail="需要管理员权限")
    user = user_store.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")
    if user.is_admin:
        raise HTTPException(status_code=400, detail="不能删除管理员")
    # Delete user from store
    data = user_store.store.read_all()
    if user_id in data:
        del data[user_id]
        user_store.store.write_all(data)
    return {"message": "用户已删除"}


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
    """Admin uploads payment QR codes (wechat + alipay)."""
    from app.main import settings_store
    body = await request.json()
    qr_data = settings_store.get("payment_qr", {})
    if "wechat_qr" in body: qr_data["wechat_qr"] = body["wechat_qr"]
    if "alipay_qr" in body: qr_data["alipay_qr"] = body["alipay_qr"]
    settings_store.set("payment_qr", qr_data)
    return {"message": "收款码已更新"}


# ── Announcements ──
@router.post("/announcements")
async def create_announcement(request: Request):
    from app.main import settings_store
    get_current_user(request)
    body = await request.json()
    anns = settings_store.get("announcements", [])
    import uuid, datetime
    ann = {"id": str(uuid.uuid4()), "title": body.get("title",""), "content": body.get("content",""), "created_at": datetime.datetime.utcnow().isoformat()}
    anns.insert(0, ann)
    if len(anns) > 20: anns = anns[:20]
    settings_store.set("announcements", anns)
    return {"message": "公告已发布", "id": ann["id"]}

@router.delete("/announcements/{ann_id}")
async def delete_announcement(ann_id: str, request: Request):
    from app.main import settings_store
    get_current_user(request)
    anns = settings_store.get("announcements", [])
    anns = [a for a in anns if a["id"] != ann_id]
    settings_store.set("announcements", anns)
    return {"message": "已删除"}

@router.get("/announcements")
async def get_announcements():
    from app.main import settings_store
    return settings_store.get("announcements", [])[:5]

# ── Model Toggle ──
@router.get("/disabled-models")
async def get_disabled_models():
    from app.main import settings_store
    return {"models": settings_store.get("disabled_models", [])}

@router.post("/disabled-models")
async def toggle_model(request: Request):
    from app.main import settings_store
    get_current_user(request)
    body = await request.json()
    model = body.get("model", "")
    disabled = settings_store.get("disabled_models", [])
    if model in disabled: disabled.remove(model)
    else: disabled.append(model)
    settings_store.set("disabled_models", disabled)
    return {"disabled_models": disabled}

# ── Per-Model RPM ──
@router.get("/model-rpm")
async def get_model_rpm():
    from app.main import settings_store
    return settings_store.get("model_rpm", {})

@router.post("/model-rpm")
async def set_model_rpm(request: Request):
    from app.main import settings_store
    get_current_user(request)
    body = await request.json()
    rpm = settings_store.get("model_rpm", {})
    rpm[body.get("model","")] = int(body.get("rpm", 0))
    settings_store.set("model_rpm", rpm)
    return {"model_rpm": rpm}

# ── IP Whitelist (user setting) ──
@router.post("/ip-whitelist")
async def set_ip_whitelist(request: Request):
    from app.main import user_store
    import datetime
    user = get_current_user(request)
    body = await request.json()
    user.ip_whitelist = body.get("ips", [])
    user.updated_at = datetime.datetime.utcnow().isoformat()
    user_store.update(user)
    return {"ip_whitelist": user.ip_whitelist}

@router.get("/payment-qr")
async def get_payment_qr():
    from app.main import settings_store
    data = settings_store.get("payment_qr", {})
    return {"wechat_qr": data.get("wechat_qr", ""), "alipay_qr": data.get("alipay_qr", "")}


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
