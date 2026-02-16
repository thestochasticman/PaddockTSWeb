
# # Use the official miniconda image base
# FROM continuumio/miniconda3:latest

# # Ensure the shell runs as a login shell for conda activation to work
# SHELL ["bash","-lc"]

# # OS dependencies that might not be in your specific host env
# RUN apt-get update && apt-get install -y --no-install-recommends \
#       git ca-certificates \
#     && rm -rf /var/lib/apt/lists/*

# # Set necessary ENV variables so that Python/Uvicorn behave correctly.
# # We assume the specific environment 'PaddockTSEnv' exists on your host machine 
# # inside the mounted directory (/opt/conda/envs/PaddockTSEnv)
# ENV PYTHONUNBUFFERED=1 \
#     MPLBACKEND=Agg \
#     # Add the mounted env's bin path to the overall PATH
#     PATH=/opt/conda/envs/PaddockTSEnv/bin:/opt/conda/bin:$PATH

# WORKDIR /app

# # Copy backend code into the image
# COPY backend/ /app/


# # The CMD assumes that 'uvicorn' is correctly installed within the PaddockTSEnv 
# # on your host machine. We call it simply via 'python -m uvicorn' because 
# # the ENV PATH above makes the environment's python accessible.
# CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "3200"]



FROM ubuntu:22.04

# Use bash as the shell
SHELL ["bash", "-lc"]

# Basic OS deps – adjust as needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    git \
    curl \
    tini \
  && rm -rf /var/lib/apt/lists/*

# Environment variables
# - We assume your host Miniconda is mounted at /opt/conda
# - And that the env PaddockTSEnv already exists there
ENV HOME=/root \
    PYTHONUNBUFFERED=1 \
    MPLBACKEND=Agg \
    PATH=/opt/conda/envs/PaddockTSEnv/bin:/opt/conda/bin:$PATH

# Optional: set locale to avoid some Python / lib issues
ENV LANG=C.UTF-8 \
    LC_ALL=C.UTF-8

WORKDIR /app

# PaddockTS config — written to /tmp since container runs as user 1001
RUN mkdir -p /tmp/.config && \
    echo '{"out_dir": "/borevitz_projects/data/PaddockTSWeb", "tmp_dir": "/borevitz_projects/data/PaddockTSWeb"}' \
    > /tmp/.config/PaddockTS.json && \
    chmod -R 777 /tmp/.config

# Copy backend code into the image
COPY backend/ /app

# Default command:
# relies on /opt/conda/envs/PaddockTSEnv/bin/python from the mounted env
CMD ["python", "-m", "uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "3200"]
