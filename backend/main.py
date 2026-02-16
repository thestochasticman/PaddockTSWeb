from PaddockTS.sentinel2_to_paddock_pipeline import run as run_pipeline
from PaddockTS.config import config
from PaddockTS.query import Query
from fastapi.staticfiles import StaticFiles
from fastapi import BackgroundTasks
from pydantic import BaseModel
from fastapi import FastAPI
from os.path import exists
from typing import Optional
from pathlib import Path
from datetime import date
import json
import os

os.makedirs(config.out_dir, exist_ok=True)

QUERIES_FILE = Path(config.out_dir) / "saved_queries.json"


def _load_queries() -> list:
    if QUERIES_FILE.exists():
        return json.loads(QUERIES_FILE.read_text())
    return []


def _save_queries(queries: list) -> list:
    QUERIES_FILE.write_text(json.dumps(queries, indent=2))
    return queries

app = FastAPI()
app.mount("/static", StaticFiles(directory=config.out_dir), name="static")

class RunRequest(BaseModel):
    bbox: list[float]
    start: str
    end: str
    stub: Optional[str] = None


class SavedQueryModel(BaseModel):
    name: str
    bbox: dict
    vertices_text: str
    start_date: str
    end_date: str
    stub: Optional[str] = None


@app.get("/queries")
def list_queries():
    return _load_queries()


@app.post("/queries")
def save_query(q: SavedQueryModel):
    queries = _load_queries()
    queries = [x for x in queries if x["name"] != q.name]
    queries.append(q.dict())
    return _save_queries(queries)


@app.delete("/queries/{name}")
def delete_query(name: str):
    queries = _load_queries()
    queries = [x for x in queries if x["name"] != name]
    return _save_queries(queries)


@app.post("/run")
def run_job(req: RunRequest, background_tasks: BackgroundTasks):
    kwargs = dict(bbox=req.bbox, start=date.fromisoformat(req.start), end=date.fromisoformat(req.end))
    if req.stub:
        kwargs["stub"] = req.stub
    query = Query(**kwargs)
    background_tasks.add_task(run_pipeline, query)
    return {"stub": query.stub}


@app.get("/status/{stub}")
def get_status(stub: str):
    out = f"{config.out_dir}/{stub}"
    s = stub
    return {
        "sentinel2_video": exists(f"{out}/{s}_sentinel2.mp4"),
        "sentinel2_paddocks_video": exists(f"{out}/{s}_sentinel2_paddocks.mp4"),
        "vegfrac_video": exists(f"{out}/{s}_vegfrac.mp4"),
        "vegfrac_paddocks_video": exists(f"{out}/{s}_vegfrac_paddocks.mp4"),
    }
