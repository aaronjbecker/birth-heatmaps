# Nginx container for serving static data files (development)
# Data files are mounted as a volume in development

FROM nginx:alpine

# Install curl for healthchecks
RUN apk add --no-cache curl

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY default.conf /etc/nginx/conf.d/default.conf

# Create data directory (will be mounted in development)
RUN mkdir -p /usr/share/nginx/html/data

# Health check
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
