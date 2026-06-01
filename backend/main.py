from PaddockTS.Environmental.OzWALD.download_ozwald_daily import download_ozwald_daily
from PaddockTS.Environmental.OzWALD.download_ozwald_8day import download_ozwald_8day
from PaddockTS.Environmental.SILO.download_silo import download_silo
from PaddockTS.sentinel2_to_paddockTS_pipeline import run as run_pipeline
from fastapi.staticfiles import StaticFiles
from fastapi import BackgroundTasks
from PaddockTS.config import config
from PaddockTS.query import Query
from pydantic import BaseModel
from fastapi import FastAPI, HTTPException
from os.path import exists
from typing import Optional
from datetime import date
from pathlib import Path
import pandas as pd
import traceback
import threading
import base64
import fcntl
import glob
import json
import io
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
    try:
        download_ozwald_8day(query)
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
    try:
        query = Query(**kwargs)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    threading.Thread(target=run_environmental, args=(query,), daemon=True).start()
    background_tasks.add_task(run_pipeline, query)
    return {"stub": query.stub}


def _lookup_query_hashes(stub: str) -> Optional[tuple[str, str]]:
    if not exists(config.hash_file):
        return None
    # Shared lock: concurrent readers OK, blocks only while a writer
    # (PaddockTS.query.locked_registry, which holds LOCK_EX) is mid-truncate.
    with open(config.hash_file) as f:
        fcntl.flock(f.fileno(), fcntl.LOCK_SH)
        data = f.read()
    if not data:
        return None
    registry = json.loads(data)
    for bbox_hash, entry in registry.items():
        for q in entry.get("queries", []):
            if q["stub"] == stub:
                return bbox_hash, q["time_hash"]
    return None


@app.get("/status/{stub}")
def get_status(stub: str):
    out = f"{config.out_dir}/{stub}"
    tmp = f"{config.tmp_dir}/{stub}"
    env = f"{tmp}/Environmental"

    hashes = _lookup_query_hashes(stub)
    if hashes:
        bbox_hash, time_hash = hashes
        q_dir = f"{config.tmp_dir}/aoi/{bbox_hash}/{time_hash}"
        sentinel2_ready = exists(f"{q_dir}/sentinel2.zarr")
        sentinel2_clean_ready = exists(f"{q_dir}/sentinel2_clean.zarr")
        vegfrac_ready = exists(f"{q_dir}/fractional_cover.zarr")
        paddocks_ready = exists(f"{q_dir}/sam_paddocks.gpkg")
    else:
        sentinel2_ready = sentinel2_clean_ready = vegfrac_ready = paddocks_ready = False

    # Paddocks-derived artifacts use the stem of the paddocks file; the
    # default pipeline writes sam_paddocks.gpkg.
    paddocks_stem = "sam_paddocks"

    return {
        "sentinel2_download": sentinel2_ready,
        "sentinel2_clean": sentinel2_clean_ready,
        "vegfrac_compute": vegfrac_ready,
        "paddock_segment": paddocks_ready,
        "paddockTS_ready": exists(f"{tmp}/{paddocks_stem}_timeseries.zarr"),
        "sentinel2_video": exists(f"{out}/{stub}_sentinel2.mp4"),
        "sentinel2_paddocks_video": exists(f"{out}/{paddocks_stem}_sentinel2_paddocks.mp4"),
        "vegfrac_video": exists(f"{out}/{stub}_fractional_cover.mp4"),
        "vegfrac_paddocks_video": exists(f"{out}/{paddocks_stem}_fractional_cover_paddocks.mp4"),
        "calendar_ready": bool(glob.glob(f"{out}/{paddocks_stem}_calendar_*_p*.png")),
        "phenology_plot_ready": bool(glob.glob(f"{out}/{paddocks_stem}_phenology_p*.png")),
        "silo_ready": exists(f"{env}/{stub}_silo.csv"),
        "ozwald_daily_ready": exists(f"{env}/{stub}_ozwald_daily.csv"),
        "ozwald_8day_ready": exists(f"{env}/{stub}_ozwald_8day.csv"),
    }


