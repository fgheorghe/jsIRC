#!/bin/sh
# Script used for starting a jsirc server

# Path to nodejs binary
NODEJS_PATH=/usr/bin/nodejs

# Check if pid file exists
if [ -f server.pid ]; then
	# Check if process is still alive
	if ps -p `cat server.pid` > /dev/null
	then
		echo -n "Server already running, please stop or restart before running this script.\n"
		return 1
	fi
fi

# Start server
nohup ${NODEJS_PATH} server.js >> /dev/null &

# Save PID for later user (e.g. when restarting / starting server)
echo $! > server.pid

echo -n "Server started.\n"

return 0
