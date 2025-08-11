# Backend (FastAPI)

## Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
./run.sh
```
API will run at http://localhost:8000

## Endpoints
- POST /run
- GET /results/{job_id}
- Static files under /static/