def _query_from_stub(stub: str) -> Optional[Query]:
    """Reconstruct the Query for ``stub`` from the persistent registry."""
    if not exists(config.hash_file):
        return None
    with open(config.hash_file) as f:
        fcntl.flock(f.fileno(), fcntl.LOCK_SH)
        data = f.read()
    if not data:
        return None
    registry = json.loads(data)
    for bbox_hash, entry in registry.items():
        for q in entry.get("queries", []):
            if q["stub"] == stub:
                return Query(
                    bbox=entry["bbox"],
                    start=date.fromisoformat(q["start"]),
                    end=date.fromisoformat(q["end"]),
                    stub=stub,
                )
    return None


def _encode_png_base64(arr) -> str:
    """Encode an HxWx3 uint8 numpy array as a base64 PNG data URI."""
    from PIL import Image
    img = Image.fromarray(arr)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("ascii")


@app.get("/paddocks/{stub}")
def list_paddocks(stub: str):
    query = _query_from_stub(stub)
    if query is None:
        raise HTTPException(status_code=404, detail=f"unknown stub: {stub}")
    if not exists(query.sam_paddocks_path):
        raise HTTPException(status_code=409, detail="paddocks not segmented yet")
    if not exists(query.sentinel2_clean_path):
        raise HTTPException(status_code=409, detail="sentinel2_clean.zarr not ready yet")

    import geopandas as gpd
    import xarray as xr

    gdf = gpd.read_file(query.sam_paddocks_path)
    paddocks = []
    for _, row in gdf.iterrows():
        if "paddock" in gdf.columns:
            pid = str(row["paddock"])
        else:
            pid = str(row.name)
        area = float(row["area_ha"]) if "area_ha" in gdf.columns and row["area_ha"] is not None else None
        paddocks.append({"id": pid, "label": pid, "area_ha": area})
    paddocks.sort(key=lambda p: -(p["area_ha"] or 0))

    ds = xr.open_zarr(query.sentinel2_clean_path, chunks=None)
    years = sorted({int(y) for y in ds.time.dt.year.values})
    return {"paddocks": paddocks, "years": years}


@app.get("/calendar/{stub}/{paddock_id}/{year}")
def get_calendar(stub: str, paddock_id: str, year: int):
    query = _query_from_stub(stub)
    if query is None:
        raise HTTPException(status_code=404, detail=f"unknown stub: {stub}")
    if not exists(query.sentinel2_clean_path) or not exists(query.sam_paddocks_path):
        raise HTTPException(status_code=409, detail="calendar inputs not ready yet")

    from PaddockTS.Plotting.calendar_plot import extract_paddock_thumbnails
    try:
        result = extract_paddock_thumbnails(query, paddock_id, year)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

    return {
        "paddock_id": result["paddock_id"],
        "label": result["label"],
        "area_ha": result["area_ha"],
        "year": result["year"],
        "thumb_size": result["thumb_size"],
        "n_slots": result["n_slots"],
        "dates": result["dates"],
        "thumbnails": [_encode_png_base64(t) for t in result["thumbnails"]],
    }


@app.get("/phenology/{stub}/{paddock_id}/{year}")
def get_phenology(stub: str, paddock_id: str, year: int):
    query = _query_from_stub(stub)
    if query is None:
        raise HTTPException(status_code=404, detail=f"unknown stub: {stub}")

    from PaddockTS.Phenology.estimate_phenology import get_paddock_year_phenology
    try:
        return get_paddock_year_phenology(query, paddock_id, year)
    except FileNotFoundError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@app.get("/data/{stub}/silo")
def get_silo_data(stub: str):
    path = f"{config.tmp_dir}/{stub}/Environmental/{stub}_silo.csv"
    return _read_csv_as_json(path, "YYYY-MM-DD")


@app.get("/data/{stub}/ozwald_daily")
def get_ozwald_daily_data(stub: str):
    path = f"{config.tmp_dir}/{stub}/Environmental/{stub}_ozwald_daily.csv"
    return _read_csv_as_json(path, "time")


@app.get("/data/{stub}/ozwald_8day")
def get_ozwald_8day_data(stub: str):
    path = f"{config.tmp_dir}/{stub}/Environmental/{stub}_ozwald_8day.csv"
    return _read_csv_as_json(path, "time")
