# jsIRC

IRC 2.0 Server (JavaScript Web IRC Server and Client) implementation, using Node.js, Socket.io, Extjs, and jQuery.  

Based on [RFC 2812](http://tools.ietf.org/html/rfc2812).

The server is compatible with both browser-based web clients (via Socket.IO) and standard TCP IRC clients such as mIRC, KVirc, HexChat, or any other RFC 2812 compliant client. Both connection types can be used simultaneously.

## Architecture

jsIRC consists of two components:

- **IRC server** (`server.js`): A Node.js process that listens for both WebSocket connections (via Socket.IO) and raw TCP connections (for standard IRC clients). These can be used simultaneously.
- **Web client** (`public/`): A browser-based IRC client built with ExtJS 6 and Socket.IO. It must be served by a separate HTTP server (Apache, nginx, or any static file server).

## Requirements

- Node.js >= 24.0.0 (use [nvm](https://github.com/nvm-sh/nvm) to manage versions)
- npm
- [forever](https://github.com/foreverjs/forever) (for running the server as a background process)

## Installation

Install Node.js dependencies:

```
npm install
```

Install `forever` globally for process management:

```
npm install -g forever
```

## Configuration

All configuration is in a single file: `public/config.js`. This file is loaded both by the Node.js server process and by the web client in the browser.

### Server settings

```js
var Config = {
    Server: {
        WEB: {
            Port: 31337,       // Port the Socket.IO server listens on
            Host: '0.0.0.0'    // Bind address for the Socket.IO server
        },
        TCP: {
            Port: 6667,        // Port the raw TCP IRC server listens on
            Host: '0.0.0.0'    // Bind address for the TCP server
            Host: '127.0.0.1'  // Bind address for the TCP server
        },
        IRCProtocol: {
            ServerName: "localhost",
            ServerInfo: "City, Country",
            ServerComments: "Description.",
            AdminInfo: {
                Location: "City, Country",
                Organization: "Your Org",
                Email: "admin@example.com"
            },
            MotdFile: 'motd.txt',       // Path to the MOTD file
            PingFrequency: 10,          // How often to ping clients, in seconds
            MaxChannelList: 10          // Maximum channels returned by LIST
        }
    },
```

### Client settings

```js
    Client: {
        // Must match http:// + WEB.Host + : + WEB.Port + /
        ServerUrl: "http://localhost:31337/"
    },
```

The `ServerUrl` value must point to the Socket.IO server. The web client uses this URL to load the Socket.IO library and establish a connection. If the web client is served from a different host or port than the IRC server, update this value accordingly and ensure the IRC server's CORS settings allow the client's origin.

### Log settings

```js
    Log: {
        Configuration: {
            appenders: {
                console: { type: 'console' },
                file: { type: 'file', filename: 'logs/ircd.log' }
            },
            categories: {
                default: { appenders: ['console'], level: 'DEBUG' },
                ircd:    { appenders: ['console', 'file'], level: 'DEBUG' }
            }
        },
        Level: "DEBUG"
    }
}
```

Log output goes to the console and to `logs/ircd.log`. The `logs/` directory must exist before starting the server.

### CORS

If the web client is served from a different origin than the Socket.IO server (different host or port), the browser will block the connection unless CORS is enabled. By default the server allows all origins (`"*"`). To restrict access, edit the `cors.origin` value in `server.js` where `WEBChatServer` is instantiated:

```js
,socket: {
    cors: {
        origin: "http://your-client-host"  // or "*" to allow all
        ,methods: ["GET", "POST"]
    }
}
```

### Message of the Day

The MOTD is served from the file specified by `MotdFile` in config (default: `motd.txt`), relative to the working directory where `server.js` is run.

## Running with Docker

Docker Compose is the recommended way to run jsIRC. It starts both the IRC server and the web client HTTP server in a single container, with all ports exposed and logs forwarded to the console.

Build and start:

```
docker compose up --build
```

Run in the background:

```
docker compose up --build -d
```

View logs:

```
docker compose logs -f
```

Stop:

```
docker compose down
```

The container uses `network_mode: host`, which bypasses Docker's NAT layer so the IRC server logs real client IP addresses rather than Docker internal IPs. This mode is only supported on Linux. Services bind directly on the host on the following ports:

| Port  | Service                              |
|-------|--------------------------------------|
| 8080  | Web client (browser)                 |
| 31337 | Socket.IO server (used by web client)|
| 6667  | TCP IRC server (IRC clients)         |

Open `http://localhost:8080` in a browser to use the web client.

IRC log files are written to the `logs/` directory on the host (mounted as a volume).

## Running without Docker

### IRC server

Install dependencies:

```
npm install
```

Install `forever` globally for process management:

```
npm install -g forever
```

Start the server in the background using `forever`:

```
npm start
```

Stop the server:

```
npm stop
```

To run the server directly in the foreground (useful for development):

```
node server.js
```

The `logs/` directory must exist before starting the server.

### Web client

The `public/` directory must be served by an HTTP server. It does not need to be on the same host as the IRC server.

Example using Python:

```
python3 -m http.server 8080 --directory public
```

Then open `http://localhost:8080` in a browser.

For production, configure Apache or nginx to serve the `public/` directory as a static site.

## Connecting with a standard IRC client

The TCP server accepts standard IRC protocol connections on the port configured in `Config.Server.TCP.Port` (default: 6667). Any RFC 2812 compatible IRC client can connect directly to this port.

## Supported commands

### Client to server

- NICK
- USER
- WHOIS
- JOIN
- PART
- PRIVMSG
- MOTD
- LUSERS
- PONG
- PING
- CAP
- TOPIC
- LIST
- OPER
- NAMES
- QUIT
- AWAY
- MODE
- KILL
- INFO
- ADMIN
- TIME
- VERSION
- WHO
- USERS (not implemented; returns ERR_USERSDISABLED as per RFC 2812)
- WALLOPS (limited to IRC operators as per RFC 2812)
- ISON
- USERHOST
- INVITE
- KICK

### Server to client

- RPL_WELCOME
- RPL_YOURHOST
- RPL_CREATED
- RPL_MYINFO
- ERR_NOSUCHNICK
- ERR_NONICKNAMEGIVEN
- RPL_WHOISUSER
- RPL_WHOISSERVER
- RPL_ENDOFWHOIS
- ERR_NICKNAMEINUSE
- ERR_NEEDMOREPARAMS
- ERR_NOSUCHCHANNEL
- RPL_TOPIC
- RPL_NOTOPIC
- RPL_NAMREPLY
- JOIN
- PART
- ERR_NOTEXTTOSEND
- ERR_NORECIPIENT
- PRIVMSG
- RPL_WHOISCHANNELS
- QUIT
- RPL_MOTDSTART
- RPL_MOTD
- RPL_ENDOFMOTD
- ERR_NOMOTD
- RPL_LUSERCLIENT
- RPL_LUSEROP
- RPL_LUSERUNKOWN
- RPL_LUSERCHANNELS
- RPL_LUSERME
- RPL_WHOISIDLE
- RPL_WHOISOPERATOR
- PING
- RPL_LISTEND
- RPL_LIST
- RPL_YOUREOPER
- ERR_PASSWDMISMATCH
- NICK
- ERR_ERRONEUSNICKNAME
- RPL_ENDOFNAMES
- RPL_UNAWAY
- RPL_NOWAWAY
- RPL_AWAY
- ERR_UMODEUNKNOWNFLAG
- ERR_USERSDONTMATCH
- RPL_UMODEIS
- ERR_NOPRIVILEGES
- RPL_INFO
- RPL_ENDOFINFO
- RPL_ADMINME
- RPL_ADMINLOC1
- RPL_ADMINLOC2
- RPL_ADMINEMAIL
- RPL_TIME
- RPL_VERSION
- RPL_WHOREPLY
- RPL_ENDOFWHO
- ERR_USERSDISABLED
- WALLOPS
- RPL_ISON
- RPL_USERHOST
- INVITE
- RPL_INVITING
- RPL_INVITELIST
- RPL_ENDOFINVITELIST
- ERR_CHANNELISFULL
- ERR_BADCHANNELKEY
- ERR_CANNOTSENDTOCHAN
- ERR_CHANOPRIVSNEEDED
- KICK
- RPL_EXCEPTLIST
- RPL_ENDOFEXCEPTLIST
- RPL_ENDOFBANLIST
- RPL_BANLIST

## License

Copyright (c) 2013, Grosan Flaviu Gheorghe. All rights reserved.

Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

- Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
- Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
- Neither the name of the author nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL GROSAN FLAVIU GHEORGHE BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
