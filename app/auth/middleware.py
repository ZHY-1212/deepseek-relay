from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from app.auth.jwt_handler import verify_access_token
from app.auth.api_key_handler import hash_key
from app.store.user_store import UserStore

PUBLIC_PATHS = {"/", "/app", "/health", "/auth/login", "/auth/register", "/docs", "/openapi.json", "/favicon.ico"}
PUBLIC_V1 = {"/v1/models"}  # model list is public
PUBLIC_PREFIXES = ("/payment/notify",)  # PayJS callback
STATIC_PREFIXES = ("/static/",)


class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        path = request.url.path

        if path in PUBLIC_PATHS or path in PUBLIC_V1 or path.startswith(STATIC_PREFIXES) or path.startswith(PUBLIC_PREFIXES):
            return await call_next(request)

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="缺少认证 Token")

        token = auth_header.removeprefix("Bearer ")

        from app.main import user_store

        # Proxy routes: authenticate via API Key OR JWT
        if path.startswith("/v1/"):
            if token.startswith("sk-"):
                # API Key auth
                key_hash = hash_key(token)
                user = user_store.get_by_api_key_hash(key_hash)
                if not user:
                    raise HTTPException(status_code=401, detail="API Key 无效")
                request.state.auth_method = "api_key"
            else:
                # JWT auth (for web chat)
                payload = verify_access_token(token)
                if not payload:
                    raise HTTPException(status_code=401, detail="登录已过期，请重新登录")
                user = user_store.get_by_id(payload["sub"])
                if not user:
                    raise HTTPException(status_code=401, detail="用户不存在")
                request.state.auth_method = "jwt"
            if user.is_banned:
                raise HTTPException(status_code=403, detail="账号已被封禁")
            request.state.user = user

        # Dashboard / Admin routes: authenticate via JWT
        else:
            payload = verify_access_token(token)
            if not payload:
                raise HTTPException(status_code=401, detail="登录已过期，请重新登录")
            user = user_store.get_by_id(payload["sub"])
            if not user:
                raise HTTPException(status_code=401, detail="用户不存在")
            if user.is_banned:
                raise HTTPException(status_code=403, detail="账号已被封禁")
            # Admin check
            if path.startswith("/admin/") and not user.is_admin:
                raise HTTPException(status_code=403, detail="需要管理员权限")
            request.state.user = user
            request.state.auth_method = "jwt"

        return await call_next(request)
