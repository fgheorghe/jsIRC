/**
Copyright (c) 2013, Grosan Flaviu Gheorghe
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the name of the author nor the
      names of its contributors may be used to endorse or promote products
      derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL GROSAN FLAVIU GHEORGHE BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

// Load various required libraries:
var S = require( 'string' ); // http://stringjs.com/
var _ = require('lodash'); // http://lodash.com/
var fs = require('fs'); // Standard file system

// BIG TODO: Separate authenticated/non-authenticated user commands!

/**
 * Web Messaging server.
 * @class Provides Web Socket server functionality.
 * @constructor
 * @param {Object} config Server configuration object. Supported keys are: port (listening port number), socket (socket listener configuration object),
 * optional 'scope' object used for maintaining a custom scope reference,
 * optional 'connectionHandler' connection handler,
 * and an events object providing event handler functionality.
 */
var WEBServer = function( config ) {
	// Store configuation, in a 'private' property
	this._config = config;
}

/**
 * Method used for attaching socket events and their handlers.
 * NOTE: Event names and functions are stored in the config.events object.
 * NOTE: The scope of each event handler is bound to the configured 'scope' object.
 * @param {Object} socket Socket object.
 * @function
 */
WEBServer.prototype.attachSocketEvents = function( socket ) {
	var me = this;
	Object.keys( this._config.events ).forEach( function( eventName ) {
		socket.getRawSocket().on( eventName, function( data ) {
			// Determine which scope to bind the event handler to
			var scope = typeof me._config.scope !== "undefined" ? me._config.scope : me;

			// Call the Application Specific Event handler, passing in the data and socket objects
			me._config.events[eventName].bind( scope )( data, socket );
		} );
	} );
}

/**
 * Method used for loading the 'http' and 'socket.io' classes, and creating the listeners.
 * @function
 */
WEBServer.prototype.loadLibraries = function() {
	// HTTP Server, required for serving Socket.Io JS file
	// NOTE: The HTML file that makes use of it, is served by a standard HTTP server.
	this._httpServer = require('http').createServer();

	// Socket.Io
	this._socketIo = require('socket.io').listen(
		this._httpServer
		,this._config.socket
	);
}

/**
 * Method used for preparing the server listeners, and attaching event handlers.
 * @function
 */
WEBServer.prototype.init = function() {
	// Load required libraries.
	this.loadLibraries();

	// Open port for incoming connections
	this._httpServer.listen( this._config.port, this._config.host );

	// Attach a Socket.Io connection handler
	// This handler in turn will attach application specific event handlers.
	this._socketIo.sockets.on( 'connection', function ( socket ) {
                // Create IRCSocket.
                socket = new IRCSocket( socket, "web", this._config );

		// Call a custom connection event handler, if configured
		if ( typeof this._config.connection !== "undefined" ) {
			// Determine which scope to bind the event handler to
			var scope = typeof this._config.scope !== "undefined" ? this._config.scope : this;

			this._config.connection.bind( scope )( socket );
		}

		// Attach the Application Specific Event handlers
		this.attachSocketEvents( socket );
	}.bind( this ) );
}

/**
 * TCP Messaging server.
 * TODO: Adjust documentation.
 * @class Provides TCP server functionality.
 * @constructor
 * @param {Object} config Server configuration object. Supported keys are: port (listening port number), socket (socket listener configuration object),
 * optional 'scope' object used for maintaining a custom scope reference,
 * optional 'connectionHandler' connection handler,
 * and an events object providing event handler functionality.
 */
var TCPServer = function( config ) {
        // Store configuation, in a 'private' property
        this._config = config;
}


/**
 * Method used for preparing the server listeners, and attaching event handlers.
 * @function
 */
TCPServer.prototype.init = function() {
        // Load required libraries.
        this.loadLibraries();
}

/**
 * Method used for converting a text command to JSON.
 * @function
 * @param {String} name Command name.
 * @param {String} command Raw text command as received from client.
 * @return {Object} JSON object for the requested command.
 */
TCPServer.prototype.textToJson = function( name, command ) {
        console.log( command );
        var responseObject = {}
                ,temp // Temporary variable, used for splitting a command.
                ,command = S( command ).trim().s; // Trim command

        // Begin constructing parameters
        switch ( name.toUpperCase() ) {
                case "NICK":
                        // Split by spaces.
                        temp = command.split( " " );

                        // Construct a valid NICK JSON object.
                        responseObject = {
                                nickname: temp[1]
                        }
                        break;
                case "USER":
                        // Split by spaces.
                        // NOTE: The user mode is not implemented.
                        temp = command.split( " " );

                        responseObject = {
                                user: temp[1]
                                ,mode: 0
                        };

                        // Split by ":" for constructing the real name.
                        temp = command.split( ":" );
                        responseObject.realname = temp.splice( 1 ).join( ":" );
                        break;
                case "WHOIS":
                        // Split by spaces.
                        temp = command.split( " " );
                        if ( temp.length > 1 ) {
                                responseObject.target = temp[1];
                        }
                        break;
                case "PONG":
                        responseObject = {};
                        break;
                case "PRIVMSG":
                        // Split by spaces.
                        temp = command.split( " " );

                        // Set target.
                        responseObject.target = temp[1];

                        // Set message.
                        temp = command.split( ":" );
                        responseObject.message = temp.splice( 1 ).join( ":" );
                        break;
                case "JOIN":
                        // Split by spaces.
                        temp = command.split( " " );

                        var channelsPart = temp.splice( 1, 1 ).join( " " ).split( "," );

                        // Prepare response.
                        responseObject.channels = channelsPart;

                        // TODO: Handle keys.
                        break;
                case "TOPIC":
                        // TODO: Redundant with above!
                        // Split by spaces.
                        temp = command.split( " " );

                        // Set target.
                        responseObject.channel = temp[1];

                        // Set message.
                        temp = command.split( ":" );
                        responseObject.topic = temp.splice( 1 ).join( ":" );
                        break;
                case "MODE":
                        // Split by spaces
                        temp = command.split( " " );

                        // Second array entry is the target name, and is mandatory!
                        responseObject = {
                                target: temp[1]
                        };

                        // Optionally, the third item is the mode to change.
                        if ( temp.length > 2 ) {
                                // If target is a nickname, pass in an array of modes
                                if ( IRCProtocol.OtherConstants.NICK_LENGTH && IRCProtocol.OtherConstants.NICK_PATTERN.test( responseObject.target ) ) {
                                        responseObject.modes = [ temp[2] ];
                                } else {
                                        // If channel, pass in a string
                                        responseObject.modes = temp[2];
                                        // TODO: Debu(nk)
                                }
                        }

                        // Optionally, all items from this point on, are added to the parameters array.
                        if ( temp.length > 3 ) {
                                responseObject.parameters = temp.slice( 3 );
                        }
                        break;
                case "AWAY":
                        temp = command.split( ":" );
                        if ( temp.length > 1 ) {
                                // Set message, if any.
                                responseObject.text = temp.splice( 1 ).join( ":" );
                        }
                        break;
                case "QUIT":
                        temp = command.split( ":" );
                        if ( temp.length > 1 ) {
                                // Set quit message, if any.
                                responseObject.reason = temp.splice( 1 ).join( ":" );
                        }
                        break;
                case "KILL":
                        temp = command.split( " " );
                        if ( temp.length > 1 ) {
                                // Kill nickname.
                                responseObject.nickname = temp[1];
                        }
                        if ( temp.length > 2 ) {
                                // Kill comment.
                                responseObject.comment = temp[2].substring( 1 );
                        }
                        break;
                case "WALLOPS":
                        temp = command.split( ":" );
                        if ( temp.length > 1 ) {
                                // Set message, if any.
                                responseObject.text = temp.splice( 1 ).join( ":" );
                        }
                        break;
                case "OPER":
                        // Split by spaces.
                        temp = command.split( " " );
                        if ( temp.length > 1 ) {
                                responseObject.password = temp[1];
                        }
                        break;
                case "ISON":
                        // Split by spaces.
                        temp = command.split( " " );
                        if ( temp.length > 1 ) {
                                responseObject.nicknames = temp.splice( 1 );
                        }
                        break;
                case "MOTD":
                case "LUSERS":
                case "VERSION":
                case "TIME":
                case "ADMIN":
                case "INFO":
                case "PONG":
                case "USERS":
                        // No parameters required.
                        break;
                default:
                        // TODO: Implement.
                        break;
        }

        console.log( name );
        console.log( responseObject );
        return responseObject;
}

/**
 * Method used for attaching socket events and their handlers.
 * NOTE: In this case, we need to emulate a similar behaviour to socket.io event handlers.
 * NOTE: By converting from text to JSON.
 * @param {Object} socket Socket object.
 * @function
 */
TCPServer.prototype.attachSocketEvents = function( socket ) {
        // Handle incoming text data.
        socket.getRawSocket().on( 'data', function( data ) {
                // NOTE: The IRC client might send a stream of multiple lines of text.
                var lines = data.replace( /\r/g, "" ).split( '\n' )
                        ,i
                        ,temp // Temporary array
                        ,command;

                // Parse line by line
                for ( i = 0; i < lines.length; i++ ) {
                        // Ignore empty lines.
                        if ( !lines[i] ) {
                                continue;
                        }

                        // Split line by spaces.
                        temp = lines[i].split( ' ' );
                        // Get command.
                        command = temp[0].toUpperCase();

                        // Handle each event, if there is a listener configured for it.
                        if ( typeof this._config.events[command] !== "undefined" ) {
                                // Determine which scope to bind the event handler to
                                // TODO: Perhaps redundant?!
                                var scope = typeof this._config.scope !== "undefined" ? this._config.scope : this;

                                // TODO: Convert data.
                                this._config.events[command].bind( scope )( this.textToJson( command, lines[i] ), socket );
                        }

                        // TODO: Handle an unkown command.
                }
        }.bind( this ) );

        // Handle connection close, if an event handler is defined.
        if ( typeof this._config.events["disconnect"] !== "undefined" ) {
                console.log( "FLAVIU" );
                socket.getRawSocket().on( 'close', function() {
                        // TODO: Perhaps redundant?!
                        var scope = typeof this._config.scope !== "undefined" ? this._config.scope : this;

                        // Handle event.
                        this._config.events.disconnect.bind( scope )( {}, socket );
                }.bind( this ) );
        }
}

/**
 * Method used for loading the 'net' classe, and creating the listeners.
 * @function
 */
TCPServer.prototype.loadLibraries = function() {
        // Load the net library and create server.
        this._tcpServer = require( 'net' ).createServer(
                // Socket configuration
                this._config.socket

                // Add listener.
                ,function ( socket ) {
                        // Set encoding.
                        socket.setEncoding( 'utf8' );

                        // Create IRCSocket.
                        socket = new IRCSocket( socket, "tcp", this._config );

                        // Call a custom connection event handler, if configured
                        if ( typeof this._config.connection !== "undefined" ) {
                                // Determine which scope to bind the event handler to
                                var scope = typeof this._config.scope !== "undefined" ? this._config.scope : this;

                                this._config.connection.bind( scope )( socket );

                                // Add "event" listeners.
                                this.attachSocketEvents( socket );
                        }
                }.bind( this )
        );

        // Create listener.
        this._tcpServer.listen(
                this._config.port
                ,this._config.host
        );
}

/**
 * IRC Socket definition.
 * @param {Object} socket Connection socket object.
 * @param {String} type Connection socket type. Allowed values: tcp and web.
 * @param {Object} config Configuration object.
 * @construct
 */
var IRCSocket = function( socket, type, config ) {
        // Store configuration.
        this._config = config;

        // Store raw socket.
        this._socket = socket;

        // Store type.
        this._type = type;
}

/**
 * Method used for constructing the first part of a response, with the format of :server code nick.
 * @function
 * @param {Integer} command Command numeric id.
 * @param {String} nickname Nickname.
 * @return {String} First part.
 */
IRCSocket.prototype.constructFirstMessagePart = function( command, nickname ) {
        return ":" + IRCProtocol.ServerName + " " + command + " " + nickname + " ";
}

/**
 * Method used for converting a JSON command to text.
 * @function
 * @param {String} command Command name.
 * @param {Object} parameters JSON object.
 * @return {String} Command string.
 */
IRCSocket.prototype.jsonToText = function( command, parameters ) {
        var response = "";

        console.log( command );
        console.log( parameters );

        // Construct response.
        switch ( command.toUpperCase() ) {
                // "Welcome" sequence
                case "RPL_WELCOME":
                case "RPL_YOURHOST":
                case "RPL_CREATED":
                case "RPL_MYINFO":
                // MOTD
                case "RPL_MOTDSTART":
                case "RPL_MOTD":
                case "RPL_ENDOFMOTD":
                // Nick command
                case "ERR_NICKNAMEINUSE":
                case "ERR_ERRONEUSNICKNAME":
                // Away
                case "RPL_UNAWAY":
                case "RPL_NOWAWAY":
                // Lusers
                case "RPL_LUSERCLIENT":
                case "RPL_LUSEROP":
                case "RPL_LUSERUNKOWN":
                case "RPL_LUSERCHANNELS":
                case "RPL_LUSERME":
                // Operator
                case "RPL_YOUREOPER":
                // Version
                case "RPL_VERSION":
                // Time
                case "RPL_TIME":
                // Admin
                case "RPL_ADMINME":
                case "RPL_ADMINLOC1":
                case "RPL_ADMINLOC2":
                case "RPL_ADMINEMAIL":
                // Info
                case "RPL_INFO":
                case "RPL_ENDOFINFO":
                // Users
                case "ERR_USERSDISABLED":
                // Generic
                case "ERR_NEEDMOREPARAMS":
                case "ERR_NOPRIVILEGES":
                case "ERR_PASSWDMISMATCH":
                case "ERR_UMODEUNKNOWNFLAG":
                case "RPL_UMODEIS":
                case "ERR_USERSDONTMATCH":
                case "ERR_CHANOPRIVSNEEDED":
                case "ERR_NOTONCHANNEL":
                case "ERR_UNKNOWNMODE":
                case "ERR_NOSUCHNICK":
                case "ERR_USERNOTINCHANNEL":
                case "RPL_INVITELIST":
                case "RPL_ENDOFINVITELIST":
                case "RPL_BANLIST":
                case "RPL_ENDOFBANLIST":
                case "RPL_EXCEPTLIST":
                case "RPL_ENDOFEXCEPTLIST":
                        // TODO: RPL_CHANNELMODEIS
                        response = ":" + IRCProtocol.ServerName + " " + parameters.num + " " + this.Client.getNickname() + " :" + parameters.msg;
                        break;
                case "PING":
                        response = "PING :" + parameters.source;
                        break;
                case "PRIVMSG":
                        response = ":" + parameters.nickname + "!" + parameters.user + "@" + parameters.host + " PRIVMSG " + parameters.target + " :" + parameters.message;
                        break;
                case "PART":
                        response = ":" + parameters.nickname + "!" + parameters.user + "@" + parameters.host + " PART " + parameters.channel;
                        break;
                case "JOIN":
                        response = ":" + parameters.nickname + "!" + parameters.user + "@" + parameters.host + " JOIN " + parameters.channel;
                        break;
                case "RPL_ENDOFWHOIS":
                        // TODO: Store text in constants!
                        response = this.constructFirstMessagePart( 318, this.Client.getNickname() ) + parameters.nick + " :End of /WHOIS list.";
                        break;
                case "RPL_TOPIC":
                        response = this.constructFirstMessagePart( 332, this.Client.getNickname() ) + parameters.channel + " :" + parameters.topic;
                        break;
                case "RPL_NOTOPIC":
                        // TODO: Store text in constants!
                        response = this.constructFirstMessagePart( 331, this.Client.getNickname() ) + parameters.channel + " :No topic is set.";
                        break;
                case "RPL_NAMREPLY":
                        // First part.
                        response = ":" + IRCProtocol.ServerName + " 353 " + this.Client.getNickname() + " ";
                        // Channel part.
                        // TODO: Handle channel types!
                        response += "= " + parameters.channel + " ";
                        // Nick part.
                        var nickPart = ""
                                ,prefix;
                        for ( var i = 0; i < parameters.names.length; i++ ) {
                                prefix = parameters.names[i].operator ? "@" : "";
                                prefix += parameters.names[i].voice ? "+" : "";
                                nickPart += ( i === 0 ? "" : " " ) + prefix + parameters.names[i].nick;
                        }
                        response += ":" + nickPart;

                        break;
                case "RPL_WHOISOPERATOR":
                        // TODO: Store text in constants!
                        response = this.constructFirstMessagePart( 313, this.Client.getNickname() ) + parameters.nick + " :is an IRC operator.";
                        break;
                case "RPL_ENDOFNAMES":
                        // TODO: Store text in constants!
                        response = ":" + IRCProtocol.ServerName + " 366 " + this.Client.getNickname() + " :End of /NAMES list.";
                        break;
                case "NICK":
                        response = ":" + parameters.initial + "!" + parameters.user + "@" + parameters.host + " NICK " + parameters.nickname;
                        break;
                case "RPL_WHOISSERVER":
                        response += this.constructFirstMessagePart( 312, this.Client.getNickname() ) + parameters.nick + " " + parameters.server + " :" + parameters.serverinfo;
                        break;
                case "RPL_WHOISUSER":
                        response = this.constructFirstMessagePart( 311, this.Client.getNickname() ) + parameters.nick + " " + parameters.user + " " + parameters.host + " * :" + parameters.realname;
                        break;
                case "RPL_WHOISIDLE":
                        // TODO: Store text in constants!
                        response = ":" + IRCProtocol.ServerName + " 317 " + this.Client.getNickname() + " " + parameters.nick + " " + parameters.idle + " :seconds idle";
                        break;
                case "RPL_AWAY":
                        response = ":" + IRCProtocol.ServerName + " 301 " + this.Client.getNickname() + " " + parameters.nick + " :" + parameters.text;
                        break;
                case "RPL_WHOISCHANNELS":
                        response = ":" + IRCProtocol.ServerName + " 319 " + this.Client.getNickname() + " " + parameters.nick + " :" + parameters.channels;
                        break;
                case "MODE":
                        // NOTE: Redundant with similar commands above!
                        response = ":" + parameters.nickname + "!" + parameters.user + "@" + parameters.host + " MODE " + parameters.channel + " " + parameters.mode;

                        // Append "parameter", e.g.: for a +ovkl command.
                        if ( parameters.parameter ) {
                                response += " " + parameters.parameter;
                        }
                        break;
                case "WALLOPS":
                        response += ":" + parameters.server  + " WALLOPS :" + parameters.text;
                        break;
                case "QUIT":
                        response = ":" + parameters.nickname + "!" + parameters.user + "@" + parameters.host + " QUIT :" + parameters.reason;
                        break;
                case "RPL_ISON":
                        // TODO: Test properly!
                        var nicknames = "";
                        _.each( parameters.nicknames, function( element ) {
                                nicknames += ( nicknames !== "" ? " " : "" ) + element;
                        } );
                        response = this.constructFirstMessagePart( 303, this.Client.getNickname() ) + ":" + nicknames;
                        break;
                default:
                        // TODO: Implement.
                        break;
        }

        console.log( "Text command:" + response );

        // Return.
        return response;
}

