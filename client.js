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
 * Messaging client.
 * @class Provides client functionality.
 * @constructor
 * @param {Object} config Client configuration object. Supported keys are: port (listening port number), host (URL), optional scope object and an events object, defining application specific events.
 */
var Client = function( config ) {
	// Store configuation, in a 'private' property
	this._config = config;
}

/**
 * Method used for initiating a connection, and attaching event listeners.
 * @function
 */
Client.prototype.init = function() {
	// Create connection
	this._socket = io.connect( this._config.host + ':' + this._config.port );

	// Attach the Application Specific Event handlers
	this.attachSocketEvents();
}

/**
 * Method used for emitting an event. Wrapper for the socket's 'emit' function.
 * @function
 * @param {String} eventName Event name.
 * @param {Object} data Event data object.
 */
Client.prototype.emit = function( eventName, data ) {
	this._socket.emit( eventName, data );
}

/**
 * Method used for attaching socket events and their handlers.
 * NOTE: Event names and functions are stored in the config.events object.
 * NOTE: The scope of each event handler is bound to the configured 'scope' object.
 * @function
 */
Client.prototype.attachSocketEvents = function() {
	for ( var eventName in this._config.events ) {
		// Determine which scope to bind the event handler to
		var scope = typeof this._config.scope !== "undefined" ? this._config.scope : this;

		// Bind the event handler
		// NOTE: Unlike the Server attachSocketEvents function, this function binds the event handler, without passing the extra socket data.
		this._socket.on( eventName, this._config.events[eventName].bind( scope ) );
	}
}

// Create a new instance of the chat application
var ChatApplication = new ChatJs();

var Example = new Client( {
	port: 10000
	,host: 'http://localhost'
	,scope: ChatApplication
	// Example event handlers, not bound to any scope
	,events: {
		// Connection handler
		connect: ChatApplication.connectHandler
		// Disconnect handler
		,disconnect: ChatApplication.disconnectHandler
		// Welcome message. This marks the user is now registered with the server
		,RPL_WELCOME: ChatApplication.RPL_WELCOME
		// Server info events, usually received upon successul registration
		,RPL_YOURHOST: ChatApplication.RPL_YOURHOST
		,RPL_CREATED: ChatApplication.RPL_CREATED
		,RPL_MYINFO: ChatApplication.RPL_MYINFO
		// TODO: Implement
		,ERR_NONICKNAMEGIVEN: ChatApplication.ERR_NONICKNAMEGIVEN
// 		,ERR_ERRONEUSNICKNAME: ChatApplication.ERR_ERRONEUSNICKNAME
		,ERR_NICKNAMEINUSE: ChatApplication.ERR_NICKNAMEINUSE
// 		,ERR_NEEDMOREPARAMS: ChatApplication.ERR_NEEDMOREPARAMS
	}
} );

// Initialise the server
Example.init();

// Add the chat server to the chat application
ChatApplication.client = Example;