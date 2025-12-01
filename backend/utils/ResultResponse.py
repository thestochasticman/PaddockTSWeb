from typing_extensions import Any
from pydantic import BaseModel

class ResultResponse(BaseModel):
    status: str
    photos: list[tuple[str, float, str]]
    videos: list[tuple[str, float, str]]
    meta: dict[str, Any]