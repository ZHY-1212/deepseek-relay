from fastapi import Request, HTTPException
from app.models.user import User


def get_current_user(request: Request) -> User:
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user
