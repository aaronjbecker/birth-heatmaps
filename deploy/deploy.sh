#!/bin/bash
# Local build and push deployment script for HMD Birth Heatmaps
# Automatically manages SSH tunnel for the private registry

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Load environment variables
if [ -f "$SCRIPT_DIR/.env" ]; then
    source "$SCRIPT_DIR/.env"
else
    echo "Error: $SCRIPT_DIR/.env not found. Copy .env.example to .env and configure."
    exit 1
fi

# Validate required variables
if [ -z "$DEPLOY_SERVER" ]; then
    echo "Error: DEPLOY_SERVER not set in .env"
    exit 1
fi

SERVER="$DEPLOY_SERVER"
IMAGE_NAME="birth-heatmaps"
REGISTRY="localhost:5000"
REMOTE_PATH="~/deployments/birth-heatmaps"
SSH_CONTROL_SOCKET="$SCRIPT_DIR/deploy_tunnel.sock"

# Cleanup function to close the tunnel on exit
cleanup() {
    if [ -S "$SSH_CONTROL_SOCKET" ]; then
        echo "Step 7: Closing SSH tunnel..."
        ssh -S "$SSH_CONTROL_SOCKET" -O exit "$SERVER" 2>/dev/null || true
    fi
}
trap cleanup EXIT

echo "Step 1: Checking for SSH tunnel..."
if ! lsof -i :5000 > /dev/null 2>&1; then
    echo "Establishing SSH tunnel to $SERVER on port 5000..."
    ssh -M -S "$SSH_CONTROL_SOCKET" -f -N -L 5000:localhost:5000 "$SERVER"

    # Wait for the tunnel to stabilize
    MAX_RETRIES=10
    COUNT=0
    until lsof -i :5000 > /dev/null 2>&1 || [ $COUNT -eq $MAX_RETRIES ]; do
        sleep 0.5
        ((COUNT++))
    done

    if [ $COUNT -eq $MAX_RETRIES ]; then
        echo "Error: Failed to establish SSH tunnel."
        exit 1
    fi
else
    echo "Existing tunnel detected on port 5000."
fi

echo "Step 2: Building image locally..."
cd "$PROJECT_ROOT/frontend"
docker build -t $IMAGE_NAME:latest -f Dockerfile.prod .

echo "Step 3: Tagging image for registry..."
docker tag $IMAGE_NAME:latest $REGISTRY/$IMAGE_NAME:latest

echo "Step 4: Pushing to private registry..."
docker push $REGISTRY/$IMAGE_NAME:latest

echo "Step 5: Deploying to server..."
ssh $SERVER "mkdir -p $REMOTE_PATH"
rsync -avz "$SCRIPT_DIR/docker-compose.prod.yml" $SERVER:$REMOTE_PATH/docker-compose.yml
ssh $SERVER "cd $REMOTE_PATH && docker compose pull && docker compose up -d --remove-orphans"

echo "Step 6: Verifying deployment..."
ssh $SERVER "docker ps --filter name=birth-heatmaps --format '{{.Names}}: {{.Status}}'"

echo ""
echo "Deployment complete!"
echo "Site should be available at: https://birth-heatmaps.aaronjbecker.com"
