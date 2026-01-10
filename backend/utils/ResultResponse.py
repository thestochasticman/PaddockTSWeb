from typing_extensions import Any
from pydantic import BaseModel
from typing import Optional
from typing import Dict
from utils.paddock_visual_summary import PaddockVisualSummary

class ResultResponse(BaseModel):
    status: str
    paddock_visual_summary: PaddockVisualSummary
    topography: Optional[Dict[str, Any]] = None
    meta: dict[str, Any]