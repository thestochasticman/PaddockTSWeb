from PaddockTS.IndicesAndVegFrac.add_indices_and_veg_frac import add_indices_and_veg_frac
from utils.latlon_and_deg_buffer_from_bbox import latlon_and_def_buffer_deg_from_bbox
from utils.paddock_visual_summary import PaddockVisualSummary
from utils.latlon_from_bbox_and_buffer import latlon_from_bbox_and_buffer
from PaddockTS.Plotting.checkpoint_plots import plot as plot_checkpoints
from PaddockTS.Plotting.topographic_plots import plot_topography
from PaddockTS.Data.environmental import download_environmental_data
from PaddockTS.PaddockSegmentation.get_paddocks import get_paddocks
from utils.PaddockTSWebQuery import PaddockTSWebQuery
from utils.get_aspect_ratio import get_aspect_ratio
from fastapi.middleware.cors import CORSMiddleware
from utils.get_stub_job_id import get_stub_job_id
from utils.ResultResponse import ResultResponse
from PaddockTS.get_outputs import get_outputs
from fastapi.staticfiles import StaticFiles
from utils.RunResponse import RunResponse
from fastapi import BackgroundTasks
from PaddockTS.query import Query
from fastapi import HTTPException
from os.path import exists
from fastapi import FastAPI
from pathlib import Path
import matplotlib
import json
import os
from time import sleep

def run_pipeline_paddock_indices_veg_frac_checkpoints(query: Query):
    get_paddocks(query)
    add_indices_and_veg_frac(query)
    plot_checkpoints(query)
    return

def run_environmental_pipeline(query: Query):
    download_environmental_data(query)
    while not exists(query.path_ds2):
        sleep(0.1)
    plot_topography(query)

def load_topography_json(path: Path):
    try:
        d = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(d, dict):
            return None
        if d.get("kind") != "paddockts.topography.react.v1":
            return None
        if "extent4326" not in d or "layers" not in d:
            return None
        return d
    except Exception:
        return None


os.environ["MPLBACKEND"] = "Agg"
matplotlib.use("Agg", force=True)

