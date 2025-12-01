from pydantic import BaseModel
from datetime import date

class PaddockTSWebQuery(BaseModel):
    vertices: list[tuple[float, float]]
    bbox: list[float]
    start_date: date
    end_date: date