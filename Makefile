.PHONY: pipeline build dev jupyter clean help

help:
	@echo "Available commands:"
	@echo "  make pipeline   - Run data pipeline (generates JSON)"
	@echo "  make build      - Build static frontend"
	@echo "  make dev        - Start frontend dev server"
	@echo "  make jupyter    - Start Jupyter notebook server"
	@echo "  make clean      - Remove generated files"

# Run data pipeline
pipeline:
	docker compose run --rm pipeline

# Build static site
build: pipeline
	docker compose run --rm frontend-dev npm run build

# Start development server
dev:
	docker compose up frontend-dev

# Start Jupyter for exploration
jupyter:
	docker compose up jupyter

# Clean generated files
clean:
	rm -rf frontend/public/data/*.json
	rm -rf frontend/public/data/fertility/*.json
	rm -rf frontend/public/data/seasonality/*.json
	rm -rf frontend/dist/
	rm -rf frontend/.astro/
