# syntax=docker/dockerfile:1.6
FROM mambaorg/micromamba:1.5.8 AS build
SHELL ["bash","-lc"]

# speed + ensure git exists during env creation
ENV MAMBA_NO_BANNER=1 MAMBA_DOWNLOAD_THREADS=8 MAMBA_EXTRACT_THREADS=8
RUN micromamba install -y -n base -c conda-forge git ca-certificates \
 && micromamba clean --all --yes

COPY backend/env.yml /tmp/env.yml

# cache conda pkgs so subsequent builds are fast
RUN --mount=type=cache,target=/opt/conda/pkgs \
    micromamba create -y -n app -f /tmp/env.yml \
 && micromamba run -n app git --version \
 && micromamba run -n app python -m pip --version

FROM mambaorg/micromamba:1.5.8
SHELL ["bash","-lc"]
WORKDIR /app
COPY --from=build /opt/conda/envs/app /opt/conda/envs/app
ENV PATH=/opt/conda/envs/app/bin:$PATH
COPY backend/ /app/
EXPOSE 3200
CMD ["uvicorn","main:app","--host","0.0.0.0","--port","3200"]
