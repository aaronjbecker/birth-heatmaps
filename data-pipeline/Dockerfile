FROM mambaorg/micromamba:1.5-jammy

# Copy and install conda environment
COPY --chown=$MAMBA_USER:$MAMBA_USER environment.yml /tmp/environment.yml
RUN micromamba install -y -n base -f /tmp/environment.yml && \
    micromamba clean --all --yes

# Activate the environment for subsequent commands
ARG MAMBA_DOCKERFILE_ACTIVATE=1

# Set working directory
WORKDIR /app

# Copy source code
COPY --chown=$MAMBA_USER:$MAMBA_USER . .

# Set PYTHONPATH so imports work correctly
ENV PYTHONPATH=/app/src

# Default command - run the pipeline
CMD ["python", "scripts/run_pipeline.py"]
