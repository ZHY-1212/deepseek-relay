from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel

from app.dependencies import get_current_user
from app.services.docgen_service import generate_doc

router = APIRouter(prefix="/docgen", tags=["文档生成"])


class DocGenRequest(BaseModel):
    doc_type: str  # pptx, xlsx, docx
    prompt: str


@router.post("/generate")
async def generate(request: Request, body: DocGenRequest):
    user = get_current_user(request)

    if body.doc_type not in ("pptx", "xlsx", "docx"):
        raise HTTPException(status_code=400, detail="不支持的文件类型")

    if len(body.prompt) < 5:
        raise HTTPException(status_code=400, detail="需求描述至少5个字")

    if len(body.prompt) > 2000:
        raise HTTPException(status_code=400, detail="描述不能超过2000字")

    try:
        file_bytes, filename = await generate_doc(body.doc_type, body.prompt)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"生成失败：{str(e)}")

    media_types = {
        "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }

    from urllib.parse import quote
    safe_name = quote(filename, safe='')
    return Response(
        content=file_bytes,
        media_type=media_types[body.doc_type],
        headers={"Content-Disposition": f"attachment; filename*=UTF-8''{safe_name}"},
    )
