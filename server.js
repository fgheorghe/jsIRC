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
		if ( typeof this._config.connectionHandler !== "undefined" ) {
			// Determine which scope to bind the event handler to
			var scope = typeof this._config.scope !== "undefined" ? this._config.scope : this;

			this._config.connectionHandler.bind( scope )( socket );
		}

		// Attach the Application Specific Event handlers
		this.attachSocketEvents( socket );
	}.bind( this ) );
}

/**
 * Chat application.
 * @class Provides message routing, along with other chat functionality.
 * @constructor
 */
var ChatApplication = function() {
	// Prepare the client object (storing socket objects, by id)
	this._clientSockets = {};
};

/**
 * Method used for keeping track of client connections.
 * @param {Object} socket Socket object, storing the client data.
 * @function
 */
ChatApplication.prototype.clientConnectionHandler = function( socket ) {
	// Push data to the client
	this._clientSockets[socket.id] = socket;

	// Notify others, by routing the 'newClient' event, along with a socket id
	this.emitEvent( 'newClient', { id: socket.id }, socket );

	// Send a list of client ids to the new client
	this.clientListHandler( {}, socket );
}

/**
 * Method used for handling a client list request.
 * @param {Object} data Data object.
 * @param {Object} socket Socket object, storing the client data.
 * @function
 */
ChatApplication.prototype.clientListHandler = function( data, socket ) {
	var clientIds = [];
	for ( var socketId in this._clientSockets ) {
		if ( this._clientSockets[socketId] ) {
			clientIds.push( { text: socketId, leaf: true } );
		}
	}
	socket.emit( 'clientList', { ids: clientIds } );
}

/**
 * Method used for handling a client text message event.
 * @param {Object} data Data object. Always null for a disconnecting client.
 * @param {Object} socket Socket object, storing the client data.
 * @function
 */
ChatApplication.prototype.clientMessageHandler = function( data, socket ) {
	// Notify others, by routing the 'clientMessage' event, along with a socket id and text value
	this.emitEvent( 'clientMessage', { id: socket.id, text: data.text }, socket );
}

/**
 * Method used for keeping track of disconnecting clients.
 * @param {Object} data Data object. Always null for a disconnecting client.
 * @param {Object} socket Socket object, storing the client data.
 * @function
 */
ChatApplication.prototype.clientDisconnectHandler = function( data, socket ) {
	// Remove from sockets objects, to ignore it upon next notification
	this._clientSockets[socket.id] = false;

	// Notify existing clients, by routing the 'disconnectingClient' event, along with a socket id
	this.emitEvent( 'disconnectingClient', { id: socket.id }, socket );
}

/**
 * Method used for emitting events, to all clients.
 * @param {String} eventName Event name.
 * @param {Object} data Data object to push to clients.
 * @param {Object} ignoreSocket Optional socket object to ignore. Used when sending messages to all users, except the specified socket user.
 */
ChatApplication.prototype.emitEvent = function( eventName, data, ignoreSocket ) {
	// Loop all existing connections
	var me = this;
	Object.keys( this._clientSockets ).forEach( function( socketId ) {
		// Verify if we must ignore a socket
		if ( typeof ignoreSocket !== "undefined" ) {
			// Verify if that socket is the current one
			if ( me._clientSockets[socketId] && me._clientSockets[socketId].id == ignoreSocket.id ) {
				return; // Ignore
			}
		}

		// Emit event
		if ( me._clientSockets[socketId] ) {
			me._clientSockets[socketId].emit( eventName, data );
		}
	} );
}

var ChatApp = new ChatApplication();

// Create server
ChatServer = new Server( {
	port: 10000 // Listening port
	,socket: { // Socket configuration
		log: false // Disable loggings
	}
	// Set the scope to the instance of ChatApp
	,scope: ChatApp
	// Add event handlers
	,events: {
		// Disconnecting client event
		disconnect: ChatApp.clientDisconnectHandler
		// Message event handler
		,clientMessage: ChatApp.clientMessageHandler
		// Client list handler
		,clientList: ChatApp.clientListHandler
	}
	// Connection handler
	,connectionHandler: ChatApp.clientConnectionHandler
 } ).init();