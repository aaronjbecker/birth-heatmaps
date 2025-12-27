# HMD Births Heatmaps

Interactive visualization of birth seasonality patterns using data from the Human Mortality Database and UN Population Division.

## Project Structure

```
hmd-births-heatmaps/
├── data-pipeline/          # Python data preparation
│   ├── src/
│   │   ├── config/         # Settings and country definitions
│   │   ├── loaders/        # HMD, UN, Japan data loaders
│   │   ├── processors/     # Interpolation, fertility, seasonality
│   │   ├── exporters/      # JSON and CSV export
│   │   └── schemas/        # Pandera data validation
│   ├── scripts/            # Entry point scripts
│   ├── notebooks/          # Jupyter notebooks for exploration
│   ├── environment.yml     # Conda environment
│   └── Dockerfile
├── frontend/               # Astro static site
│   ├── src/
│   │   ├── components/     # D3 heatmap components
│   │   ├── pages/          # Astro pages
│   │   └── lib/            # TypeScript utilities
│   └── public/data/        # Generated JSON data
├── docker-compose.yml
└── Makefile
```

## Data Sources

- **Human Mortality Database (HMD)**: Monthly births and population data for 41+ countries
  - https://www.mortality.org/
- **UN World Population Prospects**: Supplementary population data
  - https://population.un.org/wpp/
- **Japan Population Data**: Via fmsb R package

> **Note**: Raw data files are not included in this repository per license terms from data providers. You must download them manually from the sources above.

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for frontend development)

### Running with Docker

```bash
# Start Jupyter notebook server for data exploration
docker compose up jupyter

# Run the data pipeline (generates JSON files)
docker compose run pipeline

# Start frontend development server
docker compose up frontend-dev
```

### Local Development (without Docker)

#### Data Pipeline

```bash
cd data-pipeline

# Create conda environment
conda env create -f environment.yml
conda activate hmd-pipeline

# Run pipeline
python scripts/run_pipeline.py
```

#### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## Metrics

The pipeline computes several fertility and seasonality metrics:

- **Daily Fertility Rate**: Births per 100,000 women age 15-44
- **Seasonality Ratio**: Ratio to 12-month moving average
- **Seasonality Percentage**: Percentage of annual births per month (normalized to 30-day months)

## Development Status

- [x] Stage A: Repository infrastructure
- [x] Stage B: Python pipeline refactoring
- [ ] Stage C: Astro frontend initialization
- [ ] Stage D: D3 heatmap components
- [ ] Stage E: Integration and testing

## Pipeline Usage

```bash
# Run full pipeline (CSV + JSON export)
python data-pipeline/scripts/run_pipeline.py

# Export only JSON (for frontend)
python data-pipeline/scripts/run_pipeline.py --json

# Export only CSV (legacy format)
python data-pipeline/scripts/run_pipeline.py --csv

# Custom data directories
python data-pipeline/scripts/run_pipeline.py --hmd-dir /path/to/hmd --un-dir /path/to/un
```
