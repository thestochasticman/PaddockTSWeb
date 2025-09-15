#!/usr/bin/env bash
set -euo pipefail
export PYTHONUNBUFFERED=1
uvicorn main:app --reload --host 0.0.0.0 --port 3200
