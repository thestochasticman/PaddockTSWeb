from pydantic import BaseModel
from typing import Tuple
from typing import List

MediaTriple = Tuple[str, float, str]

class PaddockVisualSummary(BaseModel):
    photos: List[MediaTriple]
    videos: List[MediaTriple]