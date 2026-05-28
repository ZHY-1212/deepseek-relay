from uuid import uuid4
from datetime import datetime, timezone

from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel

from app.dependencies import get_current_user
from app.models.order import Order

router = APIRouter(prefix="/payment", tags=["支付"])


class CreateOrderRequest(BaseModel):
    tier: str


@router.post("/create-order")
async def create_order(request: Request, body: CreateOrderRequest):
    from app.main import user_store, tier_store, order_store

    user = get_current_user(request)

    if body.tier not in ("pro", "vip"):
        raise HTTPException(status_code=400, detail="无效的套餐类型")
    if user.tier.value == body.tier:
        raise HTTPException(status_code=400, detail="你已经是该套餐了")

    tier_def = tier_store.get(body.tier)
    if not tier_def:
        raise HTTPException(status_code=400, detail="套餐不存在")

    amount = tier_def["price"]
    order = Order(
        id=str(uuid4()),
        user_id=user.id,
        username=user.username,
        tier=body.tier,
        amount=amount,
        status="pending",
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    order_store.add(order)
    return {"order_id": order.id, "amount": amount, "tier": body.tier}


@router.get("/my-orders")
async def my_orders(request: Request):
    from app.main import order_store

    user = get_current_user(request)
    orders = order_store.get_by_user(user.id)
    return [o.model_dump() for o in orders]


@router.get("/orders")
async def all_orders(request: Request):
    from app.main import order_store

    get_current_user(request)
    return [o.model_dump() for o in order_store.list_all()]


@router.put("/orders/{order_id}/confirm")
async def confirm_order(order_id: str, request: Request):
    from app.main import user_store, tier_store, order_store

    admin = get_current_user(request)
    if not admin.is_admin:
        raise HTTPException(status_code=403, detail="需要管理员权限")

    order = order_store.get_by_id(order_id)
    if not order:
        raise HTTPException(status_code=404, detail="订单不存在")
    if order.status != "pending":
        raise HTTPException(status_code=400, detail="订单已处理")

    user = user_store.get_by_id(order.user_id)
    if not user:
        raise HTTPException(status_code=404, detail="用户不存在")

    from app.models.user import TierEnum
    tier_def = tier_store.get(order.tier)
    user.tier = TierEnum(order.tier)
    user.balance_tokens = tier_def["tokens_per_month"]
    user.last_replenished_month = datetime.now(timezone.utc).strftime("%Y-%m")
    user.updated_at = datetime.now(timezone.utc).isoformat()
    user_store.update(user)

    order.status = "paid"
    order.paid_at = datetime.now(timezone.utc).isoformat()
    order_store.update(order)

    return {"message": "已确认升级", "tier": order.tier}


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
