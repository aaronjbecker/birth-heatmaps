# Frontend Dockerfile for development and building
FROM node:20-slim

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Default command for development
CMD ["npm", "run", "dev", "--", "--host"]

# For production build, run:
# docker run --rm -v $(pwd):/app frontend npm run build
