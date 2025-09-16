import os
os.environ["MPLBACKEND"] = "Agg"

import matplotlib
matplotlib.use("Agg", force=True)

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from uuid import uuid4
from pathlib import Path
from datetime import date
import hashlib
import json
import numpy as np
import matplotlib.pyplot as plt
from PaddockTS.query import Query
from PaddockTS.get_outputs import get_outputs
from utils import get_stub_job_id
from PaddockTS.Plotting.checkpoint_plots import plot
from functools import partial

print('App is running')
app = FastAPI(title="Geo Viz API", version="0.2.0")


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000",  "http://127.0.0.1:3000",],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR = Path(__file__).parent / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)
PATH_STUB_MAPPING = STATIC_DIR / '.json'
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

PartialQuery = partial(
    Query,
    out_dir=STATIC_DIR,
    tmp_dir=STATIC_DIR
)

class RunResponse(BaseModel):
    job_id: str

class ResultResponse(BaseModel):
    status: str
    plots: List[str]
    videos: List[str]
    meta: Dict[str, Any]

@app.post("/run", response_model=RunResponse)
def run_job(q: Query):
    # Compute or respect stub
    job_id = get_stub_job_id(q.stub, PATH_STUB_MAPPING)
    q2 = Query(
        q.lat,
        q.lon,
        q.buffer,
        q.start_time,
        q.end_time,
        q.collections,
        q.bands,
        q.filter,
        stub=job_id,
        tmp_dir=str(STATIC_DIR),
        out_dir=str(STATIC_DIR)
    )
    get_outputs(q2)
    # plot(q2)
    return RunResponse(job_id=job_id)

@app.get("/results/{job_id}", response_model=ResultResponse)
def get_results(job_id: str):
    job_dir = STATIC_DIR / job_id
    if not job_dir.exists():
        raise HTTPException(status_code=404, detail="job_id not found")
    
    plots = [f"/static/{job_id}/{p.name}" for p in sorted(job_dir.glob("*.png"))]


    plots = [
        f"static/{job_id}/checkpoints/2_paddock_map_auto_fourier.png",
        f"static/{job_id}/checkpoints/2_paddock_map_auto_rgb.png",
    ]
    videos = [
        # "https://samplelib.com/lib/preview/mp4/sample-5s.mp4"
        f"static/{job_id}/checkpoints/2_manpad_RGB.mp4",
        f"static/{job_id}/checkpoints/2_manpad_vegfrac.mp4",
    ]

    meta_path = job_dir / "meta.json"
    meta = {}
    if meta_path.exists():
        meta = json.loads(meta_path.read_text(encoding="utf-8"))

    return ResultResponse(status="done", plots=plots, videos=videos, meta=meta)