app = FastAPI(title="PaddockTS Backend", version="0.2.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000",  "http://127.0.0.1:3000", "http://127.0.0.1:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STATIC_DIR = Path('/borevitz_projects/data/PaddockTSWeb')
# STATIC_DIR = Path('PaddockTSWeb')
STATIC_DIR.mkdir(parents=True, exist_ok=True)
PATH_STUB_MAPPING = STATIC_DIR / '.json'
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")

@app.post("/run", response_model=RunResponse)
def run_job(q: PaddockTSWebQuery, background_tasks: BackgroundTasks):
    lat, lon, buffer = latlon_and_def_buffer_deg_from_bbox(q.bbox)
    buffer = max(0.01, buffer)
    q1 = Query(
        lat,
        lon,
        buffer,
        start_time=q.start_date,
        end_time=q.end_date,
        tmp_dir=str(STATIC_DIR),
        out_dir=str(STATIC_DIR)
    )
    job_id = get_stub_job_id(q1.get_stub(), PATH_STUB_MAPPING)
    # job_id = '-'.join([str(c) for c in q.bbox] + [str(q.start_date), str(q.end_date)])

    q2 = Query(
        lat,
        lon,
        buffer,
        start_time=q.start_date,
        end_time=q.end_date,
        tmp_dir=str(STATIC_DIR),
        out_dir=str(STATIC_DIR),
        stub=str(job_id)
    )
    job_dir = STATIC_DIR / job_id
    meta_path = job_dir / "meta.json"
    meta = {
        'vertices': q.vertices,
        'bbox': q.bbox,
        'start_date': str(q.start_date),
        'end_date': str(q.end_date)}
    with open(meta_path, '+w') as file:
        json.dump(meta, file)
    # background_tasks.add_task(get_outputs, q2)
    if not all(
        [
            exists(f'{STATIC_DIR}/{job_id}/checkpoints/{job_id}_paddock_map_auto_fourier.png'),
            exists(f'{STATIC_DIR}/{job_id}/checkpoints/{job_id}_paddock_map_auto_rgb.png'),
            exists(f'{STATIC_DIR}/{job_id}/checkpoints/{job_id}_manpad_RGB.mp4'),
            exists(f'{STATIC_DIR}/{job_id}/checkpoints/{job_id}_manpad_vegfrac.mp4')
        ]
    ):
        background_tasks.add_task(run_pipeline_paddock_indices_veg_frac_checkpoints, q2)

    if not all(
            [
                
                    exists(f"static/{job_id}/environmental/{job_id}_elevation.png"),
                    exists(f"static/{job_id}/environmental/{job_id}_elevation_cbar.png"),

                    exists(f"static/{job_id}/environmental/{job_id}_accumulation.png"),
                    exists("static/{job_id}/environmental/{job_id}_accumulation_cbar.png"),

                    exists(f"static/{job_id}/environmental/{job_id}_aspect.png"),
                    exists(f"static/{job_id}/environmental/{job_id}_aspect_cbar.png"),

                    exists(f"static/{job_id}/environmental/{job_id}_slope.png"),
                    exists(f"static/{job_id}/environmental/{job_id}_slope_cbar.png"),
            ]
    ):
        background_tasks.add_task(run_environmental_pipeline, q2)
        
    # background_tasks.add_task(download_environmental_data, q2)


    return RunResponse(job_id=job_id)

@app.get("/results/{job_id}", response_model=ResultResponse)
def get_results(job_id: str):
    job_dir = STATIC_DIR / job_id
    if not job_dir.exists():
        raise HTTPException(status_code=404, detail="job_id not found")
    
    if not all(
        [
            exists(f'{STATIC_DIR}/{job_id}/checkpoints/{job_id}_paddock_map_auto_fourier.png'),
            exists(f'{STATIC_DIR}/{job_id}/checkpoints/{job_id}_paddock_map_auto_rgb.png'),
            exists(f'{STATIC_DIR}/{job_id}/checkpoints/{job_id}_manpad_RGB.mp4'),
            exists(f'{STATIC_DIR}/{job_id}/checkpoints/{job_id}_manpad_vegfrac.mp4')
        ]
    ):
        raise HTTPException(status_code=404, detail="job_id not found")
        
    aspect_ratio = get_aspect_ratio(f'{STATIC_DIR}/{job_id}/checkpoints/{job_id}_paddock_map_auto_fourier.png')
    photos = [
        ('Fourier Image of NDWI Over Time ', aspect_ratio, f'static/{job_id}/checkpoints/{job_id}_paddock_map_auto_fourier.png'),
        ('Labelled Paddocks', aspect_ratio, f"static/{job_id}/checkpoints/{job_id}_paddock_map_auto_rgb.png"),
    ]
    videos = [
        # "https://samplelib.com/lib/preview/mp4/sample-5s.mp4"
        ('RGB Video Summary', aspect_ratio, f"static/{job_id}/checkpoints/{job_id}_manpad_RGB.mp4"),
        ('Vegfrac Video Summary', aspect_ratio, f"static/{job_id}/checkpoints/{job_id}_manpad_vegfrac.mp4"),
    ]

    paddock_visual_summary = PaddockVisualSummary(photos=photos, videos=videos)
    

    meta_path = job_dir / "meta.json"
    if meta_path.exists():
        meta = json.loads(meta_path.read_text(encoding="utf-8"))

    topo = {
        "layers": [
            {
                "id": "elevation",
                "title": "Elevation",
                "map": f"static/{job_id}/environmental/{job_id}_elevation.png",
                "cbar": f"static/{job_id}/environmental/{job_id}_elevation_cbar.png",

                "w": 6,
                "aspectRatio": aspect_ratio,
            },
            {
                "id": "accumulation",
                "title": "Accumulation",
                "map": f"static/{job_id}/environmental/{job_id}_accumulation.png",
                "cbar": f"static/{job_id}/environmental/{job_id}_accumulation_cbar.png",
                "w": 6,
                "aspectRatio": aspect_ratio
            },
            {
                "id": "slope",
                "title": "Slope",
                "map": f"static/{job_id}/environmental/{job_id}_slope.png",
                "cbar": f"static/{job_id}/environmental/{job_id}_slope_cbar.png",
                "w": 6,
                "aspectRatio": aspect_ratio
            },
            {
                "id": "aspect",
                "title": "Aspect",
                "map": f"static/{job_id}/environmental/{job_id}_aspect.png",
                "cbar": f"static/{job_id}/environmental/{job_id}_aspect_cbar.png",
                "w": 6,
                "aspectRatio": aspect_ratio
            },

      ]
    }

    return ResultResponse(
        status="done",
        paddock_visual_summary=paddock_visual_summary,
        topography=topo,
        meta=meta,
    )
