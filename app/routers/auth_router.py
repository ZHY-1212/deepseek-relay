from uuid import uuid4
from datetime import datetime, timezone

import bcrypt
from fastapi import APIRouter, HTTPException, Request
from app.models.user import User, UserPublic, TierEnum
from app.models.schemas import RegisterRequest, LoginRequest
from app.auth.jwt_handler import create_access_token
from app.auth.api_key_handler import generate_api_key

router = APIRouter(prefix="/auth", tags=["认证"])


@router.post("/register")
async def register(req: RegisterRequest):
    from app.main import user_store, tier_store

    if len(req.password) < 8:
        raise HTTPException(status_code=400, detail="密码至少 8 位")
    if not any(c.isalpha() for c in req.password) or not any(c.isdigit() for c in req.password):
        raise HTTPException(status_code=400, detail="密码需包含字母和数字")
    if user_store.get_by_email(req.email):
        raise HTTPException(status_code=400, detail="该邮箱已注册")
    if user_store.get_by_username(req.username):
        raise HTTPException(status_code=400, detail="该用户名已被使用")

    hashed_pw = bcrypt.hashpw(req.password.encode(), bcrypt.gensalt()).decode()
    raw_key, key_hash, key_prefix = generate_api_key()

    user_id = str(uuid4())
    now = datetime.now(timezone.utc).isoformat()

    # First user is admin
    is_admin = user_store.count() == 0

    initial_tokens = tier_store.get_tokens_per_month("free")

    user = User(
        id=user_id,
        username=req.username,
        email=req.email,
        hashed_password=hashed_pw,
        api_key_hash=key_hash,
        api_key_prefix=key_prefix,
        tier=TierEnum.FREE,
        balance_tokens=initial_tokens,
        is_admin=is_admin,
        is_banned=False,
        last_replenished_month=datetime.now(timezone.utc).strftime("%Y-%m"),
        created_at=now,
        updated_at=now,
    )

    user_store.create(user)
    access_token = create_access_token(user_id, is_admin)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "api_key": raw_key,
        "user": UserPublic(**user.model_dump()),
    }


@router.post("/login")
async def login(req: LoginRequest):
    from app.main import user_store

    # 支持用户名或邮箱登录
    user = user_store.get_by_username(req.account)
    if not user:
        user = user_store.get_by_email(req.account)
    if not user:
        raise HTTPException(status_code=401, detail="用户名或密码错误")

    if not bcrypt.checkpw(req.password.encode(), user.hashed_password.encode()):
        raise HTTPException(status_code=401, detail="邮箱或密码错误")

    if user.is_banned:
        raise HTTPException(status_code=403, detail="账号已被封禁")

    access_token = create_access_token(user.id, user.is_admin)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": UserPublic(**user.model_dump()),
    }


@router.post("/reset-api-key")
async def reset_api_key(request: Request):
    from app.main import user_store
    from app.dependencies import get_current_user

    user = get_current_user(request)
    raw_key, key_hash, key_prefix = generate_api_key()

    user.api_key_hash = key_hash
    user.api_key_prefix = key_prefix
    user.updated_at = datetime.now(timezone.utc).isoformat()
    user_store.update(user)

    return {"api_key": raw_key, "api_key_prefix": key_prefix}
