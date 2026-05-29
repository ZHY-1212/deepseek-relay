"""Payment gateway integration — PayJS (personal WeChat Pay)."""

import hashlib
import httpx
from app.config import settings


class PayJSGateway:
    """PayJS native QR code payment."""

    def __init__(self):
        self.mchid = settings.payjs_mchid
        self.key = settings.payjs_key
        self.base = "https://payjs.cn/api"

    def _sign(self, params: dict) -> str:
        """Generate PayJS MD5 signature."""
        raw = "&".join(f"{k}={v}" for k, v in sorted(params.items()) if v)
        raw += f"&key={self.key}"
        return hashlib.md5(raw.encode()).hexdigest().upper()

    async def create_qrcode(self, amount_yuan: float, order_id: str, body: str = "DS Relay 充值") -> dict | None:
        """Create a native payment QR code. Returns {code_url, qrcode, payjs_order_id} or None."""
        if not self.mchid or not self.key:
            return None  # PayJS not configured

        total_fee = int(amount_yuan * 100)  # PayJS uses cents
        params = {
            "mchid": self.mchid,
            "total_fee": str(total_fee),
            "out_trade_no": order_id,
            "body": body,
            "notify_url": settings.payjs_notify_url,
        }
        params["sign"] = self._sign(params)

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(f"{self.base}/native", data=params)
                data = resp.json()
                if data.get("return_code") == 1:
                    return {
                        "code_url": data.get("code_url", ""),
                        "qrcode": data.get("qrcode", ""),
                        "payjs_order_id": data.get("payjs_order_id", ""),
                    }
        except Exception:
            pass
        return None

    def verify_sign(self, params: dict) -> bool:
        """Verify callback signature."""
        sign = params.pop("sign", "")
        return self._sign(params) == sign


gateway = PayJSGateway()
