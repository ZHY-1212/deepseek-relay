import time
import logging
from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates

from app.config import settings
from app.store.json_store import JsonStore
from app.store.user_store import UserStore
from app.store.usage_store import UsageStore
from app.store.tier_store import TierStore
from app.store.order_store import OrderStore
from app.store.settings_store import SettingsStore

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger("deepseek-relay")

user_store: UserStore
usage_store: UsageStore
tier_store: TierStore
order_store: OrderStore
settings_store: SettingsStore


@asynccontextmanager
async def lifespan(app: FastAPI):
    global user_store, usage_store, tier_store, order_store, settings_store
    data = Path(settings.data_dir)
    data.mkdir(parents=True, exist_ok=True)
    user_store = UserStore(JsonStore(str(data / "users.json")))
    usage_store = UsageStore(JsonStore(str(data / "usage.json")))
    tier_store = TierStore(JsonStore(str(data / "tiers.json")))
    order_store = OrderStore(JsonStore(str(data / "orders.json")))
    settings_store = SettingsStore(JsonStore(str(data / "settings.json")))
    logger.info("DeepSeek Relay started")
    yield
    # Graceful shutdown
    from app.services.proxy_service import ProxyService
    from app.routers.proxy_router import proxy_service
    await proxy_service.close()
    logger.info("DeepSeek Relay shut down")


app = FastAPI(title="DeepSeek Relay - AI API 平台", version="1.0.0", lifespan=lifespan)

app.add_middleware(GZipMiddleware, minimum_size=500)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True if settings.cors_origins != ["*"] else False,
    allow_methods=["*"],
    allow_headers=["*"],
)

from starlette.responses import Response

class NoCacheStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope) -> Response:
        response = await super().get_response(path, scope)
        # Versioned files (bundle.js, app.css) can be cached long
        if 'bundle.js' in path:
            response.headers["Cache-Control"] = "public, max-age=604800"  # 1 week
        else:
            response.headers["Cache-Control"] = "no-cache"
        return response

static_dir = Path(__file__).parent / "static"
static_dir.mkdir(parents=True, exist_ok=True)
app.mount("/static", NoCacheStaticFiles(directory=str(static_dir)), name="static")

templates = Jinja2Templates(directory=str(Path(__file__).parent / "templates"))

# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration = time.time() - start
    logger.info(
        "%s %s -> %s (%.0fms)",
        request.method, request.url.path, response.status_code, duration * 1000,
    )
    return response

# Register rate limiting (before auth, pure ASGI)
from app.middleware.rate_limit import RateLimitMiddleware
app.add_middleware(RateLimitMiddleware)

# Register auth middleware
from app.auth.middleware import AuthMiddleware
app.add_middleware(AuthMiddleware)

# Register routers
from app.routers.auth_router import router as auth_router
from app.routers.proxy_router import router as proxy_router
from app.routers.dashboard_router import router as dashboard_router
from app.routers.admin_router import router as admin_router
from app.routers.payment_router import router as payment_router
from app.routers.docgen_router import router as docgen_router

app.include_router(docgen_router)
app.include_router(auth_router)
app.include_router(proxy_router)
app.include_router(dashboard_router)
app.include_router(admin_router)
app.include_router(payment_router)


@app.get("/health")
async def health():
    import httpx
    healthy = True
    deepseek_ok = False
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(
                "https://api.deepseek.com/v1/models",
                headers={"Authorization": f"Bearer {settings.deepseek_api_key}"},
            )
            deepseek_ok = resp.status_code < 500
    except Exception:
        pass

    data_ok = Path(settings.data_dir).exists()
    healthy = deepseek_ok and data_ok

    return {
        "status": "ok" if healthy else "degraded",
        "deepseek_api": "reachable" if deepseek_ok else "unreachable",
        "data_store": "ok" if data_ok else "missing",
    }


@app.get("/")
async def root():
    return {"message": "DeepSeek Relay API", "version": "1.0.0"}


@app.get("/app")
async def spa(request: Request):
    css_content = ""
    css_path = Path(__file__).parent / "static" / "css" / "app.css"
    try:
        css_content = css_path.read_text(encoding="utf-8")
    except Exception:
        pass
    # Auto-version busting: use file modification time
    js_path = Path(__file__).parent / "static" / "js" / "bundle.js"
    js_version = str(int(js_path.stat().st_mtime)) if js_path.exists() else "1"
    return templates.TemplateResponse("index.html", {
        "request": request,
        "inline_css": css_content,
        "js_version": js_version
    })