/**
 * Method used for terminating a socket connection.
 * @param {Object} data Empty object!
 * @param {Object} socket Socket to terminate connection for.
 * @function
 */
IRCSocket.prototype.disconnect = function( data, socket ) {
        // Call protocol disconnect logic.
        socket.getRawSocket().disconnect( data, socket );
}

/**
 * Method used for fetching the raw socket address (ip or hostname).
 * @function
 * @return {String} Address.
 */
IRCSocket.prototype.getAddress = function() {
        var result = "";

        if ( this._type === "web" ) {
                result = this._socket.handshake.address.address;
        } else if ( this._type === "tcp" ) {
                result = this._socket.remoteAddress;
        }

        return result;
}

/**
 * Method used for fetching the raw socket.
 * @function
 * @return {Object} Raw socket.
 */
IRCSocket.prototype.getRawSocket = function() {
        return this._socket;
}

/**
 * Method used for emitting an IRC response.
 * @function
 * @param {String} command IRC Command string.
 * @param {Object} parameters IRC Command parameters object.
 */
IRCSocket.prototype.emit = function( command, parameters ) {
        if ( this._type === "web" ) {
                // Write data as is.
                this._socket.emit( command, parameters );
        } else if ( this._type === "tcp" ) {
                // Convert JSON to text, and send the command over...if any.
                var response = this.jsonToText.bind( this )( command, parameters );
                if ( response ) {
                        this._socket.write( response + "\r\n" );
                }
        }
}

// Load configuration file, in current scope
eval( fs.readFileSync('./public/config.js','utf8') );

