# Backend (FastAPI)

## Setup and run Locally
```
cd backend

conda env create -f env.yml

conda activate PaddockTSEnv

chmod +x ./run.sh

./run.sh
```

## Deployment

```
sudo docker compose up backend
```

## Shutting Down

```
sudo docker compose down backend
```