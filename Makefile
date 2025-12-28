.PHONY: pipeline pipeline-json build dev jupyter clean help test smoke-test nginx copy-charts

help:
	@echo "Available commands:"
	@echo ""
	@echo "  Development:"
	@echo "    make dev          - Start frontend dev server"
	@echo "    make jupyter      - Start Jupyter notebook server"
	@echo ""
	@echo "  Data Pipeline:"
	@echo "    make pipeline     - Run full pipeline (JSON + charts)"
	@echo "    make pipeline-json- Run pipeline (JSON only, faster)"
	@echo "    make copy-charts  - Copy charts to frontend content"
	@echo ""
	@echo "  Build & Deploy:"
	@echo "    make build        - Build static frontend"
	@echo "    make nginx        - Start nginx data server"
	@echo "    make nginx-prod   - Build production nginx with data"
	@echo ""
	@echo "  Testing:"
	@echo "    make test         - Run all tests"
	@echo "    make smoke-test   - Run smoke tests against nginx"
	@echo ""
	@echo "  Cleanup:"
	@echo "    make clean        - Remove generated files"

# ============================================
# Development
# ============================================

# Start development server
dev:
	docker compose up frontend-dev

# Start Jupyter for exploration
jupyter:
	docker compose up jupyter

# ============================================
# Data Pipeline
# ============================================

# Run full data pipeline (JSON + charts)
pipeline:
	docker compose run --rm pipeline

# Run pipeline for JSON only (faster)
pipeline-json:
	docker compose run --rm pipeline-json

# Copy charts from pipeline output to frontend content
copy-charts:
	@echo "Copying charts to frontend content collection..."
	@mkdir -p frontend/src/content/charts
	@if [ -d "data-pipeline/output/charts" ]; then \
		cp -r data-pipeline/output/charts/* frontend/src/content/charts/; \
		echo "Charts copied successfully."; \
	else \
		echo "No charts found. Run 'make pipeline' first."; \
	fi

# ============================================
# Build & Deploy
# ============================================

# Build static site
build: copy-charts
	docker compose run --rm frontend-build

# Start nginx data server (development, mounts output volume)
nginx:
	docker compose up nginx

# Build production nginx with data baked in
nginx-prod:
	@if [ ! -d "data-pipeline/output" ]; then \
		echo "Error: No output directory. Run 'make pipeline' first."; \
		exit 1; \
	fi
	docker compose build nginx-prod
	docker compose up nginx-prod

# ============================================
# Testing
# ============================================

# Run all tests
test: test-frontend test-pipeline

# Run frontend tests
test-frontend:
	cd frontend && npm test

# Run pipeline tests (requires conda environment)
test-pipeline:
	cd data-pipeline && python -m pytest -v

# Run smoke tests against nginx
smoke-test:
	@echo "Starting nginx and running smoke tests..."
	docker compose up -d nginx
	@sleep 3
	docker compose run --rm smoke-test
	docker compose down nginx

# ============================================
# Cleanup
# ============================================

# Clean generated files
clean:
	rm -rf data-pipeline/output/
	rm -rf frontend/src/content/charts/
	rm -rf frontend/public/data/*.json
	rm -rf frontend/public/data/fertility/*.json
	rm -rf frontend/public/data/seasonality/*.json
	rm -rf frontend/dist/
	rm -rf frontend/.astro/

# Deep clean (includes node_modules)
clean-all: clean
	rm -rf frontend/node_modules/
