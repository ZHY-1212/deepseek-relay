import time
import threading
from collections import defaultdict
from fastapi import Request
from starlette.responses import JSONResponse


class RateLimitMiddleware:
    """Pure ASGI middleware for rate limiting — avoids BaseHTTPMiddleware exception issues."""

    def __init__(self, app, max_requests: int = 60, window: int = 60,
                 auth_max: int = 10, auth_window: int = 60):
        self.app = app
        self.max_requests = max_requests
        self.window = window
        self.auth_max = auth_max
        self.auth_window = auth_window
        self._storage: dict[str, list[float]] = defaultdict(list)
        self._lock = threading.Lock()

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope["path"]

        if path.startswith("/static/") or path.startswith("/docs") or path == "/openapi.json":
            await self.app(scope, receive, send)
            return

        # 优先取代理传递的真实 IP（兼容 nginx X-Real-IP / X-Forwarded-For）
        client_ip = scope.get("client", ("unknown", 0))[0]
        for header_name in (b"x-real-ip", b"x-forwarded-for"):
            for key, val in scope.get("headers", []):
                if key == header_name:
                    client_ip = val.decode().split(",")[0].strip()
                    break
        is_auth = path.startswith("/auth/login") or path.startswith("/auth/register")
        limit = self.auth_max if is_auth else self.max_requests
        window = self.auth_window if is_auth else self.window

        now = time.time()
        with self._lock:
            timestamps = self._storage[client_ip]
            cutoff = now - window
            while timestamps and timestamps[0] < cutoff:
                timestamps.pop(0)
            if len(timestamps) >= limit:
                retry_after = int(timestamps[0] + window - now) + 1
                response = JSONResponse(
                    status_code=429,
                    content={"detail": f"请求过于频繁，请 {retry_after} 秒后重试"},
                    headers={"Retry-After": str(retry_after)},
                )
                await response(scope, receive, send)
                return
            timestamps.append(now)

        await self.app(scope, receive, send)
