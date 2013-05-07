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

/**
 * Messaging server.
 * @class Provides server functionality.
 * @constructor
 * @param {Object} config Server configuration object. Supported keys are: port (listening port number), socket (socket listener configuration object),
 * optional 'scope' object used for maintaining a custom scope reference,
 * optional 'connectionHandler' connection handler,
 * and an events object providing event handler functionality.
 */
var Server = function( config ) {
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
Server.prototype.attachSocketEvents = function( socket ) {
	var me = this;
	Object.keys( this._config.events ).forEach( function( eventName ) {
		socket.on( eventName, function( data ) {
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
Server.prototype.loadLibraries = function() {
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
Server.prototype.init = function() {
	// Load required libraries.
	this.loadLibraries();

	// Open port for incoming connections
	this._httpServer.listen( this._config.port );

	// Attach a Socket.Io connection handler
	// This handler in turn will attach application specific event handlers.
	this._socketIo.sockets.on( 'connection', function ( socket ) {
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

// Load various required libraries:
var S = require( 'string' ); // http://stringjs.com/
var _ = require('lodash'); // http://lodash.com/
var fs = require('fs'); // Standard file system

/** IRC Protocol */
var IRCProtocol = {
	// Daemon version
	VERSION: "0.1"
	// Server info
	,ServerInfo: {
		SERVER_NAME: "grosan.co.uk"
		,SERVER_INFO: "Oxford, Oxfordshire, UK, EU"
	}
	,MotdFile: 'motd.txt'
	,PingFrequency: 10 // In seconds
	,MaxChannelList: 10 // Maximum number of channels returned in a RPL_LIST event
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
				,RPL_WHOISUSER: [ 403, "<nick> <user> <host> * :<real name>" ]
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
			}
			,PRIVMSG: {
				ERR_NORECIPIENT: [ 411, "No recipient given (<command>)" ]
				,ERR_CANNOTSENDTOCHAN: [ 412, "No text to send" ]
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
		}
	}
	// Keeps track of the user's/client's IRC state (e.g. nickname, channels, etc).
	,IrcState: {
		Client: function( socket ) {
			// Store the client's socket
			this._socket = socket;

			this._nickname = false; // Stores nickname, string
			this._user = false; // Stores 'user' command data, object as per command parameters
			this._host = ""; // Stores the user's host
			this._realname = ""; // Stores the user's real name
			this._channels = []; // Stores channels this user has joined

			this._idle = 0; // Idle time, in seconds
			this._pingIdle = 0; // Ping/Pong timer
			this._idleTimer = null;
			this._pingTimer = null;

			this._welcome_reply = false; // Did we send the 'RPL_WELCOME' reply?

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
				return this.getUser() !== false && this.getNickname() !== false;
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
									source: IRCProtocol.ServerInfo.SERVER_NAME
								}
							);
						}
					}.bind( this ), 1000 );
				}
			}

			return this;
		}
		,Channel: function( name ) {
			// Channel name
			this._name = name;

			// List of users
			this._users = [];
			this._lcUsers = [];

			// List of sockets
			this._sockets = [];

			// Topic
			this._topic = "";

			// Method used for getting the channel name
			this.getName = function() {
				return this._name;
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
					this._lcUsers.push( socket.Client.getNickname() );

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

					console.log( this._users );
					return true;
				} else {
					return false;
				}
			}

			// Method used for broadcasting an event to all channel clients
			this._broadcastEvent = function( eventName, data ) {
				// Notify _ALL_ clients
				for ( var i = 0; i < this._sockets.length; i++ ) {
					this._sockets[i].emit(
						eventName
						,data
					);
				}
			}

			// Method used for removing a user
			this.removeUser = function( socket, silent ) {
				// Remove from lists, and notify users
				var nicknamePosition = this._lcUsers.indexOf( socket.Client.getNickname().toLowerCase() );

				// Remove nickname from lists
				this._users.splice( nicknamePosition, 1 );
				this._lcUsers.splice( nicknamePosition, 1 );

				// Remove socket, from this channel's list
				this._sockets.splice( nicknamePosition, 1 );

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
				// Notify clients of a message
				this._broadcastEvent( 'PRIVMSG'
					,{
						target: this.getName()
						,message: message
						,nickname: socket.Client.getNickname()
						,user: socket.Client.getUser()
						,host: socket.Client.getHost()
						,servername: IRCProtocol.ServerInfo.SERVER_NAME
					}
				);

				// Reset idle counter for this client
				socket.Client.setIdle( 0 );
			}

			// Method used for getting users
			this.getUsers = function() {
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

/** IRC Client Protocol Implementation, based RFC2812: http://tools.ietf.org/html/rfc2812 */
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
		,IRCProtocol.NumericReplyConstants.CommonNumericReplies.RPL_WELCOME[1]
	);

	// Send RPL_YOURHOST, with version details
	this.emitIRCError(
		socket
		,'RPL_YOURHOST'
		,IRCProtocol.NumericReplyConstants.CommonNumericReplies.RPL_YOURHOST[0]
		,"Your host is chatjs, running version " + IRCProtocol.VERSION
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
	// TODO: Add modes (user/channel)
	this.emitIRCError(
		socket
		,'RPL_MYINFO'
		,IRCProtocol.NumericReplyConstants.CommonNumericReplies.RPL_MYINFO[0]
		,IRCProtocol.ServerInfo.SERVER_NAME + " " + IRCProtocol.VERSION
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
	this._clientSocketIds.push( socket.id );

	// Attach IRC state object, used for performing various checks
	socket.Client = new IRCProtocol.IrcState.Client( socket );

	// Set host
	socket.Client.setHost( socket.handshake.address.address );

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
		}

		// Construct list of channel users
		users = users.concat( users, channel.getUsers() );
	}

	// Notify users on all channels that the user has quit
	// TODO: Optimise
	var _notified = []; // Lower case array of notofied users, to avoid duplicates
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
						,reason: 'Connection closed'
					}
				);
			}
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
	var socketPosition = this._clientSocketIds.indexOf( socket.id );
	// Find nickname position, if the user registered
	if ( socket.Client.getNickname() ) {
		var nicknamePosition = this._lcNicknames.indexOf( socket.Client.getNickname().toLowerCase() );

		// Remove nickname from list
		this._lcNicknames.splice( nicknamePosition, 1 );
	}

	// Remove from socket array
	this._clientSockets.splice( socketPosition, 1 );
	// Remove id from socket id array
	this._clientSocketIds.splice( socketPosition, 1 );
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
	if ( nickname.length > IRCProtocol.OtherConstants.NICK_LENGTH || !IRCProtocol.OtherConstants.NICK_PATTERN.test( nickname ) ) {
		// Issue an ERR_ERRONEUSNICKNAME error.
		this.emitIRCError(
			socket
			,'ERR_ERRONEUSNICKNAME'
			,IRCProtocol.NumericReplyConstants.Client.NICK.ERR_ERRONEUSNICKNAME[0]
			,IRCProtocol.NumericReplyConstants.Client.NICK.ERR_ERRONEUSNICKNAME[1]
			// Include the faulty nickname
			,nickname
		);
		return;
	}

	// Verify if already in use
	if ( this._lcNicknames.indexOf( nickname.toLowerCase() ) !== -1 ) {
		// Issue an ERR_NICKNAMEINUSE error.
		this.emitIRCError(
			socket
			,'ERR_NICKNAMEINUSE'
			,IRCProtocol.NumericReplyConstants.Client.NICK.ERR_NICKNAMEINUSE[0]
			,IRCProtocol.NumericReplyConstants.Client.NICK.ERR_NICKNAMEINUSE[1]
			// Include the faulty nickname
			,nickname
		);
		return;
	}

	// TODO: Service unavailable...

	// Nickname appears to be ok...
	// Store in the list of nicknames
	this._lcNicknames.push( nickname.toLowerCase() );

	// Set the client's nickname
	socket.Client.setNickname( nickname );

	// TODO: Optimise this check (redundant)...
	// If the user has just finished sending the USER and NICK commands, but the RPL_WELCOME has not been sent, do it now...

	if ( socket.Client.isRegistered() && !socket.Client.welcomeSent() ) {
		// Set to true, and issue the welcome stream of messages
		socket.Client.welcomeSent( true );

		// Notify the user
		this.emitIRCWelcome( socket );
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
				,server: IRCProtocol.ServerInfo.SERVER_NAME
				,serverinfo: IRCProtocol.ServerInfo.SERVER_INFO
			}
		);

		// TODO: RPL_AWAY

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
	console.log( data );
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
	if ( typeof data.channels === "undefined" || data.length === 0 ) {
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
	// TODO: Include key data
	var channelName = "";
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

			// Update the number of channels
			this._stats.channels++;
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
					,servername: IRCProtocol.ServerInfo.SERVER_NAME
				}
			);

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

			// RPL_NAMREPLY
			socket.emit(
				'RPL_NAMREPLY'
				,{
					channel: channel.getName()
					,names: channel.getUsers()
				}
			);

			// Update the user's channel list
			socket.Client.addChannel( channel.getName() );
		}
	}

	console.log( data );
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
			// Send to target
			this._clientSockets[nicknamePosition].emit(
				'PRIVMSG'
				,{
					target: data.target
					,message: data.message
					,nickname: socket.Client.getNickname()
					,user: socket.Client.getUser()
					,host: socket.Client.getHost()
					,servername: IRCProtocol.ServerInfo.SERVER_NAME
				}
			);
		}
	}

	// TODO: Handle user to user messages
	console.log( data );
}

/**
 * Client MOTD command.
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
				,"- " + IRCProtocol.ServerInfo.SERVER_NAME + " " + IRCProtocol.NumericReplyConstants.Client.MOTD.RPL_MOTDSTART[1]
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

// Create a new instance of the IRC Protocol implementation.
var IRCClient = IRCProtocol.init( 'client' );

// Create server
ChatServer = new Server( {
	port: 10000 // Listening port
	,socket: { // Socket configuration
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
	}
	// New connection handler
	,connection: IRCClient.connection
 } ).init();