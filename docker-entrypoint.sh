#!/bin/sh
set -e

cleanup() {
    echo "[entrypoint] Shutting down..."
    kill $(jobs -p) 2>/dev/null
    exit 0
}
trap cleanup TERM INT

echo "[irc-server] Starting Node.js IRC server..."
node /app/server.js &
NODE_PID=$!

echo "[web-client] Starting Python HTTP server..."
python3 -m http.server 8080 --directory /app/public &
PYTHON_PID=$!

# Exit if either process dies
wait $NODE_PID && wait $PYTHON_PID
