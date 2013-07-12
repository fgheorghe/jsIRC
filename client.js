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
 * Method used for opening a new connection.
 * @function
 */
Client.prototype.connect = function() {
	// Create connection
	this._socket = io.connect( this._config.host + ':' + this._config.port );
}

/**
 * Method used for initiating a connection, and attaching event listeners.
 * @function
 */
Client.prototype.init = function() {
	// Open connection
	this.connect();

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
// ...soon as ExtJS is ready
Ext.onReady( function() {
	// Create 'taskbar'
	this.taskbar = new Taskbar();

	// Create window container
	this.windowContainer = Ext.create( 'Ext.panel.Panel', {
		// Nothing
	} );

	// Create center region, to contain the window container...
	this.centerRegion = Ext.create( 'Ext.panel.Panel', {
		region: 'center'
		,layout: 'fit'
		,items: [ this.windowContainer ]
		,dockedItems: [ this.taskbar.toolbar ]
	} );

	// Create main viewport...
	this.viewPort = Ext.create( 'Ext.container.Viewport', {
		layout: 'border'
		,items: [ this.centerRegion ]
	} );

	var ChatApplication = new ChatJs( {
		renderTo: this.windowContainer
		,taskbar: this.taskbar
	} );

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
			,ERR_NOSUCHNICK: ChatApplication.ERR_NOSUCHNICK
			,ERR_NONICKNAMEGIVEN: ChatApplication.ERR_NONICKNAMEGIVEN
			,RPL_WHOISUSER: ChatApplication.RPL_WHOISUSER
			,RPL_WHOISSERVER: ChatApplication.RPL_WHOISSERVER
			,RPL_ENDOFWHOIS: ChatApplication.RPL_ENDOFWHOIS
			,ERR_NICKNAMEINUSE: ChatApplication.ERR_NICKNAMEINUSE
			,ERR_NEEDMOREPARAMS: ChatApplication.ERR_NEEDMOREPARAMS
			,ERR_NOSUCHCHANNEL: ChatApplication.ERR_NOSUCHCHANNEL
			,RPL_TOPIC: ChatApplication.RPL_TOPIC
			,RPL_NOTOPIC: ChatApplication.RPL_NOTOPIC
			,RPL_NAMREPLY: ChatApplication.RPL_NAMREPLY
			,JOIN: ChatApplication.JOIN
			,PART: ChatApplication.PART
			,ERR_NOTEXTTOSEND: ChatApplication.ERR_NOTEXTTOSEND
			,ERR_NORECIPIENT: ChatApplication.ERR_NORECIPIENT
			,PRIVMSG: ChatApplication.PRIVMSG
			,RPL_WHOISCHANNELS: ChatApplication.RPL_WHOISCHANNELS
			,QUIT: ChatApplication.QUIT
			,RPL_MOTDSTART: ChatApplication.RPL_MOTDSTART
			,RPL_MOTD: ChatApplication.RPL_MOTD
			,RPL_ENDOFMOTD: ChatApplication.RPL_ENDOFMOTD
			,ERR_NOMOTD: ChatApplication.ERR_NOMOTD
			,RPL_LUSERCLIENT: ChatApplication.RPL_LUSERCLIENT
			,RPL_LUSEROP: ChatApplication.RPL_LUSEROP
			,RPL_LUSERUNKOWN: ChatApplication.RPL_LUSERUNKOWN
			,RPL_LUSERCHANNELS: ChatApplication.RPL_LUSERCHANNELS
			,RPL_LUSERME: ChatApplication.RPL_LUSERME
			,RPL_WHOISIDLE: ChatApplication.RPL_WHOISIDLE
			,RPL_WHOISOPERATOR: ChatApplication.RPL_WHOISOPERATOR
			,PING: ChatApplication.PING
			,RPL_LISTEND: ChatApplication.RPL_LISTEND
			,RPL_LIST: ChatApplication.RPL_LIST
			,RPL_YOUREOPER: ChatApplication.RPL_YOUREOPER
			,ERR_PASSWDMISMATCH: ChatApplication.ERR_PASSWDMISMATCH
			,NICK: ChatApplication.NICK
			,ERR_ERRONEUSNICKNAME: ChatApplication.ERR_ERRONEUSNICKNAME
			,ERR_ALREADYREGISTRED: ChatApplication.ERR_ALREADYREGISTRED
			,RPL_VERSION: ChatApplication.RPL_VERSION
			,RPL_TIME: ChatApplication.RPL_TIME
			,RPL_ADMINME: ChatApplication.RPL_ADMINME
			,RPL_ADMINLOC1: ChatApplication.RPL_ADMINLOC1
			,RPL_ADMINLOC2: ChatApplication.RPL_ADMINLOC2
			,RPL_ADMINEMAIL: ChatApplication.RPL_ADMINEMAIL
			,RPL_INFO: ChatApplication.RPL_INFO
			,RPL_ENDOFINFO: ChatApplication.RPL_ENDOFINFO
			,ERR_NOPRIVILEGES: ChatApplication.ERR_NOPRIVILEGES
			,RPL_UMODEIS: ChatApplication.RPL_UMODEIS
			,ERR_USERSDONTMATCH: ChatApplication.ERR_USERSDONTMATCH
			,ERR_UMODEUNKNOWNFLAG: ChatApplication.ERR_UMODEUNKNOWNFLAG
			,RPL_NOWAWAY: ChatApplication.RPL_NOWAWAY
			,RPL_UNAWAY: ChatApplication.RPL_UNAWAY
			,RPL_AWAY: ChatApplication.RPL_AWAY
			,RPL_ENDOFNAMES: ChatApplication.RPL_ENDOFNAMES
			,RPL_ENDOFWHO: ChatApplication.RPL_ENDOFWHO
			,RPL_WHOREPLY: ChatApplication.RPL_WHOREPLY
			,ERR_USERSDISABLED: ChatApplication.ERR_USERSDISABLED
			,WALLOPS: ChatApplication.WALLOPS
			,RPL_ISON: ChatApplication.RPL_ISON
			,RPL_USERHOST: ChatApplication.RPL_USERHOST
			,RPL_CHANNELMODEIS: ChatApplication.RPL_CHANNELMODEIS
			,ERR_UNKNOWNMODE: ChatApplication.ERR_UNKNOWNMODE
			,MODE: ChatApplication.MODE
			,ERR_INVITEONLYCHAN: ChatApplication.ERR_INVITEONLYCHAN
			,ERR_USERONCHANNEL: ChatApplication.ERR_USERONCHANNEL
			,ERR_NOTONCHANNEL: ChatApplication.ERR_NOTONCHANNEL
			,INVITE: ChatApplication.INVITE
			,RPL_INVITING: ChatApplication.RPL_INVITING
			,RPL_INVITELIST: ChatApplication.RPL_INVITELIST
			,RPL_ENDOFINVITELIST: ChatApplication.RPL_ENDOFINVITELIST
			,ERR_CHANNELISFULL: ChatApplication.ERR_CHANNELISFULL
			,ERR_BADCHANNELKEY: ChatApplication.ERR_BADCHANNELKEY
			,ERR_USERNOTINCHANNEL: ChatApplication.ERR_USERNOTINCHANNEL
			,ERR_CHANOPRIVSNEEDED: ChatApplication.ERR_CHANOPRIVSNEEDED
			,ERR_CANNOTSENDTOCHAN: ChatApplication.ERR_CANNOTSENDTOCHAN
		}
	} );

	// Initialise the server
	Example.init();

	// Add the chat server to the chat application
	ChatApplication.client = Example;
} );