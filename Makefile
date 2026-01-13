.PHONY: pipeline pipeline-json pipeline-charts pipeline-states dev clean help test build-prod test-prod deploy tunnel

# Conda environment for Python pipeline
CONDA_ENV := hmd-pipeline

# Environment variables for Python pipeline (matches VS Code launch.json)
export PYTHONPATH := $(CURDIR)/data-pipeline/src
export HMD_DATA_DIR := $(CURDIR)/hmd_data
export UN_DATA_DIR := $(CURDIR)/data

# Run Python in the conda environment
PYTHON := conda run --no-capture-output -n $(CONDA_ENV) python

help:
	@echo "Available commands:"
	@echo ""
	@echo "  Development:"
	@echo "    make dev              - Start frontend dev server"
	@echo ""
	@echo "  Data Pipeline (uses hmd-pipeline conda environment automatically):"
	@echo "    make pipeline         - Run full pipeline (JSON + charts)"
	@echo "    make pipeline-json    - Run pipeline (JSON only, faster)"
	@echo "    make pipeline-charts  - Run pipeline (JSON + charts)"
	@echo "    make pipeline-states  - Run US states only (JSON + charts)"
	@echo ""
	@echo "  Build & Deploy:"
	@echo "    make build-prod       - Build production Docker image"
	@echo "    make test-prod        - Test production build locally"
	@echo "    make deploy           - Deploy to production server"
	@echo "    make tunnel           - SSH tunnel to private registry"
	@echo ""
	@echo "  Testing:"
	@echo "    make test             - Run all tests"
	@echo "    make test-frontend    - Run frontend tests only"
	@echo "    make test-pipeline    - Run pipeline tests only"
	@echo ""
	@echo "  Cleanup:"
	@echo "    make clean            - Remove generated files"

# ============================================
# Development
# ============================================

# Start development server (local npm)
dev:
	cd frontend && npm run dev

# ============================================
# Data Pipeline (uses conda environment automatically)
# ============================================

# Run full data pipeline (JSON + charts for countries and states)
pipeline:
	cd data-pipeline && $(PYTHON) scripts/run_pipeline.py --json --charts --states

# Run pipeline for JSON only (faster, no charts)
pipeline-json:
	cd data-pipeline && $(PYTHON) scripts/run_pipeline.py --json

# Run pipeline with charts (JSON + charts for countries)
pipeline-charts:
	cd data-pipeline && $(PYTHON) scripts/run_pipeline.py --json --charts

# Run US states only pipeline (JSON + charts, skips country data)
pipeline-states:
	cd data-pipeline && $(PYTHON) scripts/run_pipeline.py --states-only --json --charts

# ============================================
# Build & Deploy
# ============================================

# Build production frontend Docker image
build-prod:
	cd frontend && docker build -t birth-heatmaps:latest -f Dockerfile.prod .

# Test production build locally (http://localhost:8422)
test-prod:
	cd frontend && docker compose -f docker-compose.dev.yml up --build

# Deploy to production server (also builds production image locally)
deploy:
	./deploy/deploy.sh

# SSH tunnel to private registry (for manual operations)
tunnel:
	@echo "Starting SSH tunnel to registry on localhost:5001..."
	@echo "(Using port 5001 to avoid macOS AirPlay conflict on port 5000)"
	@echo "Press Ctrl+C to close the tunnel."
	ssh -L 5001:localhost:5000 root@152.53.169.131

# ============================================
# Testing
# ============================================

# Run all tests
test: test-frontend test-pipeline

# Run frontend tests
test-frontend:
	cd frontend && npm test

# Run pipeline tests (uses conda environment automatically)
test-pipeline:
	cd data-pipeline && $(PYTHON) -m pytest -v

# ============================================
# Cleanup
# ============================================

# Clean generated files
clean:
	rm -rf data-pipeline/output/
	rm -rf frontend/src/assets/charts/
	rm -rf frontend/src/assets/data/
	rm -rf frontend/public/data/*.json
	rm -rf frontend/public/data/fertility/*.json
	rm -rf frontend/public/data/seasonality/*.json
	rm -rf frontend/dist/
	rm -rf frontend/.astro/

# Deep clean (includes node_modules)
clean-all: clean
	rm -rf frontend/node_modules/
