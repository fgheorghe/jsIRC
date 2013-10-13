#!/bin/sh
# Script used for stoping a jsirc server

# Check if pid file exists
if [ -f server.pid ]; then
	# Check if process is still alive
	if ps -p `cat server.pid` > /dev/null
	then
		kill -9 `cat server.pid`
		echo -n "Server stopped.\n"
		rm server.pid
		return 0
	else
		echo -n "Server not running.\n"
	fi
else
	echo -n "Pid file not found. Server not running.\n"
fi

return 1