/** IRC Protocol */
var IRCProtocol = {
	// Daemon version
	Version: "0.1"
	// Server info
	,ServerName: Config.Server.IRCProtocol.ServerName
	,ServerInfo: Config.Server.IRCProtocol.ServerInfo
	,ServerComments: Config.Server.IRCProtocol.ServerComments
	,AdminInfo: Config.Server.IRCProtocol.AdminInfo
	,Info: "IRC 2.0 (JSON Based Web IRC Server).\n\
Based on RFC2812. Copyright (C) The Internet Society (2000). All Rights Reserved.\n\
\n\
Copyright (c) 2013, Grosan Flaviu Gheorghe.\n\
All rights reserved.\n\
\n\
Redistribution and use in source and binary forms, with or without\n\
modification, are permitted provided that the following conditions are met:\n\
    * Redistributions of source code must retain the above copyright\n\
      notice, this list of conditions and the following disclaimer.\n\
    * Redistributions in binary form must reproduce the above copyright\n\
      notice, this list of conditions and the following disclaimer in the\n\
      documentation and/or other materials provided with the distribution.\n\
    * Neither the name of the author nor the\n\
      names of its contributors may be used to endorse or promote products\n\
      derived from this software without specific prior written permission.\n\
\n\
THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS \"AS IS\" AND\n\
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED\n\
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE\n\
DISCLAIMED. IN NO EVENT SHALL GROSAN FLAVIU GHEORGHE BE LIABLE FOR ANY\n\
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES\n\
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;\n\
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND\n\
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT\n\
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS\n\
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.\n\
\n\
\n\
Contribute or fork:\n\
https://github.com/fgheorghe/jsIRC"
	,MotdFile: Config.Server.IRCProtocol.MotdFile
	,PingFrequency: Config.Server.IRCProtocol.PingFrequency // In seconds
	,MaxChannelList: Config.Server.IRCProtocol.MaxChannelList // Maximum number of channels returned in a RPL_LIST event
	,OperPassword: 'password' // TODO: Encrypt, and add host support
	,DebugLevel: 0 // TODO: Implement debug levels
	,UserModes: [
		"a" // Away
		,"i" // Invisible
		,"w" // Wallops
		,"r" // Restricted connection
		,"o" // Global operator
		,"O" // Local operator
		,"s" // Server notices
	]
	,UserModeDefaults: {
		a: false // Away
		,i: false // Invisible
		,w: false // Wallops
		,r: false // Restricted connection
		,o: false // Global operator
		,O: false // Local operator
		,s: false // Server notices
	}
	,ChannelModes: [
		"a" // anonymous
		,"i" // invite-only 
		,"m" // moderated
		,"n" // no messages to channel from clients on the outside
		,"q" // quiet
		,"p" // private
		,"s" // secret
		,"r" // server reop
		,"t" // topic settable by channel operator only
		,"k" // key
		,"l" // limit
		,"o" // Operator
		,"v" // Voice
		,"b" // Ban
		,"e" // Ban Exception
	]
	,ChannelModeDefaults: {
		a: false
		,i: false
		,m: false
		,n: false
		,q: false
		,p: false
		,s: false
		,r: false
		,t: false
		,k: ""
		,l: 0
		,o: []
	}
	/**
	 * Method used for initialising a requested protocol
	 * @param {String} type Type of protocol. Allowed values: 'client' or 'server' (not implemented).
	 * @return {Object} A new instance of the requested protocol type.
	 * @function
	 */
	,init: function( type ) {
		switch ( type ) {
			case "server":
				// Do nothing.
				break;
			case "client":
				// Create a new instance of the client protocol
				return new this.ClientProtocol();
				break;
			default:
				// Do nothing.
				break;
		}
	}
	// Client Protocol Numeric Replies
	// Stored in array, having the numeric value as first index, and the text value as second index.
	// Values that are indended to be returned within the string, are returned as a data object.
	// E.g.: "<nick/channel> :Nick/channel is temporarily unavailable" would be returned as:
	// { num: NICK.ERR_UNAVAILRESOURCE, msg: "Nick/channel is temporarily unavailable",  value: "<nick/channel>" }
	// Such response strings have their place holders removed, with a comment alongside each string.
	// With few exceptions, noted below, where messages are constructed dynamically
	,NumericReplyConstants: {
		Client: {
			NICK: {
				ERR_NONICKNAMEGIVEN: [ 431, "No nickname given" ]
				,ERR_ERRONEUSNICKNAME: [ 432, "Erroneous nickname" ] // <nick>
				,ERR_NICKNAMEINUSE: [ 433, "Nickname is already in use" ] // <nick>
				,ERR_NICKCOLLISION: [ 436, "Nickname collision KILL" ] // <user>@<host>
			}
			,USER: {
				ERR_ALREADYREGISTRED: [ 462, "Unauthorized command (already registered)" ]
			}
			,WHOIS: {
				ERR_NOSUCHSERVER: [ 402, "No such server" ] // <server name> :
				,RPL_WHOISUSER: [ 311, "<nick> <user> <host> * :<real name>" ]
				,RPL_WHOISCHANNELS: [ 319, "<nick> :*( ( \"@\" / \"+\" ) <channel> \" \" )" ]
				,RPL_AWAY: [ 301, "<nick> :<away message>" ]
				,RPL_WHOISIDLE: [ 317, "<nick> <integer> :seconds idle" ]
				,RPL_ENDOFWHOIS: [ 318, "<nick> :End of WHOIS list" ]
				,RPL_WHOISSERVER: [ 312, "<nick> <server> :<server info>" ]
				,RPL_WHOISOPERATOR: [ 313, "<nick> :is an IRC operator" ]
				,ERR_NOSUCHNICK: [ 401, "<nickname> :No such nick/channel" ]
			}
			,JOIN: {
				ERR_NOSUCHCHANNEL: [ 403, "No such channel" ]
				,RPL_TOPIC: [ 332, "<channel> :<topic>" ]
				,RPL_NOTOPIC: [ 331, "<channel> :No topic is set" ]
				,ERR_INVITEONLYCHAN: [ 473, " :Cannot join channel (+i)" ]
				,ERR_CHANNELISFULL: [ 471, "Cannot join channel (+l)" ]
				,ERR_BADCHANNELKEY: [ 475, "Cannot join channel (+k)" ]
				,ERR_BANNEDFROMCHAN: [ 474, "Cannot join channel (+b)" ]
			}
			,PRIVMSG: {
				ERR_NORECIPIENT: [ 411, "No recipient given (<command>)" ]
				,ERR_CANNOTSENDTOCHAN: [ 404, "Cannot send to channel" ]
				,ERR_WILDTOPLEVEL: [ 413, "<mask> :No toplevel domain specified" ]
				,ERR_NOTEXTTOSEND: [ 412, "No text to send" ]
				,ERR_NOTOPLEVEL: [ 413, "<mask> :No toplevel domain specified" ]
				,ERR_TOOMANYTARGETS: [ 487, "<target> :<error code> recipients. <abort message>" ]
			}
			,MOTD: {
				RPL_MOTDSTART: [ 375, "Message of the day - " ]
				,RPL_MOTD: [ 372, "- <text>" ]
				,RPL_ENDOFMOTD: [ 376, "End of MOTD command" ]
				,ERR_NOMOTD: [ 422, "MOTD File is missing" ]
			}
			,LUSERS: {
				RPL_LUSERCLIENT: [ 251, "There are <integer> users and <integer> services on <integer> servers" ]
				,RPL_LUSEROP: [ 252, "<integer> :operator(s) online" ]
				,RPL_LUSERUNKOWN: [ 253, "<integer> :unknown connection(s)" ]
				,RPL_LUSERCHANNELS: [ 254, "<integer> :channels formed" ]
				,RPL_LUSERME: [ 255, "I have <integer> clients and <integer> servers" ]
			}
			,PING: {
				ERR_NOORIGIN: [ 409, "No origin specified" ]
			}
			,TOPIC: {
				ERR_NOTONCHANNEL: [ 442, "You're not on that channel" ]
			}
			,LIST: {
				ERR_TOOMANYMATCHES: [  ] // ??? Not defined in the RFC ?
				,RPL_LIST: [ 322, "<channel> <# visible> :<topic>" ]
				,RPL_LISTEND: [ 323, "End of LIST" ]
			}
			,OPER: {
				RPL_YOUREOPER: [ 381, "You are now an IRC operator" ]
				,ERR_NOOPERHOST: [ 491, "No O-lines for your host" ]
				,ERR_PASSWDMISMATCH: [ 464, "Password incorrect" ]
			}
			,ADMIN: {
				RPL_ADMINME: [ 256, " :Administrative info" ]
				,RPL_ADMINLOC1: [ 257, ":<admin info>" ] // RFC: what city, state and country the server is in
				,RPL_ADMINLOC2: [ 258, ":<admin info>" ] // RFC: details of the institution
				,RPL_ADMINEMAIL: [ 259, ":<admin info>" ]
			}
			,INFO: {
				RPL_INFO: [ 371, ":<string>" ]
				,RPL_ENDOFINFO: [ 374, "End of INFO list" ]
			}
			,KILL: {
				ERR_NOPRIVILEGES: [ 481, "Permission Denied- You're not an IRC operator" ]
				,ERR_CANTKILLSERVER: [ 483, "You can't kill a server!" ]
			}
			,MODE: {
				// User modes
				ERR_UMODEUNKNOWNFLAG: [ 501, "Unknown MODE flag" ]
				,ERR_USERSDONTMATCH: [ 502, "Cannot change mode for other users" ]
				,RPL_UMODEIS: [ 221, "<user mode string>" ]
				// Channel modes
				,ERR_KEYSET: [ 467, "Channel key already set" ]
				,ERR_NOCHANMODES: [ 477, "Channel doesn't support modes" ] // NOTE: For special types of channels
				,ERR_CHANNELISFULL: [ 471, "Cannot join channel (+l)" ]
				,ERR_CHANOPRIVSNEEDED: [ 482, "You're not channel operator" ]
				,ERR_USERNOTINCHANNEL: [ 441, " :They aren't on that channel" ]
				,ERR_UNKNOWNMODE: [ 472, " :is unknown mode char to me for " ]
				,RPL_CHANNELMODEIS: [ 324, "<channel> <mode> <mode params>" ]
				,RPL_BANLIST: [ 367, "<channel> <banmask>" ]
				,RPL_ENDOFBANLIST: [ 368, "End of channel ban list" ]
				,RPL_EXCEPTLIST: [ 348, "<channel> <exceptionmask>" ]
				,RPL_ENDOFEXCEPTLIST: [ 349, "End of channel exception list" ]
				,RPL_INVITELIST: [ 346, "<channel> <invitemask>" ]
				,RPL_ENDOFINVITELIST: [ 347, ":End of channel invite list" ]
				,RPL_UNIQOPIS: [ 325, "<channel> <nickname>" ]
			}
			,AWAY: {
				RPL_NOWAWAY: [ 306, "You have been marked as being away" ]
				,RPL_UNAWAY: [ 305, "You are no longer marked as being away" ]
			}
			,NAMES: {
				RPL_NAMREPLY: [ 352, "" ]
				,RPL_ENDOFNAMES: [ 366, "End of NAMES list" ]
			}
			,WHO: {
				RPL_WHOREPLY: [ 352, "" ]
				,RPL_ENDOFWHO: [ 315, "End of WHO list" ]
			}
			,USERS: {
				// Not implemented
				ERR_USERSDISABLED: [ 446, "USERS has been disabled" ]
			}
			,WALLOPS: {
				// NOTE: Only allow operators to issue this command
				// ERR_NOPRIVILEGES
			}
			,ISON: {
				RPL_ISON: [ 303, ":*1<nick> *( \" \" <nick> )" ]
			}
			,USERHOST: {
				RPL_USERHOST: [ 302, ":*1<reply> *( \" \" <reply> )" ]
			}
			,INVITE: {
				ERR_USERONCHANNEL: [ 443, "is already on channel" ]
				,RPL_INVITING: [ 341, "<channel> <nick>" ]
			}
		}
		// TODO: Reorder
		,CommonNumericReplies: {
			ERR_UNAVAILRESOURCE: [ 437, "Nick/channel is temporarily unavailable" ] // <nick/channel>
			,ERR_NEEDMOREPARAMS: [ 461, "Not enough parameters" ] // <command>
			,ERR_RESTRICTED: [ 484, "Your connection is restricted!" ]
			,RPL_WELCOME: [ 001, "Welcome to the Internet Relay Network" ] // <nick>!<user>@<host>
			,ERR_NOSUCHSERVER: [ 402, "<server name> :No such server" ]
			// Exceptions:
			,RPL_YOURHOST: [ 002, "" ] // Built by emitIRCWelcome() function.
			,RPL_CREATED: [ 003, "" ] // Built by emitIRCWelcome() function.
			,RPL_MYINFO: [ 004, "" ] // Built by emitIRCWelcome() function.
			,RPL_VERSION: [ 351, "<version>.<debuglevel> <server> :<comments>" ]
			,RPL_TIME: [ 391, "<server> :<string showing server's local time>" ]
		}
	}
	// Keeps track of the user's/client's IRC state (e.g. nickname, channels, etc).
	,IrcState: {
		Client: function( socket ) {
			// Store the client's socket
			this._socket = socket;

			this._nickname = ""; // Stores nickname, string
			this._user = false; // Stores 'user' command data, object as per command parameters
			this._host = ""; // Stores the user's host
			this._realname = ""; // Stores the user's real name
			this._channels = []; // Stores channels this user has joined

			// Operator status (mode)
			// TODO: Add mode support
			this._oper = false;

			// User modes
			this._modes = {};
			for ( var key in IRCProtocol.UserModeDefaults ) {
				this._modes[key] = IRCProtocol.UserModeDefaults[key];
			}

			this._idle = 0; // Idle time, in seconds
			this._pingIdle = 0; // Ping/Pong timer
			this._idleTimer = null;
			this._pingTimer = null;

			// Quit message, passed to 'disconnect' event
			this._quitMessage = "";
			// Away text
			this._awayText = "";

			// Channels the user is invited on (used for removing from these channels' invite lists, on quit, or nickname change)
			this._lcInviteChannels = [];

			this._welcome_reply = false; // Did we send the 'RPL_WELCOME' reply?

			// Add channel to user invite list
			this.addInvite = function( channel ) {
				var channelPosition = this._lcInviteChannels.indexOf( channel.toLowerCase() );
				if ( channelPosition === -1 ) {
					this._lcInviteChannels.push( channel.toLowerCase() );
				}
			}

			// Remove channel from invite list
			this.removeInvite = function( channel ) {
				var channelPosition = this._lcInviteChannels.indexOf( channel.toLowerCase() );
				if ( channelPosition !== -1 ) {
					this._lcInviteChannels.splice( channelPosition, 1 );
				}
			}

			// Get list of channel invites
			this.getInvites = function() {
				return this._lcInviteChannels;
			}

			// Get quit message
			this.getQuitMessage = function() {
				return this._quitMessage;
			}

			// Set quit message
			this.setQuitMessage = function( quitMessage ) {
				this._quitMessage = quitMessage;
			}

			// Set away text, and mode
			this.setAway = function( text ) {
				this.setMode( "a", true );
				this._awayText = text;
			}

			// Set away text
			this.getAway = function( text ) {
				return this._awayText;
			}

			// Remove away text and mode
			this.removeAway = function() {
				this._awayText = "";
				this.setMode( "a", false );
			}

			// Method used for fetching user modes, as a string
			this.getSetModesString = function() {
				var result = "";
				for ( var mode in this._modes ) {
					if ( this._modes[mode] === true ) {
						result += mode;
					}
				}
				return result;
			}

			// Method used for fetching user mode of specified type
			this.getMode = function( mode ) {
				return this._modes[mode];
			}

			// Method used for setting user mode of specified type
			this.setMode = function( mode, value, param ) {
				this._modes[mode] = value;
			}

			// Get idle time in seconds
			this.getIdle = function() {
				return this._idle;
			}

			// Set idle time in seconds
			this.setIdle = function( idle ) {
				this._idle = idle;
			}

			// Get ping idle time in seconds
			this.getPingIdle = function() {
				return this._pingIdle;
			}
			
			// Set ping idle time in seconds
			this.setPingIdle = function( idle ) {
				this._pingIdle = idle;
			}

			// Method used for setting the nickname
			this.setRealname = function( realname ) {
				this._realname = realname;
			}

			// Method used for getting the nickname
			this.getRealname = function() {
				return this._realname;
			}

			// Method used for setting the nickname
			this.setNickname = function( nickname ) {
				this._nickname = nickname;
			}

			// Method used for getting the nickname
			this.getNickname = function() {
				return this._nickname;
			}

			// Method used for setting the user data
			this.setUser = function( user ) {
				this._user = user;
			}

			// Method used for getting the user data
			this.getUser = function() {
				return this._user;
			}

			// Method used for getting the user host
			this.getHost = function() {
				return this._host;
			}

			// Method used for setting the user host
			this.setHost = function( host ) {
				this._host = host;
			}

			// Method used for adding this user to a channel
			this.addChannel = function( channelName ) {
				this._channels.push( channelName );
			}

			// Method used for getting the user channels
			// TODO: Exclude private and secret channels!
			this.getChannels = function() {
				return this._channels;
			}

			// Method used for removing a channel from a user
			this.removeChannel = function( channelName ) {
				var channelPosition = this._channels.indexOf( channelName );
				if ( channelPosition !== -1 ) {
					this._channels.splice( channelPosition, 1 );
				}
			}

			// Method used for checking if a user is registered or not (sent valid nickname and user properties)
			this.isRegistered = function() {
				return this.getUser() !== false && this.getNickname() !== "";
			}

			// Method used for checking/setting if we sent the 'RPL_WELCOME' message to this user or not
			this.welcomeSent = function( value ) {
				if ( typeof value === "undefined" ) {
					// Getting
					return this._welcome_reply;
				} else {
					// Setting
					this._welcome_reply = value;

					// Attach idle timer
					this._idleTimer = new setInterval( function() {
						this.setIdle( this.getIdle() + 1 );
					}.bind( this ), 1000 );

					// Attach ping/pong timer
					this._pingTimer = new setInterval( function() {
						// TODO: Reset on user events, to avoid too much traffic
						this.setPingIdle( this.getPingIdle() + 1 );

						// Send a ping event
						if ( this.getPingIdle() >= IRCProtocol.PingFrequency ) {
							this._socket.emit(
								'PING'
								,{
									source: IRCProtocol.ServerName
								}
							);
						}
					}.bind( this ), 1000 );
				}
			}

			// Method used for closing a client connection.
			this.clientQuit = function() {
                                // Clear intervals.
                                clearInterval( this._idleTimer );
                                clearInterval( this._pingTimer );

                                // TODO: Add other events.
                        }

			return this;
		}
		// As per RFC2811 http://tools.ietf.org/html/rfc2811#section-4
		,Channel: function( name ) {
			// Channel name
			this._name = name;

			// List of users
			this._users = [];
			this._lcUsers = [];

			// List of sockets
			this._sockets = [];

			// List of invited users
			this._inviteNicknames = []; // Case insensitive
			this._lcInviteNicknames = []; // Lower case
			this._lcOperators = []; // Channel operators
			this._lcVoice = []; // Voice operators

			// Lists of ban and ban exception masks
			this._bans = [];
			this._banExceptions = [];

			// Channel key and limit
			this._key = "";
			this._limit = 0;

			// Topic
			this._topic = "";

			// User modes
			// TODO: Modes logic is redundant with channel mode logic
			this._modes = {};
			for ( var key in IRCProtocol.ChannelModeDefaults ) {
				this._modes[key] = IRCProtocol.ChannelModeDefaults[key];
			}

			// Add a channel operator
			this.addOperator = function( nickname ) {
				if ( this._lcOperators.indexOf( nickname.toLowerCase() ) === -1 ) {
					this._lcOperators.push( nickname.toLowerCase() );
				}
			}
			
			// Remove a channel operator
			this.removeOperator = function( nickname ) {
				var nicknamePosition = this._lcOperators.indexOf( nickname.toLowerCase() );
				if ( nicknamePosition !== -1 ) {
					this._lcOperators.splice( nicknamePosition, 1 );
				}
			}

			// Add a channel 'voiced' user
			this.addVoice = function( nickname ) {
				if ( this._lcVoice.indexOf( nickname.toLowerCase() ) === -1 ) {
					this._lcVoice.push( nickname.toLowerCase() );
				}
			}
			
			// Remove a channel 'voiced' user
			this.removeVoice = function( nickname ) {
				var nicknamePosition = this._lcVoice.indexOf( nickname.toLowerCase() );
				if ( nicknamePosition !== -1 ) {
					this._lcVoice.splice( nicknamePosition, 1 );
				}
			}
			
			// Get operators
			this.getOperators = function() {
				return this._lcOperators;
			}
			
			// Check if user is operator
			this.isOperator = function( nickname ) {
				return this._lcOperators.indexOf( nickname.toLowerCase() ) !== -1;
			}

			// Check if user has 'voice'
			this.hasVoice = function( nickname ) {
				return this._lcVoice.indexOf( nickname.toLowerCase() ) !== -1;
			}

			// Add user to invite list
			this.addInvite = function( nickname ) {
				var nicknamePosition = this._lcInviteNicknames.indexOf( nickname.toLowerCase() );
				if ( nicknamePosition === -1 ) {
					this._inviteNicknames.push( nickname );
					this._lcInviteNicknames.push( nickname.toLowerCase() );
				}
			}

			// Check if user is invited to this channel
			this.isInvited = function( nickname ) {
				return this._lcInviteNicknames.indexOf( nickname.toLowerCase() ) !== -1 ? true : false;
			}

			// Remove this user from the invite list
			this.removeInvite = function( nickname ) {
				var nicknamePosition = this._lcInviteNicknames.indexOf( nickname.toLowerCase() );
				if ( nicknamePosition !== 1 ) {
					this._inviteNicknames.splice( nicknamePosition, 1 );
					this._lcInviteNicknames.splice( nicknamePosition, 1 );
				}
			}

			// Get invites
			this.getInvites = function() {
				return this._inviteNicknames;
			}

			// Method used for fetching channel mode of specified type
			this.getMode = function( mode ) {
				return this._modes[mode];
			}

			// Set channel key
			this.setKey = function( key ) {
				this._key = key; // Unset by passing an empty string
			}
			
			// Get channel key
			this.getKey = function() {
				return this._key;
			}

			// Set channel limit
			this.setLimit = function( limit ) {
				this._limit = limit; // Unset by passing a value of 0
			}
			
			// Get channel limit
			this.getLimit = function() {
				return this._limit;
			}

			// Method used for setting channel mode of specified type
			// NOTE: If silent is present, and set to true, do not broadcast message
			// NOTE: Used when creating a channel, and setting the first user as operator
			this.setMode = function( socket, mode, value, param, silent ) {
				// Broadcast data
				var data = {
					channel: this.getName()
					,nickname: socket.Client.getNickname()
					,user: socket.Client.getUser()
					,host: socket.Client.getHost()
					,mode: ( value === true ? "+" : "-" ) + mode
				};

				// Handle special modes
				switch ( mode ) {
					case "l":
						if ( value === true ) {
							this.setLimit( param );
							if ( param !== 0 ) {
								data.parameter = param;
							} else {
								data.mode = "-l";
							}
						} else {
							this.setLimit( 0 );
						}
						break;
					case "k":
						// TODO: DO NOT BROADCAST KEY VALUE TO NON-OPERATORS (as soon as channel operator mode is implemented!)
						if ( value === true ) {
							this.setKey( param );
							if ( param !== "" ) {
								data.parameter = param;
							} else {
								data.mode = "-k";
							}
						} else {
							this.setKey( "" );
						}
						break;
					case "o":
					case "v":
					case "b":
					case "e":
						data.parameter = param;
						break;
					default:
						// Do nothing.
						break;
				}

				// Notify others of this change
				if ( typeof silent === "undefined" || silent !== true ) {
					this._broadcastEvent( 'MODE'
						,data
					);
				}

				if ( mode !== "o" && mode !== "v" && mode !== "b" && mode !== "e" ) {
					this._modes[mode] = value;
				}
			}

			// Method used for extracting components of a ban / exception mask (nick, user and host)
			// NOTE: Returns false if mask is invalid (does not have the required components)
			this._getBanComponents = function( mask ) {
				var temp = mask.split( "!" );

				if ( temp.length !== 2 ) {
					return false;
				}
				var nick = temp[0];
				temp = temp[1].split( "@" );

				if ( temp.length !== 2 ) {
					return false;
				}
				var host = temp[1];
				var user = temp[0];

				return {
					nick: nick
					,user: user
					,host: host
				};
			}

			// Method used for checking a ban mask component against the user's value
			// Returns true if component matches, false if not
			this._checkBanMask = function( ban, user ) {
				// Build regex pattern
				var expression = new RegExp( "^" + ban.replace( /\*/g, "(.*)" ) + "$", "g" );
				if ( user.search( expression ) === -1 ) {
					return false;
				}
				return true;
			}

			// Method used for checking if a user is banned or exception
			this._isExceptionOrBanned = function( socket, list ) {
				// Prepare values
				var host = socket.Client.getHost()
					,user = socket.Client.getUser()
					,nick = socket.Client.getNickname();

				// Loop list
				for ( var i = 0; i < list.length; i++ ) {
					// Construct components for each
					var components = this._getBanComponents( list[i] );

					// If a valid mask, then verify
					if ( components !== false ) {
						// Compare each item
						if ( this._checkBanMask( components.host, host ) && this._checkBanMask( components.nick, nick ) && this._checkBanMask( components.user, user ) ) {
							// User is banned
							return true;
						}
					}
				}

				// User is not banned
				return false;
			}

			// Method used for checking if a user is banned or not
			this.isBanned = function( socket ) {
				return this._isExceptionOrBanned( socket, this.getBanList() );
			}

			// Method used for checking if a user is exception or not
			this.isException = function( socket ) {
				return this._isExceptionOrBanned( socket, this.getBanExceptionList() );
			}

			// Method used for adding a ban
			this.addBan = function( socket, mask ) {
				// Add to list, if an identical value doesn't exist yet
				if ( this._bans.indexOf( mask ) === -1 ) {
					this._bans.push( mask );

					// Let setMode broadcast the message to others
					this.setMode( socket, "b", true, mask );
				}
			}

			// Method used for removing a ban
			this.removeBan = function( socket, mask ) {
				// Remove from list, if ban exists
				var banPosition = this._bans.indexOf( mask );
				if ( banPosition !== -1 ) {
					this._bans.splice( banPosition, 1 );

					// Let setMode broadcast the message to others
					this.setMode( socket, "b", false, mask );
				}
			}

			// Method used for listing bans
			this.getBanList = function() {
				return this._bans;
			}

			// Method used for adding a ban exception
			this.addBanException = function( socket, mask ) {
				// Add to list, if an identical value doesn't exist yet
				if ( this._banExceptions.indexOf( mask ) === -1 ) {
					this._banExceptions.push( mask );

					// Let setMode broadcast the message to others
					this.setMode( socket, "e", true, mask );
				}
			}

			// Method used for removing a ban exception
			this.removeBanException = function( socket, mask ) {
				// Remove from list, if ban exception exists
				var banExceptionPosition = this._banExceptions.indexOf( mask );
				if ( banExceptionPosition !== -1 ) {
					this._banExceptions.splice( banExceptionPosition, 1 );

					// Let setMode broadcast the message to others
					this.setMode( socket, "b", false, mask );
				}
			}

			// Method used for listing ban exceptions
			this.getBanExceptionList = function() {
				return this._banExceptions;
			}

			// Method used for fetching channel modes, as a string
			this.getSetModesString = function() {
				var result = "";
				for ( var mode in this._modes ) {
					if ( this._modes[mode] === true ) {
						result += mode;
					}
				}
				return result;
			}

			// Method used for getting the channel name
			this.getName = function() {
				return this._name;
			}

			// Method used for getting names list, required for returning a NAMES command response, and names LIST upon joining a channel
			// NOTE: This function deviates from the standard RFC specification (if details is set to true), by adding
			// NOTE: a list of voiced and operator users for the requested channel.
			// NOTE: This allows for better daata handling in the user interface.
			// Format:
			// [
			//  {
			//	operator: true/false
			//	voice: true/false
			//	user: user object, as stored in this._users
			//  }
			// ]
			this.getNames = function() {
				var response = []; // Prepare response array
				var users = this.getUsers(); // Get all channel users, and construct response
				for ( var i = 0; i < users.length; i++ ) {
					response.push( {
						operator: this.isOperator( users[i] )
						,voice: this.hasVoice( users[i] )
						,nick: users[i]
						// Include host, and user
						,user: this._sockets[i].Client.getUser()
						,host: this._sockets[i].Client.getHost()
					} );
				}

				return response;
			}

			// Method used for setting a topic
			this.setTopic = function( topic, socket ) {
				this._topic = topic;

				// Notify users
				this._broadcastEvent( 'RPL_TOPIC'
					,{
						channel: this.getName()
						,nickname: socket.Client.getNickname()
						,user: socket.Client.getUser()
						,host: socket.Client.getHost()
						,topic: this.getTopic()
					}
				);
			}

			// Method used for getting the topic
			this.getTopic = function() {
				// TODO: Include 'author' of the topic
				return this._topic;
			}

			// Method used for adding a user socket
			this.addUser = function( socket ) {
				// Add, if not already added
				var nicknameAlreadyAdded = _.findIndex( this._users, function( _nickname ) {
					if ( _nickname.toLowerCase() === socket.Client.getNickname().toLowerCase() ) {
						return true;
					}
				} );

				// Add socket and nickname
				if ( nicknameAlreadyAdded === -1 ) {
					// Add nickname
					this._users.push( socket.Client.getNickname() );
					this._lcUsers.push( socket.Client.getNickname().toLowerCase() );

					// Notify clients of a new join
					this._broadcastEvent( 'JOIN'
						,{
							channel: this.getName()
							,nickname: socket.Client.getNickname()
							,user: socket.Client.getUser()
							,host: socket.Client.getHost()
						}
					);

					// Add socket
					this._sockets.push( socket );

					return true;
				} else {
					return false;
				}
			}

			// Method used for broadcasting an event to all channel clients
			this._broadcastEvent = function( eventName, data, ignoreSocket ) {
				// Notify _ALL_ clients.
				for ( var i = 0; i < this._sockets.length; i++ ) {
                                        // Ignore current socket, if requested, and continue.
                                        if ( ignoreSocket && this._sockets[i].Client.getNickname().toLowerCase() === ignoreSocket.Client.getNickname().toLowerCase() ) {
                                                continue;
                                        }
					this._sockets[i].emit(
						eventName
						,data
					);
				}
			}

			// Method used for replacing a user (change nickname that is)
			this.replaceUser = function( initialNickname, nickname ) {
				var nicknamePosition = this._lcUsers.indexOf( initialNickname.toLowerCase() );
				this._lcUsers[ nicknamePosition ] = nickname.toLowerCase();
				this._users[ nicknamePosition ] = nickname;

				var nicknamePosition = this._lcOperators.indexOf( initialNickname.toLowerCase() );
				this._lcOperators[nicknamePosition] = nickname.toLowerCase();
			}

			// Method used for kicking a user
			// NOTE: Relies on silent 'removeUser'
			// NOTE: The kicked user is stored in the target property
			this.kickUser = function( sourceClientSocket, targetClientSocket, comment ) {
				// Notify channel members, including this user, that there has been a kick
				this._broadcastEvent( 'KICK'
					,{
						channel: this.getName()
						,nickname: sourceClientSocket.Client.getNickname()
						,user: sourceClientSocket.Client.getUser()
						,host: sourceClientSocket.Client.getHost()
						,target: targetClientSocket.Client.getNickname()
						,comment: comment
					}
				);

				// Remove user, silently
				this.removeUser( targetClientSocket, true );
			}

			// Method used for removing a user
			this.removeUser = function( socket, silent ) {
				// Remove from lists, and notify users
				var nicknamePosition = this._lcUsers.indexOf( socket.Client.getNickname().toLowerCase() );

				// Check if user is on channel
				if ( nicknamePosition === -1 ) {
					// Silently ignore, if not on channel!
					return;
				}

				// Remove nickname from lists
				this._users.splice( nicknamePosition, 1 );
				this._lcUsers.splice( nicknamePosition, 1 );

				// Remove socket, from this channel's list
				this._sockets.splice( nicknamePosition, 1 );

				// Remove from operators list
				this.removeOperator( socket.Client.getNickname() );
				// Remove from voice list
				this.removeVoice( socket.Client.getNickname() );

				// Notify clients of a part, except if this is a 'silent' PART (client quit)
				if ( typeof silent === "undefined" || silent !== true ) {
					this._broadcastEvent( 'PART'
						,{
							channel: this.getName()
							,nickname: socket.Client.getNickname()
							,user: socket.Client.getUser()
							,host: socket.Client.getHost()
						}
					);
				}
			}

			// Method used for broadcasting a PRIVMSG command
			// TODO: Move channel specific command names to their event names
			this.PRIVMSG = function( message, socket ) {
				var data = {
					target: this.getName()
					,message: message
					,nickname: socket.Client.getNickname()
					,user: socket.Client.getUser()
					,host: socket.Client.getHost()
					,servername: IRCProtocol.ServerName
				};

				// Check if mode is anonymous, if so, set anonymous for nickname, user and host, as per RFC
				if ( this.getMode( 'a' ) ) {
					data.nickname = "anonymous";
					data.user = "anonymous";
					data.host = "anonymous";
				}
				// Notify clients of a message
				this._broadcastEvent( 'PRIVMSG'
					,data
					,socket
				);

				// Reset idle counter for this client
				socket.Client.setIdle( 0 );
			}

			// Method used for getting users.
			this.getUsers = function( details ) {
				// Return the standard list of users
				return this._users;
			}
		}
	}
	// Other constants
	,OtherConstants: {
		NICK_LENGTH: 8 // Max nickname characters (9, since the count starts from 0)
		,CHANNEL_NAME_LENGTH: 49 // (50)
		// TODO: Implement proper patterns (these are partially implemented)
		// TODO: Update client as well
		,NICK_PATTERN: /^[a-zA-Z0-9]+$/ // Nickname pattern, as per RFC
		,CHANNEL_NAME_PATTERN: /^[#&+!]+[a-zA-Z0-9\-\_]+$/ // Channel name, as per RFC...
	}
};

/** IRC Client Protocol Implementation, based on RFC2812: http://tools.ietf.org/html/rfc2812 */
IRCProtocol.ClientProtocol = function( parent ) {
	// NOTE: These two _MUST_ be synchronised
	// Prepare sockets array
	this._clientSockets = [];
	// Prepare socket id array
	this._clientSocketIds = [];

	// Array of lower case nicknames, used for checking if a nickname is in use or not
	this._lcNicknames = [];

	// NOTE: These two _MUST_ be synchronised
	// Array of lower case channel names, used for checking if a channel exists
	this._lcChannelNames = [];
	// Array of channel objects
	this._channels = [];

	// Store create date
	this._created = new Date();

	// Server statistics, used for caching counters, returned when users trigger a LUSERS event
	this._stats = {
		users: 0 // 'Connected' users (authenticated)
		,unknown: 0 // Pending connections (non-authenticated)
		,services: 0
		,network_servers: 1 // At least this server...
		,operators: 0
		,channels: 0
		,local_servers: 0 // Servers connected to this server
	};
}

/**
 * Method used for sending the welcome messages for this user.
 * @param {Object} socket Socket object.
 * @function
 */
IRCProtocol.ClientProtocol.prototype.emitIRCWelcome = function( socket ) {
	// Send RPL_WELCOME
	this.emitIRCError(
		socket
		,'RPL_WELCOME'
		,IRCProtocol.NumericReplyConstants.CommonNumericReplies.RPL_WELCOME[0]
		,IRCProtocol.NumericReplyConstants.CommonNumericReplies.RPL_WELCOME[1] + ", " + socket.Client.getNickname()
	);

	// Send RPL_YOURHOST, with version details
	this.emitIRCError(
		socket
		,'RPL_YOURHOST'
		,IRCProtocol.NumericReplyConstants.CommonNumericReplies.RPL_YOURHOST[0]
		,"Your host is " + IRCProtocol.ServerName + ", running version " + IRCProtocol.Version
	);

	// Send RPL_CREATED, with the date this server was started
	this.emitIRCError(
		socket
		,'RPL_CREATED'
		,IRCProtocol.NumericReplyConstants.CommonNumericReplies.RPL_CREATED[0]
		,"This server was created " + this._created
	);

	// Send RPL_MYINFO, with even more details
	// <servername> <version> <available user modes> <available channel modes>
	// TODO: Add modes (channel)
	this.emitIRCError(
		socket
		,'RPL_MYINFO'
		,IRCProtocol.NumericReplyConstants.CommonNumericReplies.RPL_MYINFO[0]
		,IRCProtocol.ServerName + " " + IRCProtocol.Version + " " + IRCProtocol.UserModes.join( "" )
	);
}

/**
 * Method used for emitting an IRC response to a socket.
 * @param {Object} socket Socket object.
 * @param {String} type Response type (e.g. NICK for a nickname event reply)
 * @param {Object} data Data object.
 */
IRCProtocol.ClientProtocol.prototype.emitIRCReply = function( socket, type, data ) {
	// Return response
	socket.emit( type, data );
}

/**
 * Method used for emitting a client error (or valid reply of other kind).
 * @param {Object} socket Socket object.
 * @param {String} type Response type (e.g. NICK for a nickname event reply)
 * @param {Integer} num Error number.
 * @param {String} msg Error message string.
 * @param {String} value Error message value (optional), to include extra text.
 * @function
 */
IRCProtocol.ClientProtocol.prototype.emitIRCError = function( socket, type, num, msg, value ) {
	// Construct respose.
	var response = {
		num: num
		,msg: msg
	};

	// Add a value, if requested
	if ( typeof value !== "undefined" ) {
		response.value = value;
	}

	// Return response
	this.emitIRCReply( socket, type, response );
}

/**
 * New connection handler. Stores the client's socket data.
 * @param {Object} socket Socket object.
 * @function
 */
IRCProtocol.ClientProtocol.prototype.connection = function( socket ) {
	// Store the socket for this client
	this._clientSockets.push( socket );

	// Store the array of socket ids, in this array, in order to find the socket position in the above array
	this._clientSocketIds.push( socket.getRawSocket().id );
	this._lcNicknames.push( "" ); // Add empty nick holder

	// Attach IRC state object, used for performing various checks
	socket.Client = new IRCProtocol.IrcState.Client( socket );

	// Set host
	socket.Client.setHost( socket.getAddress() );

	// Increase statistics number, for unknown clients
	this._stats.unknown++;
}

/**
 * Client disconnect handler. Removes the socket from the socket list, and notifies users if this client has been authenticated.
 * @param {Object} data Data object. Undefined for a disconnecting client.
 * @param {Object} socket Socket object.
 * @function
 */
IRCProtocol.ClientProtocol.prototype.disconnect = function( data, socket ) {
	// Remove client from channels
	var channels = socket.Client.getChannels()
		,users = [];
	for ( var i = 0; i < channels.length; i++ ) {
		// Check if the channel exists
		var channelPosition = this._lcChannelNames.indexOf( channels[i].toLowerCase() )
			,channel;
		if ( channelPosition !== -1 ) {
			// Get the channel object, at this position
			channel = this._channels[ channelPosition ];
			channel.removeUser( socket, true );
		} else {
			continue;
		}

		// Remove channel if empty
		// TODO: Remove redundant code
		if ( channel.getUsers().length === 0 ) {
			// Remove channel from lists, if empty
			this._channels.splice( channelPosition, 1 );
			this._lcChannelNames.splice( channelPosition, 1 );
			
			// Update the number of channels
			this._stats.channels--;
		}

		// Construct list of channel users
		users = users.concat( users, channel.getUsers() );
	}

	// Notify users on all channels that the user has quit
	// TODO: Optimise
	var _notified = []; // Lower case array of notified users, to avoid duplicates
	for ( var i = 0; i < users.length; i++ ) {
		// Notify if not already done so
		if ( _notified.indexOf( users[i].toLowerCase() ) === -1 ) {
			// Find client socket
			var nicknamePosition = this._lcNicknames.indexOf( users[i].toLowerCase() );
			if ( nicknamePosition !== -1 ) {
				var clientSocket = this._clientSockets[ nicknamePosition ];
				clientSocket.emit(
					'QUIT'
					,{
						nickname: socket.Client.getNickname()
						,host: socket.Client.getHost()
						,user: socket.Client.getUser()
						,reason: socket.Client.getQuitMessage() || 'Connection closed'
					}
				);
			}
		}
	}

	// Remove user from channel invite lists
	var invites = socket.Client.getInvites();
	for ( var i = 0; i < invites.length; i++ ) {
		var channelPosition = this._lcChannelNames.indexOf( invites[i].toLowerCase() )
			,channel;
		if ( channelPosition !== -1 ) {
			channel = this._channels[channelPosition];
			channel.removeInvite( socket.Client.getNickname() );
		}
	}

	// Update statistics
	if ( socket.Client.isRegistered() ) {
		// Decrease statistics number, for known clients
		this._stats.users--;
	} else {
		// Decrease statistics number, for unknown clients
		this._stats.unknown--;
	}

	// Find socket position, by id
	var socketPosition = this._clientSocketIds.indexOf( socket.getRawSocket().id );

	// Remove nickname from list
	this._lcNicknames.splice( socketPosition, 1 );
	// Remove from socket array
	this._clientSockets.splice( socketPosition, 1 );
	// Remove id from socket id array
	this._clientSocketIds.splice( socketPosition, 1 );

        // Set client as quit.
        socket.Client.clientQuit();
}

/**
 * Client NICK command.
 * @param {Object} data Data object, with the required 'nickname' property.
 * @param {Object} socket Socket object.
 * @function
 */
IRCProtocol.ClientProtocol.prototype.NICK = function( data, socket ) {
	// Verify the nick data is present:
	if ( typeof data.nickname === "undefined" || S( data.nickname ).trim().s === "" ) {
		// Issue an ERR_NONICKNAMEGIVEN error.
		this.emitIRCError(
			socket
			,'ERR_NONICKNAMEGIVEN'
			,IRCProtocol.NumericReplyConstants.Client.NICK.ERR_NONICKNAMEGIVEN[0]
			,IRCProtocol.NumericReplyConstants.Client.NICK.ERR_NONICKNAMEGIVEN[1]
		);
		return;
	}

	// Begin nickname validation.
	var nickname = S( data.nickname ).trim().toString();

	// Length or pattern
	if ( nickname.toLowerCase() === "anonymous" && nickname.length > IRCProtocol.OtherConstants.NICK_LENGTH || !IRCProtocol.OtherConstants.NICK_PATTERN.test( nickname ) ) {
		// Issue an ERR_ERRONEUSNICKNAME error.
		this.emitIRCError(
			socket
			,'ERR_ERRONEUSNICKNAME'
			,IRCProtocol.NumericReplyConstants.Client.NICK.ERR_ERRONEUSNICKNAME[0]
			,nickname + " :" + IRCProtocol.NumericReplyConstants.Client.NICK.ERR_ERRONEUSNICKNAME[1]
		);
		return;
	}

	// Silently ignore a user changing the nickname to the same...
	if ( nickname.toLowerCase() === socket.Client.getNickname().toLowerCase() ) {
		return;
	}

	// Verify if already in use
	if ( this._lcNicknames.indexOf( nickname.toLowerCase() ) !== -1 ) {
		// Issue an ERR_NICKNAMEINUSE error.
		this.emitIRCError(
			socket
			,'ERR_NICKNAMEINUSE'
			,IRCProtocol.NumericReplyConstants.Client.NICK.ERR_NICKNAMEINUSE[0]
			,nickname + " :" + IRCProtocol.NumericReplyConstants.Client.NICK.ERR_NICKNAMEINUSE[1]
		);
		return;
	}

	// TODO: Service unavailable...

	// Remember old nickname
	var initialNickname = socket.Client.getNickname();

	// Set the client's nickname
	socket.Client.setNickname( nickname );
	// TODO: Optimise this check (redundant)...
	// If the user has just finished sending the USER and NICK commands, but the RPL_WELCOME has not been sent, do it now...
	if ( socket.Client.isRegistered() && !socket.Client.welcomeSent() ) {
		// Nickname appears to be ok...
		// Store in the list of nicknames, at the position of the current socket
		var socketPosition = this._clientSocketIds.indexOf( socket.getRawSocket().id );
		this._lcNicknames[socketPosition] = nickname.toLowerCase();

		// Set to true, and issue the welcome stream of messages
		socket.Client.welcomeSent( true );

		// Notify the user
		this.emitIRCWelcome( socket );
		return;
	} else if ( !socket.Client.isRegistered() && !socket.Client.welcomeSent()  ) {
		// Nickname appears to be ok...
		// Store in the list of nicknames, at the position of the current socket
		var socketPosition = this._clientSocketIds.indexOf( socket.getRawSocket().id );
		this._lcNicknames[socketPosition] = nickname.toLowerCase();
		
		return;
	} else if ( socket.Client.isRegistered() && socket.Client.welcomeSent() ) {
		// Replace nickname at position of old nickname, in the _lcNicknames array
		var initialNicknamePosition = this._lcNicknames.indexOf( initialNickname.toLowerCase() );
		if ( initialNicknamePosition !== -1 ) {
			this._lcNicknames[ initialNicknamePosition ] = nickname.toLowerCase();
		}

		var channels = socket.Client.getChannels()
			,users = [];

		for ( var i = 0; i < channels.length; i++ ) {
			// Check if the channel exists
			var channelPosition = this._lcChannelNames.indexOf( channels[i].toLowerCase() )
				,channel;
			if ( channelPosition !== -1 ) {
				// Get the channel object, at this position
				channel = this._channels[ channelPosition ];

				// Update channel, with the new nickname
				channel.replaceUser( initialNickname, nickname );
			} else {
				continue;
			}

			users = users.concat( users, channel.getUsers() );
		}

		// Remove from channel invite lists (if this really is a new nickname)
		if ( initialNickname.toLowerCase() !== nickname.toLowerCase() ) {
			var invites = socket.Client.getInvites();
			for ( var i = 0; i < invites.length; i++ ) {
				var channelPosition = this._lcChannelNames.indexOf( invites[i].toLowerCase() )
					,channel;
				if ( channelPosition !== -1 ) {
					channel = this._channels[channelPosition];
					channel.removeInvite( socket.Client.getNickname() );
				}

				// Remove channel invite from user as well
				socket.Client.removeInvite( invites[i] );
			}
		}

		// If the user is on any channels, notify others of the nickname change
		// TODO: Optimise, remove redundancy with disconnect code...
		var _notified = []; // Lower case array of notified users, to avoid duplicates
		for ( var i = 0; i < users.length; i++ ) {
			// Ignore this user
			if ( users[i].toLowerCase() === socket.Client.getNickname().toLowerCase() ) {
				continue;
			}

			// Notify if not already done so
			if ( _notified.indexOf( users[i].toLowerCase() ) === -1 ) {
				// Find client socket
				var nicknamePosition = this._lcNicknames.indexOf( users[i].toLowerCase() );
				if ( nicknamePosition !== -1 ) {
					var clientSocket = this._clientSockets[ nicknamePosition ];
					clientSocket.emit(
						'NICK'
						,{
							initial: initialNickname
							,host: socket.Client.getHost()
							,user: socket.Client.getUser()
							,nickname: nickname
						}
					);
				}
			}
		}

		// Notify the user, that the change was a success
		socket.emit(
			'NICK'
			,{
				initial: initialNickname
				,host: socket.Client.getHost()
				,user: socket.Client.getUser()
				,nickname: socket.Client.getNickname()
			}
		);
	}
}

/**
 * Client USER command.
 * @param {Object} data Data object, with the required 'user', 'mode' and 'realname' parameters.
 * @param {Object} socket Socket object.
 * @function
 */
IRCProtocol.ClientProtocol.prototype.USER = function( data, socket ) {
	// Validate required properties
	if ( typeof data.user === "undefined" || typeof data.mode === "undefined" || typeof data.realname === "undefined" ) {
		// Issue an ERR_NEEDMOREPARAMS error.
		this.emitIRCError(
			socket
			,'ERR_NEEDMOREPARAMS'
			,IRCProtocol.NumericReplyConstants.CommonNumericReplies.ERR_NEEDMOREPARAMS[0]
			,IRCProtocol.NumericReplyConstants.CommonNumericReplies.ERR_NEEDMOREPARAMS[1]
		);
		return;
	}

	// ERR_ALREADYREGISTRED
	if ( socket.Client.welcomeSent() ) {
		// Issue an ERR_ALREADYREGISTRED error.
		this.emitIRCError(
			socket
			,'ERR_ALREADYREGISTRED'
			,IRCProtocol.NumericReplyConstants.Client.USER.ERR_ALREADYREGISTRED[0]
			,IRCProtocol.NumericReplyConstants.Client.USER.ERR_ALREADYREGISTRED[1]
		);
		return;
	}

	// TODO: Add proper user and realname validation.
	// TODO: Add proper mode validation (and functionality).

	// Set the user values
	socket.Client.setUser( data.user );

	// Set the realname
	socket.Client.setRealname( data.realname );

	// TODO: Optimise this check (redundant)...
	// If the user has just finished sending the USER and NICK commands, but the RPL_WELCOME has not been sent, do it now...

	if ( socket.Client.isRegistered() && !socket.Client.welcomeSent() ) {
		// Set to true, and issue the welcome stream of messages
		socket.Client.welcomeSent( true );

		// Notify the user
		this.emitIRCWelcome( socket );

		// Increase statistics number, for known clients
		this._stats.users++;
		// Decrease statistics number, for unknown clients
		this._stats.unknown--;
	}
}

/**
 * Client WHOIS command.
 * @param {Object} data Data object, with either the target and mask (optional) parameters. Mask can be either array, or scalar.
 * @param {Object} socket Socket object.
 * @function
 */
IRCProtocol.ClientProtocol.prototype.WHOIS = function( data, socket ) {
	// Reset pong interval
	// TODO: Remove redundant code
	socket.Client.setPingIdle( 0 );

	// Verify command parameters
	if ( typeof data.target === "undefined" ) {
		// Issue an ERR_NONICKNAMEGIVEN error.
		this.emitIRCError(
			socket
			,'ERR_NONICKNAMEGIVEN'
			,IRCProtocol.NumericReplyConstants.Client.NICK.ERR_NONICKNAMEGIVEN[0]
			,IRCProtocol.NumericReplyConstants.Client.NICK.ERR_NONICKNAMEGIVEN[1]
			,"No nickname given."
		);
		return;
	}

	// Check if the nickname is found in the nickname array. If not, then just return an ERR_NOSUCHNICK event.
	var nicknamePosition = this._lcNicknames.indexOf( data.target.toLowerCase() );
	if ( nicknamePosition === -1 ) {
		// Issue an ERR_NONICKNAMEGIVEN error.
		this.emitIRCError(
			socket
			,'ERR_NOSUCHNICK'
			,IRCProtocol.NumericReplyConstants.Client.WHOIS.ERR_NOSUCHNICK[0]
			,data.target + " :No such nick/channel"
		);
		return;
	} else {
		// The user is found! Get data, and return to client.
		// Get the user socket
		var clientSocket = this._clientSockets[ nicknamePosition ];

		// Emit WHOIS replies (some are special kind of replies...that require more data to be included)
		// TODO: Make consistent, and make use of constants
		// RPL_WHOISUSER
		socket.emit(
			'RPL_WHOISUSER'
			,{
				nick: clientSocket.Client.getNickname()
				,user: clientSocket.Client.getUser()
				,host: clientSocket.Client.getHost()
				,realname: clientSocket.Client.getRealname()
			}
		);

		// RPL_WHOISCHANNELS
		// TODO: Hide private, secret and anonymous channels
                // TODO: Include voice / operator status.
		if ( clientSocket.Client.getChannels().length !== 0 ) {
			socket.emit(
				'RPL_WHOISCHANNELS'
				,{
					nick: clientSocket.Client.getNickname()
					,channels: clientSocket.Client.getChannels()
				}
			);
		}

		// RPL_WHOISSERVER
		socket.emit(
			'RPL_WHOISSERVER'
			,{
				nick: clientSocket.Client.getNickname()
				,server: IRCProtocol.ServerName
				,serverinfo: IRCProtocol.ServerInfo
			}
		);

		// RPL_WHOISOPERATOR
		if ( clientSocket.Client.getMode( 'o' ) || clientSocket.Client.getMode( 'O' ) ) {
			socket.emit(
				'RPL_WHOISOPERATOR'
				,{
					nick: clientSocket.Client.getNickname()
				}
			);
		}

		// RPL_AWAY
		if ( clientSocket.Client.getMode( "a" ) ) {
			socket.emit(
				'RPL_AWAY'
				,{
					nick: clientSocket.Client.getNickname()
					,text: clientSocket.Client.getAway()
				}
			);
		}

		// RPL_WHOISIDLE
		socket.emit(
			'RPL_WHOISIDLE'
			,{
				nick: clientSocket.Client.getNickname()
				,idle: clientSocket.Client.getIdle()
			}
		);

		// RPL_ENDOFWHOIS
		// TODO: Perhaps all replies should return a JSON object, rather that _ANY_ string at all (to let the client decide which language to use, or how to display).
		socket.emit(
			'RPL_ENDOFWHOIS'
			,{
				nick: clientSocket.Client.getNickname()
			}
		);

		return;
	}

	// TODO: Add mask functionality
}

/**
 * Client JOIN command.
 * @param {Object} data Data object, with the required 'channels' and optional 'keys' keys.
 * @param {Object} socket Socket object.
 * @function
 */
IRCProtocol.ClientProtocol.prototype.JOIN = function( data, socket ) {
	// Reset pong interval
	// TODO: Remove redundant code
	socket.Client.setPingIdle( 0 );

	// Validate the command parameters
	if ( typeof data.channels === "undefined" || data.channels.length === 0 ) {
		// Issue an ERR_NEEDMOREPARAMS error.
		this.emitIRCError(
			socket
			,'ERR_NEEDMOREPARAMS'
			,IRCProtocol.NumericReplyConstants.CommonNumericReplies.ERR_NEEDMOREPARAMS[0]
			,"JOIN :" + IRCProtocol.NumericReplyConstants.CommonNumericReplies.ERR_NEEDMOREPARAMS[1]
		);
		return;
	}

	// Parse each channel
	var channelName = "";
	var param = 0;
	for ( var i = 0; i < data.channels.length; i++ ) {
		channelName = data.channels[i];

		// Validate channel name
		// ERR_NOSUCHCHANNEL
		if ( channelName.length > IRCProtocol.OtherConstants.CHANNEL_NAME_LENGTH || !IRCProtocol.OtherConstants.CHANNEL_NAME_PATTERN.test( channelName ) ) {
			// Return an invalid channel name error (ERR_NOSUCHCHANNEL)
			this.emitIRCError(
				socket
				,'ERR_NOSUCHCHANNEL'
				,IRCProtocol.NumericReplyConstants.Client.JOIN.ERR_NOSUCHCHANNEL[0]
				,channelName + " :" + IRCProtocol.NumericReplyConstants.Client.JOIN.ERR_NOSUCHCHANNEL[1]
			);

			return;
		}
		// Check if the channel exists (if not, create and add to list)
		var channelPosition = this._lcChannelNames.indexOf( channelName.toLowerCase() )
			,channel;
		if ( channelPosition !== -1 ) {
			// Get the channel object, at this position
			channel = this._channels[ channelPosition ];
		} else {
			// Create a new channel, and add to list
			this._lcChannelNames.push( channelName.toLowerCase() );
			channel = new IRCProtocol.IrcState.Channel( channelName );
			this._channels.push( channel );

			// Set user as operator, upon joining
			channel.addOperator( socket.Client.getNickname() );

			// Update the number of channels
			this._stats.channels++;
		}

		// ERR_BANNEDFROMCHAN if the user banned, not invited or not on an exception list
		if ( !channel.isException( socket ) && channel.isBanned( socket ) && !channel.isInvited( socket.Client.getNickname() ) ) {
			// ERR_BANNEDFROMCHAN
			this.emitIRCError(
				socket
				,'ERR_BANNEDFROMCHAN'
				,IRCProtocol.NumericReplyConstants.Client.JOIN.ERR_BANNEDFROMCHAN[0]
				,channel.getName() + " :" + IRCProtocol.NumericReplyConstants.Client.JOIN.ERR_BANNEDFROMCHAN[1]
			);
			continue;
		}

		// ERR_INVITEONLYCHAN if invite only, and user is not on the channel invite list
		if ( channel.getMode( 'i' ) && !channel.isInvited( socket.Client.getNickname() ) ) {
			// ERR_INVITEONLYCHAN
			this.emitIRCError(
				socket
				,'ERR_INVITEONLYCHAN'
				,IRCProtocol.NumericReplyConstants.Client.JOIN.ERR_INVITEONLYCHAN[0]
				,channel.getName() + " :" + IRCProtocol.NumericReplyConstants.Client.JOIN.ERR_INVITEONLYCHAN[1]
			);
			continue;
		}

		// ERR_CHANNELISFULL if +l and limit has been reached (override if user is invited)
		if ( channel.getMode( 'l' ) && channel.getLimit() !== 0 && channel.getUsers().length == channel.getLimit() && !channel.isInvited( socket.Client.getNickname() ) ) {
			// ERR_CHANNELISFULL
			this.emitIRCError(
				socket
				,'ERR_CHANNELISFULL'
				,IRCProtocol.NumericReplyConstants.Client.JOIN.ERR_CHANNELISFULL[0]
				,channel.getName() + " :" + IRCProtocol.NumericReplyConstants.Client.JOIN.ERR_CHANNELISFULL[1]
			);
			continue;
		}

		// ERR_BADCHANNELKEY if +k and invalid key is sent (override if user is invited)
		if ( channel.getMode( 'k' ) && !channel.isInvited( socket.Client.getNickname() ) && ( typeof data.keys === "undefined" || typeof data.keys[param] === "undefined" || data.keys[param] !== channel.getKey() ) ) {
			// ERR_BADCHANNELKEY
			this.emitIRCError(
				socket
				,'ERR_BADCHANNELKEY'
				,IRCProtocol.NumericReplyConstants.Client.JOIN.ERR_BADCHANNELKEY[0]
				,channel.getName() + " :" + IRCProtocol.NumericReplyConstants.Client.JOIN.ERR_BADCHANNELKEY[1]
			);
			continue;
		}

		// Add user to channel (if the user 'may' join this channel)
		if ( channel.addUser( socket ) ) {
			// JOIN (TODO: Verify!)
			socket.emit(
				'JOIN'
				,{
					channel: channel.getName()
					,nickname: socket.Client.getNickname()
					,user: socket.Client.getUser()
					,host: socket.Client.getHost()
					,servername: IRCProtocol.ServerName
				}
			);

			// RPL_TOPIC if topic is set.
			if ( channel.getTopic() ) {
				socket.emit(
					'RPL_TOPIC'
					,{
						channel: channel.getName()
						,topic: channel.getTopic()
					}
				);
			}

			// RPL_NAMREPLY
			socket.emit(
				'RPL_NAMREPLY'
				,{
					channel: channel.getName()
					,names: channel.getNames()
				}
			);

                        // RPL_ENDOFNAMES
                        socket.emit(
                                'RPL_ENDOFNAMES'
                                ,{
                                        channel: channel.getName()
                                        ,msg: IRCProtocol.NumericReplyConstants.Client.NAMES.RPL_ENDOFNAMES[1]
                                }
                        );

			// Update the user's channel list
			socket.Client.addChannel( channel.getName() );
		}
	}
}

/**
 * Client PART command.
 * @param {Object} data Data object, with the required 'channels' key.
 * @param {Object} socket Socket object.
 * @function
 */
IRCProtocol.ClientProtocol.prototype.PART = function( data, socket ) {
	// Reset pong interval
	// TODO: Remove redundant code
	socket.Client.setPingIdle( 0 );

	// Validate required properties
	if ( typeof data.channels === "undefined" || data.channels.length === 0 ) {
		// Issue an ERR_NEEDMOREPARAMS error.
		this.emitIRCError(
			socket
			,'ERR_NEEDMOREPARAMS'
			,IRCProtocol.NumericReplyConstants.CommonNumericReplies.ERR_NEEDMOREPARAMS[0]
			,IRCProtocol.NumericReplyConstants.CommonNumericReplies.ERR_NEEDMOREPARAMS[1]
		);
		return;
	}

	// Parse each channel
	var channelName = "";
	for ( var i = 0; i < data.channels.length; i++ ) {
		channelName = data.channels[i];
		// TODO: Validate channel name

		// Check if the channel exists (if not, create and add to list)
		var channelPosition = this._lcChannelNames.indexOf( channelName.toLowerCase() )
			,channel;
		if ( channelPosition !== -1 ) {
			// Get the channel object, at this position
			channel = this._channels[ channelPosition ];

			// And remove the user
			channel.removeUser( socket );

			// Update the user's channel list
			socket.Client.removeChannel( channel.getName() );

			if ( channel.getUsers().length === 0 ) {
				// Remove channel from lists, if empty
				this._channels.splice( channelPosition, 1 );
				this._lcChannelNames.splice( channelPosition, 1 );

				// Update the number of channels
				this._stats.channels--;
			}
		} else {
			// TODO: ERR_NOTONCHANNEL
			return;
		}
	}
}

/**
 * Client PRIVMSG command.
 * @param {Object} data Data object, with the required 'target' and 'message' keys.
 * @param {Object} socket Socket object.
 * @function
 */
IRCProtocol.ClientProtocol.prototype.PRIVMSG = function( data, socket ) {
	// Reset pong interval
	// TODO: Remove redundant code
	socket.Client.setPingIdle( 0 );

	// Validate the command parameters
	if ( typeof data.target === "undefined" || !S( data.target ).trim().s ) {
		// Issue an ERR_NORECIPIENT error.
		this.emitIRCError(
			socket
			,'ERR_NORECIPIENT'
			,IRCProtocol.NumericReplyConstants.Client.PRIVMSG.ERR_NORECIPIENT[0]
			,"No recipient given (PRIVMSG)"
		);
		return;
	}
	if ( typeof data.message === "undefined" || !S( data.message ).trim().s ) {
		// Issue an ERR_NOTEXTTOSEND error.
		this.emitIRCError(
			socket
			,'ERR_NOTEXTTOSEND'
			,IRCProtocol.NumericReplyConstants.Client.PRIVMSG.ERR_NORECIPIENT[0]
			,"No text to send"
		);
		return;
	}

	// Check if target is a valid nickname or channel
	// TODO: Handle masks and such.
	var isChannel = data.target.length <= IRCProtocol.OtherConstants.CHANNEL_NAME_LENGTH && IRCProtocol.OtherConstants.CHANNEL_NAME_PATTERN.test( data.target );
	var isNickname = data.target.length <= IRCProtocol.OtherConstants.NICK_LENGTH && IRCProtocol.OtherConstants.NICK_PATTERN.test( data.target );

	// If neither, issue a ERR_NOSUCHNICK
	if ( !isChannel && !isNickname ) {
		this.emitIRCError(
			socket
			,'ERR_NOSUCHNICK'
			,IRCProtocol.NumericReplyConstants.Client.WHOIS.ERR_NOSUCHNICK[0]
			,data.target + " :No such nick/channel"
		);
		return;
	}

	// Handle channel messages
	if ( isChannel ) {
		// Find the channel first
		var channelPosition = this._lcChannelNames.indexOf( data.target.toLowerCase() );
		if ( channelPosition !== -1 ) {
			// Get the channel object, at this position
			channel = this._channels[ channelPosition ];

			// Check if mode '+n' is set...if so, prevent external users from sending messages
			if ( channel.getMode( "n" ) && channel._lcUsers.indexOf( socket.Client.getNickname().toLowerCase() ) === -1 ) {
				this.emitIRCError(
					socket
					,'ERR_CANNOTSENDTOCHAN'
					,IRCProtocol.NumericReplyConstants.Client.PRIVMSG.ERR_CANNOTSENDTOCHAN[0]
					,data.target + " :" + IRCProtocol.NumericReplyConstants.Client.PRIVMSG.ERR_CANNOTSENDTOCHAN[1]
				);
				return;
			}

			// Check if channel mode is +m and user is not operator or does not have voice
			if ( channel.getMode( "m" ) && !channel.isOperator( socket.Client.getNickname() ) && !channel.hasVoice( socket.Client.getNickname() ) ) {
				this.emitIRCError(
					socket
					,'ERR_CANNOTSENDTOCHAN'
					,IRCProtocol.NumericReplyConstants.Client.PRIVMSG.ERR_CANNOTSENDTOCHAN[0]
					,data.target + " :" + IRCProtocol.NumericReplyConstants.Client.PRIVMSG.ERR_CANNOTSENDTOCHAN[1]
				);
				return;
			}

			// Check if user is banned, and does not have voice or is not operator
			if ( !channel.isException( socket ) && channel.isBanned( socket ) && !channel.isOperator( socket.Client.getNickname() ) && !channel.hasVoice( socket.Client.getNickname() ) ) {
				this.emitIRCError(
					socket
					,'ERR_CANNOTSENDTOCHAN'
					,IRCProtocol.NumericReplyConstants.Client.PRIVMSG.ERR_CANNOTSENDTOCHAN[0]
					,data.target + " :" + IRCProtocol.NumericReplyConstants.Client.PRIVMSG.ERR_CANNOTSENDTOCHAN[1]
				);
				return;
			}

			// Broadcast message
			channel.PRIVMSG( data.message, socket );
		} else {
			// Channel not found, issue an ERR_NOSUCHNICK error
			this.emitIRCError(
				socket
				,'ERR_NOSUCHNICK'
				,IRCProtocol.NumericReplyConstants.Client.WHOIS.ERR_NOSUCHNICK[0]
				,data.target + " :No such nick/channel"
			);
			return;
		}
	} else if ( isNickname ) {
		// Handle client to client chat
		// Find target
		var nicknamePosition = this._lcNicknames.indexOf( data.target.toLowerCase() );

		if ( nicknamePosition === -1 ) {
			// User not found, issue an ERR_NOSUCHNICK error
			this.emitIRCError(
				socket
				,'ERR_NOSUCHNICK'
				,IRCProtocol.NumericReplyConstants.Client.WHOIS.ERR_NOSUCHNICK[0]
				,data.target + " :No such nick/channel"
			);
			return;
		} else {
			// If the user target is away, let the source know it
			if ( this._clientSockets[nicknamePosition].Client.getMode( "a" ) ) {
				socket.emit(
					'RPL_AWAY'
					,{
						nick: this._clientSockets[nicknamePosition].Client.getNickname()
						,text: this._clientSockets[nicknamePosition].Client.getAway()
					}
				);
			}

			// Send to target
			this._clientSockets[nicknamePosition].emit(
				'PRIVMSG'
				,{
					target: data.target
					,message: data.message
					,nickname: socket.Client.getNickname()
					,user: socket.Client.getUser()
					,host: socket.Client.getHost()
					,servername: IRCProtocol.ServerName
				}
			);
		}
	}

	// TODO: Handle user to user messages
}

/**
 * Client MOTD command.
 * TODO: Once oper functionality is in place, load the MOTD content once, and reload upon a REHASH command
 * @param {Object} data Data object, with the optional 'target' key.
 * @param {Object} socket Socket object.
 * @function
 */
IRCProtocol.ClientProtocol.prototype.MOTD = function( data, socket ) {
	// Reset pong interval
	// TODO: Remove redundant code
	socket.Client.setPingIdle( 0 );

	// TODO: Add target support

	// Read the MOTD file
	fs.readFile( IRCProtocol.MotdFile, function ( err, data ) {
		// Return an ERR_NOMOTD event, if file can't be read
		if ( err ) {
			this.emitIRCError(
				socket
				,'ERR_NOMOTD'
				,IRCProtocol.NumericReplyConstants.Client.MOTD.ERR_NOMOTD[0]
				,IRCProtocol.NumericReplyConstants.Client.MOTD.ERR_NOMOTD[1]
			);
		} else {
			// Begin with RPL_MOTDSTART
			this.emitIRCError(
				socket
				,'RPL_MOTDSTART'
				,IRCProtocol.NumericReplyConstants.Client.MOTD.RPL_MOTDSTART[0]
				,"- " + IRCProtocol.ServerName + " " + IRCProtocol.NumericReplyConstants.Client.MOTD.RPL_MOTDSTART[1]
			);

			// Send the MOTD file content, line by line
			var motdContentArray = data.toString().split( "\n" );

			// RPL_MOTD
			for ( var i = 0; i < motdContentArray.length; i++ ) {
				this.emitIRCError(
					socket
					,'RPL_MOTD'
					,IRCProtocol.NumericReplyConstants.Client.MOTD.RPL_MOTD[0]
					,"- " + motdContentArray[i]
				);
			}

			// RPL_ENDOFMOTD
			this.emitIRCError(
				socket
				,'RPL_ENDOFMOTD'
				,IRCProtocol.NumericReplyConstants.Client.MOTD.RPL_ENDOFMOTD[0]
				,IRCProtocol.NumericReplyConstants.Client.MOTD.RPL_ENDOFMOTD[1]
			);
		}
	}.bind( this ) );
}

/**
 * Client LUSERS command.
 * @param {Object} data Data object, with the optional 'target' and 'mask' keys.
 * @param {Object} socket Socket object.
 * @function
 */
IRCProtocol.ClientProtocol.prototype.LUSERS = function( data, socket ) {
	// Reset pong interval
	// TODO: Remove redundant code
	socket.Client.setPingIdle( 0 );

	// TODO: Add mask and target support

	// RPL_LUSERCLIENT
	this.emitIRCError(
		socket
		,'RPL_LUSERCLIENT'
		,IRCProtocol.NumericReplyConstants.Client.LUSERS.RPL_LUSERCLIENT[0]
		,"There are " + this._stats.users + " users and " + this._stats.services + " services on " + this._stats.network_servers + " servers"
	);

	// RPL_LUSEROP
	this.emitIRCError(
		socket
		,'RPL_LUSEROP'
		,IRCProtocol.NumericReplyConstants.Client.LUSERS.RPL_LUSEROP[0]
		,this._stats.operators + " :operator(s) online"
	);

	// RPL_LUSERUNKOWN
	this.emitIRCError(
		socket
		,'RPL_LUSERUNKOWN'
		,IRCProtocol.NumericReplyConstants.Client.LUSERS.RPL_LUSERUNKOWN[0]
		,this._stats.unknown + " :unknown connection(s)"
	);

	// RPL_LUSERCHANNELS
	this.emitIRCError(
		socket
		,'RPL_LUSERCHANNELS'
		,IRCProtocol.NumericReplyConstants.Client.LUSERS.RPL_LUSERCHANNELS[0]
		,this._stats.channels + " :channels formed"
	);

	// RPL_LUSERME
	this.emitIRCError(
		socket
		,'RPL_LUSERME'
		,IRCProtocol.NumericReplyConstants.Client.LUSERS.RPL_LUSERME[0]
		,"I have " + this._stats.users + " clients and " + this._stats.local_servers + " servers"
	);
}

/**
 * Client PONG command.
 * @param {Object} data Data object, with the required 'server1' and optional 'server2' keys.
 * @param {Object} socket Socket object.
 * @function
 */
IRCProtocol.ClientProtocol.prototype.PONG = function( data, socket ) {
	// Reset pong interval
	// TODO: Validate data
	socket.Client.setPingIdle( 0 );
}

/**
 * Client TOPIC command.
 * @param {Object} data Data object, with the required 'channel' and optional 'topic' keys.
 * @param {Object} socket Socket object.
 * @function
 */
IRCProtocol.ClientProtocol.prototype.TOPIC = function( data, socket ) {
	// Validate required properties
	if ( typeof data.channel === "undefined" || S( data.channel ).trim().s === "" ) {
		// Issue an ERR_NEEDMOREPARAMS error.
		this.emitIRCError(
			socket
			,'ERR_NEEDMOREPARAMS'
			,IRCProtocol.NumericReplyConstants.CommonNumericReplies.ERR_NEEDMOREPARAMS[0]
			,IRCProtocol.NumericReplyConstants.CommonNumericReplies.ERR_NEEDMOREPARAMS[1]
		);
		return;
	}

	// Check channel names
	var isChannel = data.channel.length <= IRCProtocol.OtherConstants.CHANNEL_NAME_LENGTH && IRCProtocol.OtherConstants.CHANNEL_NAME_PATTERN.test( data.channel );
	if ( !isChannel ) {
		this.emitIRCError(
			socket
			,'ERR_NOSUCHCHANNEL'
			,IRCProtocol.NumericReplyConstants.Client.JOIN.ERR_NOSUCHCHANNEL[0]
			,data.channel + " :" + IRCProtocol.NumericReplyConstants.Client.JOIN.ERR_NOSUCHCHANNEL[1]
		);
		return;
	} else {
		// Find the channel
		var channelPosition = this._lcChannelNames.indexOf( data.channel.toLowerCase() )
			,channel;

		// Err if not found
		if ( channelPosition === -1 ) {
			this.emitIRCError(
				socket
				,'ERR_NOSUCHCHANNEL'
				,IRCProtocol.NumericReplyConstants.Client.JOIN.ERR_NOSUCHCHANNEL[0]
				,data.channel + " :" + IRCProtocol.NumericReplyConstants.Client.JOIN.ERR_NOSUCHCHANNEL[1]
			);
			return;
		}
		channel = this._channels[ channelPosition ];

		// Verify if the user is on that channel
		var user = channel._lcUsers.indexOf( socket.Client.getNickname().toLowerCase() );
		if ( user === -1 ) {
			// ERR_NOTONCHANNEL
			this.emitIRCError(
				socket
				,'ERR_NOTONCHANNEL'
				,IRCProtocol.NumericReplyConstants.Client.TOPIC.ERR_NOTONCHANNEL[0]
				,data.channel + " :" + IRCProtocol.NumericReplyConstants.Client.TOPIC.ERR_NOTONCHANNEL[1]
			);
			return;
		}

		// Verify that if the channel has the +t mode set and user is not operator, they can not set topic...unless making a query
		if ( typeof data.topic !== "undefined" && channel.getMode( 't' ) && !channel.isOperator( socket.Client.getNickname() ) ) {
			// ERR_CHANOPRIVSNEEDED
			this.emitIRCError(
				socket
				,'ERR_CHANOPRIVSNEEDED'
				,IRCProtocol.NumericReplyConstants.Client.MODE.ERR_CHANOPRIVSNEEDED[0]
				,data.channel + " :" + IRCProtocol.NumericReplyConstants.Client.MODE.ERR_CHANOPRIVSNEEDED[1]
			);
			return;
		}

		// If the topic parameter is missing, return the topic
		if ( typeof data.topic === "undefined" ) {
			// RPL_TOPIC or RPL_NOTOPIC
			if ( channel.getTopic() ) {
				socket.emit(
					'RPL_TOPIC'
					,{
						channel: channel.getName()
						,topic: channel.getTopic()
					}
				);
			} else {
				socket.emit(
					'RPL_NOTOPIC'
					,{
						channel: channel.getName()
					}
				);
			}
			return;
		} else {
			// Set the topic
			channel.setTopic( data.topic, socket );
		}
	}
}

/**
 * Client LIST command.
 * @param {Object} data Data object, with the optional 'channels' array and optional 'target' keys.
 * @param {Object} socket Socket object.
 * @function
 */
IRCProtocol.ClientProtocol.prototype.LIST = function( data, socket ) {
	// RPL_LIST
	var channels = [];
	var topics = [];
	var users = [];

	for ( var i = 0; i < this._channels.length; i++ ) {
		// Do not list these channels
		if ( this._channels[i].getMode( 's' ) || this._channels[i].getMode( 'p' ) ) {
			continue;
		}

		channels.push( this._channels[i].getName() );
		topics.push( this._channels[i].getTopic() );
		users.push( this._channels[i].getUsers().length );

		if ( i % IRCClient.MaxChannelList === 0 || i === this._channels.length - 1 ) {
			socket.emit(
				'RPL_LIST'
				,{
					channels: channels
					,users: users
					,topics: topics
				}
			);
			channels = [];
			topics = [];
			users = [];
		}
	}

	// RPL_LISTEND (TODO: avoid same request from a user, twice)
	this.emitIRCError(
		socket
		,'RPL_LISTEND'
		,IRCProtocol.NumericReplyConstants.Client.LIST.RPL_LISTEND[0]
		,IRCProtocol.NumericReplyConstants.Client.LIST.RPL_LISTEND[1]
	);

	// TODO: Add channels and target support
}

/**
 * Client OPER command.
 * @param {Object} data Data object, with the required 'password' key.
 * @param {Object} socket Socket object.
 * @function
 */
IRCProtocol.ClientProtocol.prototype.OPER = function( data, socket ) {
	// Validate required parameters
	if ( typeof data.password === "undefined" ) {
		// Issue an ERR_NEEDMOREPARAMS error.
		this.emitIRCError(
			socket
			,'ERR_NEEDMOREPARAMS'
			,IRCProtocol.NumericReplyConstants.CommonNumericReplies.ERR_NEEDMOREPARAMS[0]
			,IRCProtocol.NumericReplyConstants.CommonNumericReplies.ERR_NEEDMOREPARAMS[1]
		);
		return;
	}

	// TODO: Check host
	// Validate password, case insensitive
	if ( data.password === IRCProtocol.OperPassword ) {
		// RPL_YOUREOPER
		this.emitIRCError(
			socket
			,'RPL_YOUREOPER'
			,IRCProtocol.NumericReplyConstants.Client.OPER.RPL_YOUREOPER[0]
			,IRCProtocol.NumericReplyConstants.Client.OPER.RPL_YOUREOPER[1]
		);

		// Set user as local operator
		socket.Client.setMode( 'O', true );
	} else {
		// ERR_PASSWDMISMATCH
		this.emitIRCError(
			socket
			,'ERR_PASSWDMISMATCH'
			,IRCProtocol.NumericReplyConstants.Client.OPER.ERR_PASSWDMISMATCH[0]
			,IRCProtocol.NumericReplyConstants.Client.OPER.ERR_PASSWDMISMATCH[1]
		);
	}
}

/**
 * Client VERSION command.
 * @param {Object} data Data object, with the optional 'target' key.
 * @param {Object} socket Socket object.
 * @function
 */
IRCProtocol.ClientProtocol.prototype.VERSION = function( data, socket ) {
	// TODO: ERR_NOSUCHSERVER
	// RPL_VERSION
	this.emitIRCError(
		socket
		,'RPL_VERSION'
		,IRCProtocol.NumericReplyConstants.CommonNumericReplies.RPL_VERSION[0]
		,IRCProtocol.Version + '.' + IRCProtocol.DebugLevel + ' ' + IRCProtocol.ServerName + ' :' + IRCProtocol.ServerComments
	);
}

/**
 * Client TIME command.
 * @param {Object} data Data object, with the optional 'target' key.
 * @param {Object} socket Socket object.
 * @function
 */
IRCProtocol.ClientProtocol.prototype.TIME = function( data, socket ) {
	// TODO: Target support
	// TODO: ERR_NOSUCHSERVER
	// RPL_TIME
	this.emitIRCError(
		socket
		,'RPL_TIME'
		,IRCProtocol.NumericReplyConstants.CommonNumericReplies.RPL_TIME[0]
		,IRCProtocol.ServerName + ' :' + new Date()
	);
}

/**
 * Client ADMIN command.
 * @param {Object} data Data object, with the optional 'target' key.
 * @param {Object} socket Socket object.
 * @function
 */
IRCProtocol.ClientProtocol.prototype.ADMIN = function( data, socket ) {
	// TODO: Target support
	// TODO: ERR_NOSUCHSERVER
	// RPL_ADMINME
	this.emitIRCError(
		socket
		,'RPL_ADMINME'
		,IRCProtocol.NumericReplyConstants.Client.ADMIN.RPL_ADMINME[0]
		,IRCProtocol.ServerName + IRCProtocol.NumericReplyConstants.Client.ADMIN.RPL_ADMINME[1]
	);

	// RPL_ADMINLOC1
	this.emitIRCError(
		socket
		,'RPL_ADMINLOC1'
		,IRCProtocol.NumericReplyConstants.Client.ADMIN.RPL_ADMINLOC1[0]
		,':' + IRCProtocol.AdminInfo.Location
	);

	// RPL_ADMINLOC2
	this.emitIRCError(
		socket
		,'RPL_ADMINLOC2'
		,IRCProtocol.NumericReplyConstants.Client.ADMIN.RPL_ADMINLOC2[0]
		,':' + IRCProtocol.AdminInfo.Organization
	);

	// RPL_ADMINEMAIL
	this.emitIRCError(
		socket
		,'RPL_ADMINEMAIL'
		,IRCProtocol.NumericReplyConstants.Client.ADMIN.RPL_ADMINEMAIL[0]
		,':' + IRCProtocol.AdminInfo.Email
	);
}

/**
 * Client INFO command.
 * @param {Object} data Data object, with the optional 'target' key.
 * @param {Object} socket Socket object.
 * @function
 */
IRCProtocol.ClientProtocol.prototype.INFO = function( data, socket ) {
	// TODO: Target support
	// TODO: ERR_NOSUCHSERVER
	// RPL_INFO
	var infoContentArray = IRCProtocol.Info.split( "\n" );
	for ( var i = 0; i < infoContentArray.length; i++ ) {
		this.emitIRCError(
			socket
			,'RPL_INFO'
			,IRCProtocol.NumericReplyConstants.Client.INFO.RPL_INFO[0]
			,"- " + infoContentArray[i]
		);
	}

	// RPL_ENDOFINFO
	this.emitIRCError(
		socket
		,'RPL_ENDOFINFO'
		,IRCProtocol.NumericReplyConstants.Client.INFO.RPL_ENDOFINFO[0]
		,IRCProtocol.NumericReplyConstants.Client.INFO.RPL_ENDOFINFO[1]
	);
}

/**
 * Client KILL command.
 * @param {Object} data Data object, with the required 'comment' and 'nickname' keys.
 * @param {Object} socket Socket object.
 * @function
 */
IRCProtocol.ClientProtocol.prototype.KILL = function( data, socket ) {
	// Validate required parameters
	if ( typeof data.comment === "undefined" || S( data.comment ).trim().s === "" || typeof data.nickname === "undefined" || S( data.nickname ).trim().s === "" ) {
		// Issue an ERR_NEEDMOREPARAMS error.
		this.emitIRCError(
			socket
			,'ERR_NEEDMOREPARAMS'
			,IRCProtocol.NumericReplyConstants.CommonNumericReplies.ERR_NEEDMOREPARAMS[0]
			,IRCProtocol.NumericReplyConstants.CommonNumericReplies.ERR_NEEDMOREPARAMS[1]
		);
		return;
	}

	// TODO: ERR_CANTKILLSERVER
	if ( !socket.Client.getMode( 'o' ) && !socket.Client.getMode( 'O' ) ) {
		// ERR_NOPRIVILEGES
		this.emitIRCError(
			socket
			,'ERR_NOPRIVILEGES'
			,IRCProtocol.NumericReplyConstants.Client.KILL.ERR_NOPRIVILEGES[0]
			,IRCProtocol.NumericReplyConstants.Client.KILL.ERR_NOPRIVILEGES[1]
		);
	} else {
		// Find target
		var nicknamePosition = this._lcNicknames.indexOf( data.nickname.toLowerCase() );

		// ERR_NOSUCHNICK if not found
		if ( nicknamePosition === -1 ) {
			this.emitIRCError(
				socket
				,'ERR_NOSUCHNICK'
				,IRCProtocol.NumericReplyConstants.Client.WHOIS.ERR_NOSUCHNICK[0]
				,data.nickname + " :No such nick/channel"
			);
		} else {
			// Issue a QUIT command "from" the target user, with a KILL message, and terminate connection
			var clientSocket = this._clientSockets[ nicknamePosition ];

			// TODO: Remove redundancy
			// Set kill message
			clientSocket.Client.setQuitMessage( "KILL: " + data.comment );

			// Drop connection
			clientSocket.disconnect( {}, clientSocket );
		}
	}
}

/**
 * Client MODE command.
 * @param {Object} data Data object, with the required 'target' parameter, and optional 'modes' array, and if channel, 'params' array.
 * @param {Object} socket Socket object.
 * @function
 */
IRCProtocol.ClientProtocol.prototype.MODE = function( data, socket ) {
	// Validate parameters
	if ( typeof data.target === "undefined" ) {
		// ERR_NEEDMOREPARAMS
		this.emitIRCError(
			socket
			,'ERR_NEEDMOREPARAMS'
			,IRCProtocol.NumericReplyConstants.CommonNumericReplies.ERR_NEEDMOREPARAMS[0]
			,IRCProtocol.NumericReplyConstants.CommonNumericReplies.ERR_NEEDMOREPARAMS[1]
		);
		return;
	}

	// Check if target is a nickname or channel
	var isChannel = data.target.length <= IRCProtocol.OtherConstants.CHANNEL_NAME_LENGTH && IRCProtocol.OtherConstants.CHANNEL_NAME_PATTERN.test( data.target );
	var isNickname = data.target.length <= IRCProtocol.OtherConstants.NICK_LENGTH && IRCProtocol.OtherConstants.NICK_PATTERN.test( data.target );

	if ( isNickname ) {
		// Check if the user is only querying for his/her modes
		if ( S( data.target ).trim().s.toLowerCase() === socket.Client.getNickname().toLowerCase() && ( typeof data.modes === "undefined" || data.modes.length === 0 ) ) {
			// RPL_UMODEIS
			this.emitIRCError(
				socket
				,'RPL_UMODEIS'
				,IRCProtocol.NumericReplyConstants.Client.MODE.RPL_UMODEIS[0]
				// Only return set modes
				,"+" + socket.Client.getSetModesString()
			);
			return;
		} else if ( S( data.target ).trim().s.toLowerCase() !== socket.Client.getNickname().toLowerCase() && ( data.modes !== "undefined" || data.modes.length !== 0 ) ) {
			// ERR_USERSDONTMATCH if changing modes for others
			this.emitIRCError(
				socket
				,'ERR_USERSDONTMATCH'
				,IRCProtocol.NumericReplyConstants.Client.MODE.ERR_USERSDONTMATCH[0]
				,IRCProtocol.NumericReplyConstants.Client.MODE.ERR_USERSDONTMATCH[1]
			);
			return;
		} else if ( S( data.target ).trim().s.toLowerCase() === socket.Client.getNickname().toLowerCase() && ( data.modes !== "undefined" || data.modes.length !== 0 ) ) {
			// Set modes
			var set = false; // Setting or removing modes
			var errSent = false; // Prevent from sending ERR_UMODEUNKNOWNFLAG more than once, per query
			for ( var i = 0; i < data.modes.length; i++ ) {
				// Check if setting
				if ( data.modes[i][0] === "+" ) {
					set = true;
				} else if ( data.modes[i][0] === "-" ) {
					set = false;
				} else if ( data.modes[i][0] !== "+" && data.modes[i][0] !== "-" ) {
					// Ingore...
					continue;
				}
				// Set/remove modes
				for ( var j = 1; j < data.modes[i].length; j++ ) {
					// NOTE: As per RFC2812, o/O/a can not be set using this command!
					if ( set && ( data.modes[i][j] === "o" || data.modes[i][j] === "O" || data.modes[i][j] === "a" ) ) {
						continue;
					}
					// NOTE: As per RFC2812, a/r can not be un-set using this command!
					if ( !set && ( data.modes[i][j] === "a" || data.modes[i][j] === "r" ) ) {
						continue;
					}

					// If a mode is 'unknown', return an ERR_UMODEUNKNOWNFLAG error...once per query
					if ( !errSent && IRCProtocol.UserModes.indexOf( data.modes[i][j] ) === -1 ) {
						// ERR_UMODEUNKNOWNFLAG
						this.emitIRCError(
							socket
							,'ERR_UMODEUNKNOWNFLAG'
							,IRCProtocol.NumericReplyConstants.Client.MODE.ERR_UMODEUNKNOWNFLAG[0]
							,IRCProtocol.NumericReplyConstants.Client.MODE.ERR_UMODEUNKNOWNFLAG[1]
						);
						errSent = true;
						continue;
					}

					// Set/remove modes
					socket.Client.setMode( data.modes[i][j], set );
				}
			}
		}
	} else if ( isChannel ) {
		// Find target
		// NOTE: Some of this functionality is redundant
		// TODO: Check if a user is on channel
		// TODO: Handle special types of channels that don't support modes
		// Get channel users
		var channelPosition = this._lcChannelNames.indexOf( data.target.toLowerCase() )
			,channel;

		// Ignore non existing channels
		if ( channelPosition !== -1 ) {
			// Get the channel object, at this position
			channel = this._channels[ channelPosition ];

			// Check if the user is only querying channel modes
			// NOTE: Return 'simple' channel modes, as exception, invite and ban are returned by their own events
			if ( typeof data.modes === "undefined" || data.modes.length === 0 ) {
				var channelModes = channel.getSetModesString();
				var params = [];

				// Determine params
				for ( var i = 0; i < channelModes.length; i++ ) {
					switch ( channelModes[i] ) {
						case "l":
							params.push( channel.getLimit() );
							break;
						case "k":
							params.push( channel.getKey() );
							break;
						default:
							// Do nothing
							break;
					}
				}

				// RPL_CHANNELMODEIS
				// TODO: RFC is not clear on this
				socket.emit(
					'RPL_CHANNELMODEIS'
					// Only return set modes
					,{
						mode: "+" + channelModes
						,channel: channel.getName()
						,params: params
					}
				);

				return;
			} else {
				// Check if user has privileges (is operator) for that channel
				if ( !channel.isOperator( socket.Client.getNickname() ) ) {
					// ERR_CHANOPRIVSNEEDED
					this.emitIRCError(
						socket
						,'ERR_CHANOPRIVSNEEDED'
						,IRCProtocol.NumericReplyConstants.Client.MODE.ERR_CHANOPRIVSNEEDED[0]
						,data.target + " :" + IRCProtocol.NumericReplyConstants.Client.MODE.ERR_CHANOPRIVSNEEDED[1]
					);
					return;
				}

				// Verify if the user is on that channel
				var user = channel._lcUsers.indexOf( socket.Client.getNickname().toLowerCase() );
				if ( user === -1 ) {
					// ERR_NOTONCHANNEL
					this.emitIRCError(
						socket
						,'ERR_NOTONCHANNEL'
						,IRCProtocol.NumericReplyConstants.Client.TOPIC.ERR_NOTONCHANNEL[0]
						,data.target + " :" + IRCProtocol.NumericReplyConstants.Client.TOPIC.ERR_NOTONCHANNEL[1]
					);
					return;
				}

				// Begin setting modes
				// Set modes
				var set = false; // Setting or removing modes
				var query = false; // If only querying for special modes

				// Check if setting
				if ( data.modes[0] === "+" ) {
					set = true;
					query = false;
				} else if ( data.modes[0] === "-" ) {
					query = false;
					set = false;
				} else if ( data.modes[0] !== "+" && data.modes[0] !== "-" ) {
					set = false;
					query = true;
				}

				// Set or remove modes
				// NOTE: Test command for setting all 'basic' modes: /mode #test +aimnqpsrt
				// TODO: Add special modes
				// TODO: Verify owner 'permissions' to change such modes
				// Set/remove modes
				var param = 0;
				for ( var j = 0; j < data.modes.length; j++ ) {
					if ( data.modes[j] === "+" || data.modes[j] === "-" ) {
						continue;
					}

					// Silently ignore 'a' modes, for '#' channels
					// TODO: Only allow channel creators ('O') to make this change on ! channels (set, while any other operator may unset it)
					if ( data.modes[j] === "a" && ( channel.getName()[0] === "#" || channel.getName()[0] === "+" ) ) {
						continue;
					}
					// If a mode is 'unknown', return an ERR_UNKNOWNMODE error...once per query
					if ( IRCProtocol.ChannelModes.indexOf( data.modes[j] ) === -1 ) {
						// ERR_UNKNOWNMODE
						this.emitIRCError(
							socket
							,'ERR_UNKNOWNMODE'
							,IRCProtocol.NumericReplyConstants.Client.MODE.ERR_UNKNOWNMODE[0]
							,data.modes[j] + IRCProtocol.NumericReplyConstants.Client.MODE.ERR_UNKNOWNMODE[1] + data.target
						);
						continue;
					}

					// Ignore if mode is already set (except limit and key...o and v...b and e)
					if ( set === true && channel.getMode( data.modes[j] ) && data.modes[j] !== "l" && data.modes[j] !== "k" && data.modes[j] !== "o" && data.modes[j] !== "v" && data.modes[j] !== "b" && data.modes[j] !== "e" ) {
						continue;
					}

					// Ignore if removing and mode is not set
					if ( set === false && query === false && !channel.getMode( data.modes[j] ) && data.modes[j] !== "o" && data.modes[j] !== "v" && data.modes[j] !== "b" && data.modes[j] !== "e" ) {
						continue;
					}

					if ( query === false ) {
						// Handle special modes
						switch ( data.modes[j] ) {
							case "l":
								if ( set === true ) {
									if ( typeof data.parameters === "undefined" || data.parameters.length === 0 || typeof data.parameters[param] === "undefined" ) {
										// Silently ignore
										param++;
										continue;
									} else {
										// Check if we are removing the mode
										if ( !parseInt( data.parameters[param], 10 ) ) {
											set = false;
											channel.setMode( socket, data.modes[j], set, 0 );
										} else {
											// Set mode
											channel.setMode( socket, data.modes[j], set, parseInt( data.parameters[param], 10 ) );
										}
										// Increment param value, as this parameter had already been used
										param++;
									}
								} else {
									channel.setMode( socket, data.modes[j], set, 0 );
									param++;
								}
								break;
							case "k":
								if ( set === true ) {
									if ( typeof data.parameters === "undefined" || data.parameters.length === 0 || typeof data.parameters[param] === "undefined" ) {
										// Silently ignore
										param++;
										continue;
									} else {
										// Check if we are removing the mode
										if ( data.parameters[param] === "" ) {
											set = false;
											channel.setMode( socket, data.modes[j], set, "" );
										} else {
											// Set mode
											channel.setMode( socket, data.modes[j], set, data.parameters[param] );
										}
										// Increment param value, as this parameter had already been used
										param++;
									}
								} else {
									channel.setMode( socket, data.modes[j], set, "" );
									param++;
								}
								break;
							case "o":
								// Channel operator mode (set/remove)
								if ( typeof data.parameters === "undefined" || data.parameters.length === 0 || typeof data.parameters[param] === "undefined" ) {
									// Silently ignore
									param++;
									continue;
								} else if ( ( set === true && channel.isOperator( data.parameters[param] ) ) || ( set === false && !channel.isOperator( data.parameters[param] ) ) ) {
									// Silently ignore, if already an operator
									param++;
									continue;
								}

								// Check if the user exists
								var nicknamePosition = this._lcNicknames.indexOf( data.parameters[param].toLowerCase() )
									,clientSocket;
								if ( nicknamePosition !== -1 ) {
									clientSocket = this._clientSockets[ nicknamePosition ];
								} else {
									// ERR_NOSUCHNICK
									this.emitIRCError(
										socket
										,'ERR_NOSUCHNICK'
										,IRCProtocol.NumericReplyConstants.Client.WHOIS.ERR_NOSUCHNICK[0]
										,data.parameters[param] + " :No such nick/channel"
									);
									param++;
									continue;
								}

								// Check if the user is on the channel
								if ( channel._lcUsers.indexOf( clientSocket.Client.getNickname().toLowerCase() ) === -1 ) {
									// ERR_USERNOTINCHANNEL
									this.emitIRCError(
										socket
										,'ERR_USERNOTINCHANNEL'
										,IRCProtocol.NumericReplyConstants.Client.MODE.ERR_USERNOTINCHANNEL[0]
										,data.parameters[param] + " " + channel.getName() + IRCProtocol.NumericReplyConstants.Client.MODE.ERR_USERNOTINCHANNEL[1]
									);
									param++;
									continue;
								}

								// Add to operator list
								if ( set === true ) {
									channel.addOperator( data.parameters[param] );
								} else {
									channel.removeOperator( data.parameters[param] );
								}

								// Set mode, which is in fact only broadcasted to others
								channel.setMode( socket, data.modes[j], set, clientSocket.Client.getNickname() );

								// Increment parameters
								param++;
								break;
							case "v":
								// Channel voice mode (set/remove)
								if ( typeof data.parameters === "undefined" || data.parameters.length === 0 || typeof data.parameters[param] === "undefined" ) {
									// Silently ignore
									param++;
									continue;
								} else if ( ( set === true && channel.hasVoice( data.parameters[param] ) ) || ( set === false && !channel.hasVoice( data.parameters[param] ) ) ) {
									// Silently ignore, if already 'voiced'
									param++;
									continue;
								}


								// Check if the user exists
								var nicknamePosition = this._lcNicknames.indexOf( data.parameters[param].toLowerCase() )
									,clientSocket;
								if ( nicknamePosition !== -1 ) {
									clientSocket = this._clientSockets[ nicknamePosition ];
								} else {
									// ERR_NOSUCHNICK
									this.emitIRCError(
										socket
										,'ERR_NOSUCHNICK'
										,IRCProtocol.NumericReplyConstants.Client.WHOIS.ERR_NOSUCHNICK[0]
										,data.parameters[param] + " :No such nick/channel"
									);
									param++;
									continue;
								}

								// Check if the user is on the channel
								if ( channel._lcUsers.indexOf( clientSocket.Client.getNickname().toLowerCase() ) === -1 ) {
									// ERR_USERNOTINCHANNEL
									this.emitIRCError(
										socket
										,'ERR_USERNOTINCHANNEL'
										,IRCProtocol.NumericReplyConstants.Client.MODE.ERR_USERNOTINCHANNEL[0]
										,data.parameters[param] + " " + channel.getName() + IRCProtocol.NumericReplyConstants.Client.MODE.ERR_USERNOTINCHANNEL[1]
									);
									param++;
									continue;
								}

								// Add to 'voice' list
								if ( set === true ) {
									channel.addVoice( data.parameters[param] );
								} else {
									channel.removeVoice( data.parameters[param] );
								}

								// Set mode, which is in fact only broadcasted to others
								channel.setMode( socket, data.modes[j], set, clientSocket.Client.getNickname() );
								
								// Increment parameters
								param++;
								break;
							case "b":
								// Add to 'ban' list
								if ( set === true ) {
									channel.addBan( socket, data.parameters[param] );
								} else {
									channel.removeBan( socket, data.parameters[param] );
								}

								param++;
								break;
							case "e":
								// Add to ban 'exception' list
								if ( set === true ) {
									channel.addBanException( socket, data.parameters[param] );
								} else {
									channel.removeBanException( socket, data.parameters[param] );
								}

								param++;
								break;
							default:
								// Set/remove generic modes
								channel.setMode( socket, data.modes[j], set );
								break;
						}
					} else {
						switch ( data.modes[j] ) {
							case "i":
								// RPL_INVITELIST
								this.emitIRCError(
									socket
									,'RPL_INVITELIST'
									,IRCProtocol.NumericReplyConstants.Client.MODE.RPL_INVITELIST[0]
									,data.target + " " + channel.getInvites().join( " " )
								);

								// RPL_ENDOFINVITELIST
								this.emitIRCError(
									socket
									,'RPL_ENDOFINVITELIST'
									,IRCProtocol.NumericReplyConstants.Client.MODE.RPL_ENDOFINVITELIST[0]
									,data.target + " " + IRCProtocol.NumericReplyConstants.Client.MODE.RPL_ENDOFINVITELIST[1]
								);
								break;
							case "b":
								var banList = channel.getBanList();

								// RPL_BANLIST
								for ( var k = 0; k < banList.length; k++ ) {
									this.emitIRCError(
										socket
										,'RPL_BANLIST'
										,IRCProtocol.NumericReplyConstants.Client.MODE.RPL_BANLIST[0]
										,data.target + " " + banList[k]
									);
								}

								// RPL_ENDOFBANLIST
								this.emitIRCError(
									socket
									,'RPL_ENDOFBANLIST'
									,IRCProtocol.NumericReplyConstants.Client.MODE.RPL_ENDOFBANLIST[0]
									,data.target + " :" + IRCProtocol.NumericReplyConstants.Client.MODE.RPL_ENDOFBANLIST[1]
								);
								break;
							case "e":
								var banExceptionList = channel.getBanExceptionList();

								// RPL_EXCEPTLIST
								for ( var k = 0; k < banExceptionList.length; k++ ) {
									this.emitIRCError(
										socket
										,'RPL_EXCEPTLIST'
										,IRCProtocol.NumericReplyConstants.Client.MODE.RPL_EXCEPTLIST[0]
										,data.target + " " + banExceptionList[k]
									);
								}

								// RPL_ENDOFEXCEPTLIST
								this.emitIRCError(
									socket
									,'RPL_ENDOFEXCEPTLIST'
									,IRCProtocol.NumericReplyConstants.Client.MODE.RPL_ENDOFEXCEPTLIST[0]
									,data.target + " :" + IRCProtocol.NumericReplyConstants.Client.MODE.RPL_ENDOFEXCEPTLIST[1]
								);
								break;
							default:
								// Do nothing
								break;
						}
					}
				}
			}
		}
	}
}

/**
 * Client AWAY command.
 * @param {Object} data Data object, with the optional 'text' key.
 * @param {Object} socket Socket object.
 * @function
 */
IRCProtocol.ClientProtocol.prototype.AWAY = function( data, socket ) {
	// Remove away if 'text' key is missing, or empty
	if ( typeof data.text === "undefined" || data.text === "" ) {
		socket.Client.removeAway();

		// RPL_UNAWAY
		this.emitIRCError(
			socket
			,'RPL_UNAWAY'
			,IRCProtocol.NumericReplyConstants.Client.AWAY.RPL_UNAWAY[0]
			,IRCProtocol.NumericReplyConstants.Client.AWAY.RPL_UNAWAY[1]
		);
		return;
	} else {
		// Set as away
		socket.Client.setAway( data.text );

		// RPL_NOWAWAY
		this.emitIRCError(
			socket
			,'RPL_NOWAWAY'
			,IRCProtocol.NumericReplyConstants.Client.AWAY.RPL_NOWAWAY[0]
			,IRCProtocol.NumericReplyConstants.Client.AWAY.RPL_NOWAWAY[1]
		);
		return;
	}
}

/**
 * Client QUIT command.
 * @param {Object} data Data object, with the optional 'reason' key.
 * @param {Object} socket Socket object.
 * @function
 */
IRCProtocol.ClientProtocol.prototype.QUIT = function( data, socket ) {
	// TODO: Remove redundancy
	// Set quit message
	if ( typeof data.reason !== "undefined" ) {
		socket.Client.setQuitMessage( data.reason );
	}

	// Drop connection
	socket.disconnect( {}, socket );
}

/**
 * Client NAMES command.
 * @param {Object} data Data object, with the optional 'channels' and 'target' keys.
 * @param {Object} socket Socket object.
 * @function
 */
IRCProtocol.ClientProtocol.prototype.NAMES = function( data, socket ) {
	// NOTE: This server will only return users belonging to same channels as the requesting user
	// TODO: Add 'target' support
	// Ignore any requests without a 'channels' parameter
	if ( typeof data.channels === "undefined" || data.channels.length === 0 ) {
		return;
	}

	// Get user channels
	var channels = socket.Client.getChannels();
	for ( var i = 0; i < channels.length; i++ ) {
		if ( data.channels.indexOf( channels[i].toLowerCase() ) !== -1 ) {
			// Get channel users
			var channelPosition = this._lcChannelNames.indexOf( channels[i] )
				,channel
				,names = [] // Array of objects, describing names
				,users = []; // Array of users (nicknames that is)

			// Ignore non existing channels
			if ( channelPosition !== -1 ) {
				// Get the channel object, at this position
				channel = this._channels[ channelPosition ];

				// RPL_NAMREPLY
				socket.emit(
					'RPL_NAMREPLY'
					,{
						channel: channel.getName()
						,names: channel.getNames()
					}
				);

                                // RPL_ENDOFNAMES
                                socket.emit(
                                        'RPL_ENDOFNAMES'
                                        ,{
                                                channel: channel.getName()
                                                ,msg: IRCProtocol.NumericReplyConstants.Client.NAMES.RPL_ENDOFNAMES[1]
                                        }
                                );
			}
		}
	}
}

/**
 * Client USERS command.
 * @param {Object} data Data object.
 * @param {Object} socket Socket object.
 * @function
 */
IRCProtocol.ClientProtocol.prototype.USERS = function( data, socket ) {
	// NOTE: This command is not implemented, thus return a ERR_USERSDISABLED event
	this.emitIRCError(
		socket
		,'ERR_USERSDISABLED'
		,IRCProtocol.NumericReplyConstants.Client.USERS.ERR_USERSDISABLED[0]
		,IRCProtocol.NumericReplyConstants.Client.USERS.ERR_USERSDISABLED[1]
	);
}

/**
 * Client WALLOPS command.
 * @param {Object} data Data object, with the required 'text' parameter.
 * @param {Object} socket Socket object.
 * @function
 */
IRCProtocol.ClientProtocol.prototype.WALLOPS = function( data, socket ) {
	// Validate required properties
	if ( typeof data.text === "undefined" || S( data.text ).trim().s === "" ) {
		// Issue an ERR_NEEDMOREPARAMS error.
		this.emitIRCError(
			socket
			,'ERR_NEEDMOREPARAMS'
			,IRCProtocol.NumericReplyConstants.CommonNumericReplies.ERR_NEEDMOREPARAMS[0]
			,IRCProtocol.NumericReplyConstants.CommonNumericReplies.ERR_NEEDMOREPARAMS[1]
		);
		return;
	}

	// Check if the user is an IRC operator
	if ( !socket.Client.getMode( 'o' ) && !socket.Client.getMode( 'O' ) ) {
		// ERR_NOPRIVILEGES
		this.emitIRCError(
			socket
			,'ERR_NOPRIVILEGES'
			,IRCProtocol.NumericReplyConstants.Client.KILL.ERR_NOPRIVILEGES[0]
			,IRCProtocol.NumericReplyConstants.Client.KILL.ERR_NOPRIVILEGES[1]
		);
	} else {
		// Send to all users with the 'w' mode enabled
		for ( var i = 0; i < this._clientSockets.length; i++ ) {
			if ( this._clientSockets[i].Client.welcomeSent() && this._clientSockets[i].Client.getMode( 'w' ) ) {
				this._clientSockets[i].emit(
					'WALLOPS'
					,{
						text: data.text
						,server: IRCProtocol.ServerName
					}
				);
			}
		}
	}
}

/**
 * Client USERHOST command.
 * @param {Object} data Data object, with the required 'nicknames' array key. As per RFC, only first 5 nicknames will be processed.
 * @param {Object} socket Socket object.
 * @function
 */
IRCProtocol.ClientProtocol.prototype.USERHOST = function( data, socket ) {
	// Validate parameters
	if ( typeof data.nicknames === "undefined" || data.nicknames.length === 0 ) {
		this.emitIRCError(
			socket
			,'ERR_NEEDMOREPARAMS'
			,IRCProtocol.NumericReplyConstants.CommonNumericReplies.ERR_NEEDMOREPARAMS[0]
			,IRCProtocol.NumericReplyConstants.CommonNumericReplies.ERR_NEEDMOREPARAMS[1]
		);
		return;
	}

	var nicknames = [];
	for ( var i = 0; i < data.nicknames.length && i < 5; i++ ) {
		// Find client socket
		var nicknamePosition = this._lcNicknames.indexOf( data.nicknames[i].toLowerCase() );
		if ( nicknamePosition !== -1 ) {
			var clientSocket = this._clientSockets[ nicknamePosition ];
			nicknames.push(
				{
					nickname: clientSocket.Client.getNickname()
					,user: clientSocket.Client.getUser()
					,host: clientSocket.Client.getHost()
				}
			);
		}
	}

	// Emit a 'RPL_USERHOST' event
	socket.emit( 'RPL_USERHOST', {
		nicknames: nicknames
		,server: IRCProtocol.ServerName
	} );
}

/**
 * Client ISON command.
 * @param {Object} data Data object, with the required 'nicknames' array key.
 * @param {Object} socket Socket object.
 * @function
 */
IRCProtocol.ClientProtocol.prototype.ISON = function( data, socket ) {
	// Check parameters
	if ( typeof data.nicknames === "undefined" || data.nicknames.length === 0 ) {
		this.emitIRCError(
			socket
			,'ERR_NEEDMOREPARAMS'
			,IRCProtocol.NumericReplyConstants.CommonNumericReplies.ERR_NEEDMOREPARAMS[0]
			,IRCProtocol.NumericReplyConstants.CommonNumericReplies.ERR_NEEDMOREPARAMS[1]
		);
		return;
	}

	// Send a RPL_ISON event
	var nicknames = [];
	for ( var i = 0; i < data.nicknames.length; i++ ) {
		if ( this._lcNicknames.indexOf( data.nicknames[i].toLowerCase() ) !== -1 ) {
			nicknames.push( data.nicknames[i] );
		}
	}

	// Return list of nicknames, even if empty
	socket.emit(
		'RPL_ISON'
		,{
			nicknames: nicknames
			,server: IRCProtocol.ServerName
		}
	);
}

/**
 * Client INVITE command.
 * @param {Object} data Data object, with the required 'nickname' and 'channel' keys.
 * @param {Object} socket Socket object.
 * @function
 */
IRCProtocol.ClientProtocol.prototype.INVITE = function( data, socket ) {
	// Validate parameters
	if ( typeof data.nickname === "undefined" || S( data.nickname ).trim().s === "" || typeof data.channel === "undefined" || S( data.channel ).trim().s === "" ) {
		// Issue an ERR_NEEDMOREPARAMS error.
		this.emitIRCError(
			socket
			,'ERR_NEEDMOREPARAMS'
			,IRCProtocol.NumericReplyConstants.CommonNumericReplies.ERR_NEEDMOREPARAMS[0]
			,IRCProtocol.NumericReplyConstants.CommonNumericReplies.ERR_NEEDMOREPARAMS[1]
		);
		return;
	}

	// Check if nickname exists
	var nicknamePosition = this._lcNicknames.indexOf( data.nickname.toLowerCase() )
		,clientSocket;
	if ( nicknamePosition === -1 ) {
		this.emitIRCError(
			socket
			,'ERR_NOSUCHNICK'
			,IRCProtocol.NumericReplyConstants.Client.WHOIS.ERR_NOSUCHNICK[0]
			,data.nickname + " :No such nick/channel"
		);
		return;
	}
	clientSocket = this._clientSockets[ nicknamePosition ];

	// Check if channel exists
	var channelPosition = this._lcChannelNames.indexOf( data.channel.toLowerCase() )
		,channel;
	if ( channelPosition !== -1 ) {
		channel = this._channels[ channelPosition ];
		// Verify that the inviting user is on that channel
		if ( channel._lcUsers.indexOf( socket.Client.getNickname().toLowerCase() ) === -1 ) {
			// If not, issue an ERR_NOTONCHANNEL
			this.emitIRCError(
				socket
				,'ERR_NOTONCHANNEL'
				,IRCProtocol.NumericReplyConstants.Client.TOPIC.ERR_NOTONCHANNEL[0]
				,socket.Client.getNickname() + " :" + IRCProtocol.NumericReplyConstants.Client.TOPIC.ERR_NOTONCHANNEL[1]
			);
			return;
		}

		// Verify that the target user is not already on that channel
		if ( channel._lcUsers.indexOf( data.nickname.toLowerCase() ) !== -1 ) {
			// If so, issue an ERR_USERONCHANNEL
			this.emitIRCError(
				socket
				,'ERR_USERONCHANNEL'
				,IRCProtocol.NumericReplyConstants.Client.INVITE.ERR_USERONCHANNEL[0]
				,data.nickname + " " + data.channel + " :" + IRCProtocol.NumericReplyConstants.Client.INVITE.ERR_USERONCHANNEL[1]
			);
			return;
		}

		// TODO: Make sure that only channel operators make an invite, if +i
	}

	// RPL_AWAY
	if ( clientSocket.Client.getMode( "a" ) ) {
		socket.emit(
			'RPL_AWAY'
			,{
				nick: data.nickname
				,text: clientSocket.Client.getAway()
			}
		);
	}

	// Notify this user that we are inviting the target user
	this.emitIRCError(
		socket
		,'RPL_INVITING'
		,IRCProtocol.NumericReplyConstants.Client.INVITE.RPL_INVITING[0]
		,data.channel + " " + data.nickname
	);

	// Notify the target user of an invite
	clientSocket.emit(
		'INVITE'
		,{
			channel: data.channel
			,user: socket.Client.getUser()
			,host: socket.Client.getHost()
			,nick: socket.Client.getNickname()
		}
	);

	// Add user to channel invite list
	if ( channelPosition !== -1 ) {
		channel.addInvite( data.nickname );
	}
	// Add invite to user
	clientSocket.Client.addInvite( data.channel );
}

/**
 * Client KICK command.
 * @param {Object} data Data object, with the required array 'channel' and 'user' keys and the optional string 'comment' key.
 * @param {Object} socket Socket object.
 * @function
 */
IRCProtocol.ClientProtocol.prototype.KICK = function( data, socket ) {
	// NOTE: Channel masks not supported!
	// Validate parameters
	if ( typeof data.channel === "undefined" || typeof data.user === "undefined" ) {
		// Issue an ERR_NEEDMOREPARAMS error.
		this.emitIRCError(
			socket
			,'ERR_NEEDMOREPARAMS'
			,IRCProtocol.NumericReplyConstants.CommonNumericReplies.ERR_NEEDMOREPARAMS[0]
			,IRCProtocol.NumericReplyConstants.CommonNumericReplies.ERR_NEEDMOREPARAMS[1]
		);
		return;
	}

	// For each channel
	for ( var i = 0; i < data.channel.length; i++ ) {
		var channelPosition = this._lcChannelNames.indexOf( data.channel[i].toLowerCase() )
			,channel;

		// Check if channel exists
		if ( channelPosition !== -1 ) {
			// Get the channel object, at this position
			channel = this._channels[ channelPosition ];
		} else {
			// Emit an ERR_NOSUCHCHANNEL error
			this.emitIRCError(
				socket
				,'ERR_NOSUCHCHANNEL'
				,IRCProtocol.NumericReplyConstants.Client.JOIN.ERR_NOSUCHCHANNEL[0]
				,data.channel[i] + " :" + IRCProtocol.NumericReplyConstants.Client.JOIN.ERR_NOSUCHCHANNEL[1]
			);

			// Ignore this channel
			continue;
		}

		// Check if user is operator on this channel
		if ( !channel.isOperator( socket.Client.getNickname() ) ) {
			// And if not, emit an ERR_CHANOPRIVSNEEDED error
			this.emitIRCError(
				socket
				,'ERR_CHANOPRIVSNEEDED'
				,IRCProtocol.NumericReplyConstants.Client.MODE.ERR_CHANOPRIVSNEEDED[0]
				,data.channel[i] + " :" + IRCProtocol.NumericReplyConstants.Client.MODE.ERR_CHANOPRIVSNEEDED[1]
			);

			// Ignore channel...
			continue;
		}

		// For each user
		for ( var j = 0; j < data.user.length; j++ ) {
			// Check if user is on channel
			if ( channel._lcUsers.indexOf( data.user[j].toLowerCase() ) === -1 ) {
				// Emit an ERR_USERNOTINCHANNEL error
				this.emitIRCError(
					socket
					,'ERR_USERNOTINCHANNEL'
					,IRCProtocol.NumericReplyConstants.Client.MODE.ERR_USERNOTINCHANNEL[0]
					,data.user[j] + " " + channel.getName() + IRCProtocol.NumericReplyConstants.Client.MODE.ERR_USERNOTINCHANNEL[1]
				);

				// Ignore this user
				continue;
			} else {
				// Find the target user socket
				var nicknamePosition = this._lcNicknames.indexOf( data.user[j].toLowerCase() );

				if ( nicknamePosition !== -1 ) {
					var clientSocket = this._clientSockets[ nicknamePosition ];
					// Kick user
					channel.kickUser(
						socket
						,clientSocket
						// Either the user's comment or the nickname if missing
						,data.comment || clientSocket.Client.getNickname()
					);
				}

				// Remove channel if empty
				// TODO: Remove redundant code
				if ( channel.getUsers().length === 0 ) {
					// Remove channel from lists, if empty
					this._channels.splice( channelPosition, 1 );
					this._lcChannelNames.splice( channelPosition, 1 );

					// Update the number of channels
					this._stats.channels--;
				}
			}
		}
	}
}

/**
 * Client WHO command.
 * @param {Object} data Data object, with the optional 'channels' and 'target' keys.
 * @param {Object} socket Socket object.
 * @function
 */
IRCProtocol.ClientProtocol.prototype.WHO = function( data, socket ) {
	// Check for a mask
	var mask = false;
	if ( typeof data.mask !== "undefined" && data.mask !== "" && ( typeof data.mask === "undefined" || data.mask !== "o" ) ) {
		mask = data.mask;
	}

	// Check for 'o'
	var o = false;
	if ( typeof data.o !== "undefined" && data.o === "o" ) {
		o = true;
	}
	
	// RPL_WHOREPLY
	if ( o === true ) {
		// TODO: Add mask functionality!
		// TODO: Move to separate function
		for ( var i = 0; i < this._clientSockets.length; i++ ) {
			var clientSocket = this._clientSockets[i];
			if ( this._clientSockets[i].Client.welcomeSent() && ( this._clientSockets[i].Client.getMode( "o" ) || this._clientSockets[i].Client.getMode( "O" ) ) && !this._clientSockets[i].Client.getMode( "i" ) ) {
				socket.emit(
					'RPL_WHOREPLY'
					,{
						// TODO: Display last active channel
						// TODO: Add hopcount
						channel: clientSocket.Client.getChannels()[0] || ""
						,user: clientSocket.Client.getUser()
						,host: clientSocket.Client.getHost()
						,server: IRCProtocol.ServerName
						,nick: clientSocket.Client.getNickname()
						,realname: clientSocket.Client.getRealname()
					}
				);
			}
		}
	} else {
		// TODO: Add mask functionality!
		// TODO: Move to separate function
		for ( var i = 0; i < this._clientSockets.length; i++ ) {
			var clientSocket = this._clientSockets[i];
			if ( this._clientSockets[i].Client.welcomeSent() && !this._clientSockets[i].Client.getMode( "i" ) ) {
				socket.emit(
					'RPL_WHOREPLY'
					,{
						// TODO: Display last active channel
						// TODO: Add hopcount
						channel: clientSocket.Client.getChannels()[0] || ""
						,user: clientSocket.Client.getUser()
						,host: clientSocket.Client.getHost()
						,server: IRCProtocol.ServerName
						,nick: clientSocket.Client.getNickname()
						,realname: clientSocket.Client.getRealname()
					}
				);
			}
		}
	}

	// RPL_ENDOFWHO
	this.emitIRCError(
		socket
		,'RPL_ENDOFWHO'
		,IRCProtocol.NumericReplyConstants.Client.WHO.RPL_ENDOFWHO[0]
		,IRCProtocol.NumericReplyConstants.Client.WHO.RPL_ENDOFWHO[1]
	);
}

// Create a new instance of the IRC Protocol implementation.
var IRCClient = IRCProtocol.init( 'client' );

// Create Web Socket server
WEBChatServer = new WEBServer( {
	port: Config.Server.WEB.Port // Listening port
	,host: Config.Server.WEB.Host
	,socket: { // WEB Socket configuration
		log: false // Disable loggings
	}
	// Set the scope to the instance of 'irc'
	,scope: IRCClient
	// Add event handlers
	,events: {
		// Disconnecting client
		disconnect: IRCClient.disconnect
		// IRC Client Connection Registration Commands (Events)
		,NICK: IRCClient.NICK
		,USER: IRCClient.USER
		// User based queries
		,WHOIS: IRCClient.WHOIS
		// Channel join/part commands
		,JOIN: IRCClient.JOIN
		,PART: IRCClient.PART
		// Private message
		,PRIVMSG: IRCClient.PRIVMSG
		// MOTD
		,MOTD: IRCClient.MOTD
		// LUSERS
		,LUSERS: IRCClient.LUSERS
		// PING? PONG!
		,PONG: IRCClient.PONG
		,TOPIC: IRCClient.TOPIC
		,LIST: IRCClient.LIST
		,OPER: IRCClient.OPER
		,VERSION: IRCClient.VERSION
		,TIME: IRCClient.TIME
		,ADMIN: IRCClient.ADMIN
		,INFO: IRCClient.INFO
		,KILL: IRCClient.KILL
		,MODE: IRCClient.MODE
		,AWAY: IRCClient.AWAY
		,QUIT: IRCClient.QUIT
		,NAMES: IRCClient.NAMES
		,WHO: IRCClient.WHO
		,USERS: IRCClient.USERS
		,WALLOPS: IRCClient.WALLOPS
		,ISON: IRCClient.ISON
		,USERHOST: IRCClient.USERHOST
		,INVITE: IRCClient.INVITE
		,KICK: IRCClient.KICK
	}
	// New connection handler
	,connection: IRCClient.connection
} ).init();

// Create TCP Socket server
TCPChatServer = new TCPServer( {
        port: Config.Server.TCP.Port // Listening port
        ,host: Config.Server.TCP.Host
        ,socket: { // TCP Socket configuration
                log: false // Disable loggings
        }
        // Set the scope to the instance of 'irc'
        ,scope: IRCClient
        // Add event handlers
        ,events: {
                // Disconnecting client
                disconnect: IRCClient.disconnect
                // IRC Client Connection Registration Commands (Events)
                ,NICK: IRCClient.NICK
                ,USER: IRCClient.USER
                // User based queries
                ,WHOIS: IRCClient.WHOIS
                // Channel join/part commands
                ,JOIN: IRCClient.JOIN
                ,PART: IRCClient.PART
                // Private message
                ,PRIVMSG: IRCClient.PRIVMSG
                // MOTD
                ,MOTD: IRCClient.MOTD
                // LUSERS
                ,LUSERS: IRCClient.LUSERS
                // PING? PONG!
                ,PONG: IRCClient.PONG
                ,TOPIC: IRCClient.TOPIC
                ,LIST: IRCClient.LIST
                ,OPER: IRCClient.OPER
                ,VERSION: IRCClient.VERSION
                ,TIME: IRCClient.TIME
                ,ADMIN: IRCClient.ADMIN
                ,INFO: IRCClient.INFO
                ,KILL: IRCClient.KILL
                ,MODE: IRCClient.MODE
                ,AWAY: IRCClient.AWAY
                ,QUIT: IRCClient.QUIT
                ,NAMES: IRCClient.NAMES
                ,WHO: IRCClient.WHO
                ,USERS: IRCClient.USERS
                ,WALLOPS: IRCClient.WALLOPS
                ,ISON: IRCClient.ISON
                ,USERHOST: IRCClient.USERHOST
                ,INVITE: IRCClient.INVITE
                ,KICK: IRCClient.KICK
        }
        // New connection handler
        ,connection: IRCClient.connection
} ).init();

