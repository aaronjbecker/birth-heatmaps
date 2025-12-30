# Deployment

This directory contains scripts for deploying the Birth Heatmaps frontend to production.

## Prerequisites

1. **SSH access** to the production server
2. **Docker Desktop** (macOS/Windows) or **Docker Engine** (Linux)
3. **Private registry** running on the production server at `localhost:5000`

## Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and set `DEPLOY_SERVER`:
   ```bash
   DEPLOY_SERVER=user@your-server-ip
   ```

3. Add insecure registry to Docker:
   - **Docker Desktop** (macOS/Windows): Settings → Docker Engine → add to JSON:
     ```json
     "insecure-registries": ["host.docker.internal:5001"]
     ```
   - **Linux**: Edit `/etc/docker/daemon.json`:
     ```json
     "insecure-registries": ["localhost:5001"]
     ```
   - Restart Docker after making changes

## Usage

```bash
# From project root
make deploy

# Or directly
./deploy/deploy.sh
```

## How It Works

1. Establishes SSH tunnel from local port 5001 to server's registry (port 5000)
2. Builds the Docker image locally
3. Pushes to the private registry through the tunnel
4. SSHs to server and pulls/restarts the container

## Platform-Specific Notes

### macOS: Port 5000 Conflict

macOS Monterey and later use port 5000 for **AirPlay Receiver**. The deploy script uses port 5001 by default to avoid this conflict.

If you still have issues, you can disable AirPlay Receiver:
- System Settings → General → AirDrop & Handoff → AirPlay Receiver → Off

### macOS/Windows: Docker Desktop Networking

Docker Desktop runs in a Linux VM. When Docker tries to connect to `localhost`, it connects to the VM's localhost, not your machine's localhost where the SSH tunnel is listening.

The deploy script automatically uses `host.docker.internal` on macOS/Windows, which Docker Desktop resolves to the host machine.

### Linux: Native Docker

On Linux, Docker runs natively without a VM, so `localhost` works correctly. The script auto-detects Linux and uses `localhost` as the registry host.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DEPLOY_SERVER` | (required) | SSH connection string (e.g., `user@ip`) |
| `LOCAL_REGISTRY_PORT` | `5001` | Local port for SSH tunnel |
| `REGISTRY_HOST` | auto-detected | `host.docker.internal` (macOS/Windows) or `localhost` (Linux) |

## Troubleshooting

### "Port 5001 is already in use"

Something else is using port 5001. Either:
- Kill the process: `lsof -i :5001` to find it, then kill
- Use a different port: Set `LOCAL_REGISTRY_PORT=5002` in `.env`

### "context deadline exceeded" or timeout errors

Docker can't reach the registry. Check:
1. SSH tunnel is running: `lsof -i :5001`
2. Registry is accessible: `curl http://localhost:5001/v2/` (should return `{}`)
3. Insecure registry is configured correctly for your platform (see Configuration above)

### "request canceled while waiting for connection"

On macOS/Windows, this usually means Docker is trying to connect to `localhost` instead of `host.docker.internal`. Verify:
1. The script output shows `Using registry: host.docker.internal:5001`
2. Docker's insecure-registries includes `host.docker.internal:5001`

### SSH tunnel closes unexpectedly

The script uses an SSH control socket to manage the tunnel. If a previous run was interrupted, clean up:
```bash
rm deploy/deploy_tunnel.sock
```

## Files

- `deploy.sh` - Main deployment script
- `docker-compose.prod.yml` - Production Docker Compose (deployed to server)
- `.env` - Local configuration (not committed)
- `.env.example` - Configuration template
