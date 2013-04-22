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

/** IRC Protocol */
var IRCProtocol = {
	// Daemon version
	VERSION: "0.1"
	// Server info
	,ServerInfo: {
		SERVER_NAME: "grosan.co.uk"
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
		}
		,CommonNumericReplies: {
			ERR_UNAVAILRESOURCE: [ 437, "Nick/channel is temporarily unavailable" ] // <nick/channel>
			,ERR_NEEDMOREPARAMS: [ 461, "Not enough parameters" ] // <command>
			,ERR_RESTRICTED: [ 484, "Your connection is restricted!" ]
			,RPL_WELCOME: [ 001, "Welcome to the Internet Relay Network" ] // <nick>!<user>@<host>
			// Exceptions:
			,RPL_YOURHOST: [ 002, "" ] // Built by emitIRCWelcome() function.
			,RPL_CREATED: [ 003, "" ] // Built by emitIRCWelcome() function.
			,RPL_MYINFO: [ 004, "" ] // Built by emitIRCWelcome() function.
		}
	}
	// Keeps track of the user's IRC state (e.g. nickname, channels, etc).
	,IrcState: {
		Client: function() {
			this._nickname = false; // Stores nickname, string
			this._user = false; // Stores 'user' command data, object as per command parameters

			this._welcome_reply = false; // Did we send the 'RPL_WELCOME' reply?

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
				}
			}

			return this;
		}
	}
	// Other constants
	,OtherConstants: {
		NICK_LENGTH: 8 // Max nickname characters (9, since the count starts from 0)
		// TODO: Implement proper patterns.
		,NICK_PATTERN: /^[a-zA-Z0-9]+$/ // Nickname pattern, as per RFC
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

	// Store create date
	this._created = new Date();
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
	socket.Client = new IRCProtocol.IrcState.Client();
}

/**
 * Client disconnect handler. Removes the socket from the socket list, and notifies users if this client has been authenticated.
 * @param {Object} data Data object. Undefined for a disconnecting client.
 * @param {Object} socket Socket object.
 * @function
 */
IRCProtocol.ClientProtocol.prototype.disconnect = function( data, socket ) {
	// Find socket position, by id
	var position = this._clientSocketIds.indexOf( socket.id );

	// Remove from socket array
	this._clientSockets.splice( position, 1 );
	// Remove id from socket id array
	this._clientSocketIds.splice( position, 1 );
}

/**
 * Client NICK command.
 * @param {Object} data Data object, with the required 'nickname' property.
 * @param {Object} socket Socket object.
 * @function
 */
IRCProtocol.ClientProtocol.prototype.NICK = function( data, socket ) {
	// Verify the nick data is present:
	if ( typeof data.nickname === "undefined" || S( data.nickname ).trim().s == "" ) {
		// Issue an ERR_NONICKNAMEGIVEN error.
		this.emitIRCError(
			socket
			,'NICK'
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
			,'NICK'
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
			,'NICK'
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
		this.emitError(
			socket
			,'USER'
			,IRCProtocol.NumericReplyConstants.CommonNumericReplies.ERR_NEEDMOREPARAMS[0]
			,IRCProtocol.NumericReplyConstants.CommonNumericReplies.ERR_NEEDMOREPARAMS[1]
			// Include the faulty nickname
			,'USER'
		);
		return;
	}

	// TODO: Add proper user and realname validation.
	// TODO: Add proper mode validation (and functionality).

	// Set the user values
	socket.Client.setUser( data );

	// TODO: Optimise this check (redundant)...
	// If the user has just finished sending the USER and NICK commands, but the RPL_WELCOME has not been sent, do it now...

	if ( socket.Client.isRegistered() && !socket.Client.welcomeSent() ) {
		// Set to true, and issue the welcome stream of messages
		socket.Client.welcomeSent( true );

		// Notify the user
		this.emitIRCWelcome( socket );
	}
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
	}
	// New connection handler
	,connection: IRCClient.connection
 } ).init();