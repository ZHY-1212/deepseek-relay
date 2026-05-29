from uuid import uuid4
from datetime import datetime, timezone

from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel

from app.dependencies import get_current_user
from app.models.order import Order

router = APIRouter(prefix="/payment", tags=["支付"])


class TopupRequest(BaseModel):
    amount: float


@router.post("/topup")
async def create_topup(request: Request, body: TopupRequest):
    """Create a top-up order. Shows QR code for manual payment."""
    from app.main import user_store, order_store
    from app.services.payment_gateway import get_gateway
    gateway = get_gateway()

    user = get_current_user(request)
    if body.amount <= 0:
        raise HTTPException(status_code=400, detail="金额必须大于 0")

    order_id = str(uuid4())
    order = Order(
        id=order_id,
        user_id=user.id,
        username=user.username,
        tier="topup",
        amount=body.amount,
        status="pending",
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    order_store.add(order)

    # Try PayJS
    qr = await gateway.create_qrcode(body.amount, order_id, f"DS Relay 充值 ¥{body.amount}")
    if qr:
        return {"order_id": order_id, "amount": body.amount, "qrcode": qr["qrcode"], "method": "wechat_qr"}

    # Manual: show admin QR code
    return {"order_id": order_id, "amount": body.amount, "method": "manual", "message": "请扫码支付后等待管理员确认"}


@router.post("/notify")
async def payjs_notify(request: Request):
    """PayJS payment callback. Adds balance on successful payment."""
    from app.main import user_store, order_store
    from app.services.payment_gateway import get_gateway
    gateway = get_gateway()

    try:
        params = dict(await request.form())
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid callback data")

    if not gateway.verify_sign(params.copy()):
        raise HTTPException(status_code=400, detail="签名验证失败")

    if params.get("return_code") != "1":
        return {"status": "failed", "message": "支付未成功"}

    order_id = params.get("out_trade_no", "")
    order = order_store.get_by_id(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")

    if order.status == "paid":
        return {"status": "ok", "message": "已处理"}

    user = user_store.get_by_id(order.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    # Add balance: ¥1 = 100万 tokens
    tokens = int(order.amount * 1000000)
    user.balance_tokens += tokens
    user.updated_at = datetime.now(timezone.utc).isoformat()
    user_store.update(user)

    order.status = "paid"
    order.paid_at = datetime.now(timezone.utc).isoformat()
    order_store.update(order)

    return {"status": "success", "message": "充值已到账"}


@router.get("/my-orders")
async def my_orders(request: Request):
    from app.main import order_store
    user = get_current_user(request)
    return [o.model_dump() for o in order_store.get_by_user(user.id)]


@router.get("/orders")
async def all_orders(request: Request):
    from app.main import order_store
    get_current_user(request)
    return [o.model_dump() for o in order_store.list_all()]


@router.put("/orders/{order_id}/confirm")
async def confirm_order(order_id: str, request: Request):
    from app.main import user_store, tier_store, order_store
    from app.models.user import TierEnum
    admin = get_current_user(request)
    if not admin.is_admin:
        raise HTTPException(status_code=403, detail="需要管理员权限")
    order = order_store.get_by_id(order_id)
    if not order or order.status != "pending":
        raise HTTPException(status_code=400, detail="订单无法确认")
    user = user_store.get_by_id(order.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    if order.tier == "topup":
        # Recharge order: add balance
        tokens = int(order.amount * 1000000)
        user.balance_tokens += tokens
    else:
        # Tier upgrade order
        tier_def = tier_store.get(order.tier)
        if not tier_def:
            raise HTTPException(status_code=400, detail="套餐不存在")
        user.tier = TierEnum(order.tier)
        user.balance_tokens = tier_def["tokens_per_month"]
        user.last_replenished_month = datetime.now(timezone.utc).strftime("%Y-%m")

    user.updated_at = datetime.now(timezone.utc).isoformat()
    user_store.update(user)
    order.status = "paid"
    order.paid_at = datetime.now(timezone.utc).isoformat()
    order_store.update(order)
    return {"message": "已确认" + ("充值" if order.tier == "topup" else "升级"), "tier": order.tier}


@router.put("/orders/{order_id}/cancel")
async def cancel_order(order_id: str, request: Request):
    from app.main import order_store
    admin = get_current_user(request)
    if not admin.is_admin:
        raise HTTPException(status_code=403, detail="需要管理员权限")
    order = order_store.get_by_id(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    order.status = "cancelled"
    order_store.update(order)
    return {"message": "订单已取消"}
