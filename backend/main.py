from PaddockTS.Environmental.OzWALD.download_ozwald_daily import download_ozwald_daily
from PaddockTS.Environmental.SILO.download_silo import download_silo
from PaddockTS.sentinel2_to_paddock_pipeline import run as run_pipeline
from fastapi.staticfiles import StaticFiles
from fastapi import BackgroundTasks
from PaddockTS.config import config
from PaddockTS.query import Query
from pydantic import BaseModel
from fastapi import FastAPI
from os.path import exists
from typing import Optional
from datetime import date
from pathlib import Path
import pandas as pd
import traceback
import threading
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
    queries.append(q.model_dump())
    return _save_queries(queries)

@app.delete("/queries/{name}")
def delete_query(name: str):
    queries = _load_queries()
    queries = [x for x in queries if x["name"] != name]
    return _save_queries(queries)


def run_environmental(query: Query):
    try:
        download_silo(query)
    except Exception:
        traceback.print_exc()
    try:
        download_ozwald_daily(query)
    except Exception:
        traceback.print_exc()


def _read_csv_as_json(path: str, date_col: str):
    if not exists(path):
        return {"error": "not ready", "dates": [], "columns": {}}
    df = pd.read_csv(path, parse_dates=[date_col])
    dates = df[date_col].dt.strftime("%Y-%m-%d").tolist()
    columns = {}
    for col in df.columns:
        if col == date_col:
            continue
        columns[col] = df[col].where(df[col].notna(), None).tolist()
    return {"dates": dates, "columns": columns}


@app.post("/run")
def run_job(req: RunRequest, background_tasks: BackgroundTasks):
    kwargs = dict(bbox=req.bbox, start=date.fromisoformat(req.start), end=date.fromisoformat(req.end))
    if req.stub:
        kwargs["stub"] = req.stub
    query = Query(**kwargs)
    threading.Thread(target=run_environmental, args=(query,), daemon=True).start()
    background_tasks.add_task(run_pipeline, query)
    return {"stub": query.stub}


@app.get("/status/{stub}")
def get_status(stub: str):
    out = f"{config.out_dir}/{stub}"
    tmp = f"{config.tmp_dir}/{stub}"
    env = f"{tmp}/Environmental"
    s = stub
    return {
        "sentinel2_download": exists(f"{tmp}/{s}_sentinel2.zarr"),
        "vegfrac_compute": exists(f"{tmp}/{s}_vegfrac.zarr"),
        "paddock_segment": exists(f"{tmp}/{s}_paddocks.gpkg"),
        "sentinel2_video": exists(f"{out}/{s}_sentinel2.mp4"),
        "sentinel2_paddocks_video": exists(f"{out}/{s}_sentinel2_paddocks.mp4"),
        "vegfrac_video": exists(f"{out}/{s}_vegfrac.mp4"),
        "vegfrac_paddocks_video": exists(f"{out}/{s}_vegfrac_paddocks.mp4"),
        "silo_ready": exists(f"{env}/{s}_silo.csv"),
        "ozwald_daily_ready": exists(f"{env}/{s}_ozwald_daily.csv"),
    }


@app.get("/data/{stub}/silo")
def get_silo_data(stub: str):
    path = f"{config.tmp_dir}/{stub}/Environmental/{stub}_silo.csv"
    return _read_csv_as_json(path, "YYYY-MM-DD")


@app.get("/data/{stub}/ozwald_daily")
def get_ozwald_daily_data(stub: str):
    path = f"{config.tmp_dir}/{stub}/Environmental/{stub}_ozwald_daily.csv"
    return _read_csv_as_json(path, "time")
