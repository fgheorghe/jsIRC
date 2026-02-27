FROM node:24-slim

# Install Python 3 for the web client HTTP server
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Node.js dependencies first (layer cache)
COPY package.json package-lock.json ./
RUN npm ci

# Copy application files
COPY server.js motd.txt ./
COPY public/ ./public/

# Create logs directory
RUN mkdir -p logs

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Socket.IO / WebSocket port, TCP IRC port, web client port
EXPOSE 31337 6667 8080

ENTRYPOINT ["docker-entrypoint.sh"]
