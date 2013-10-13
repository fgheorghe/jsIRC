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
 * @param {Object} config Client configuration object. Supported keys are: url (URL), optional scope object and an events object, defining application specific events.
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
	this._socket = io.connect( this._config.url );
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
// ...as soon as ExtJS is ready, and right after SocketIO has been loaded
function init() {
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

		this.ChatApplication = new jsIRC( {
			renderTo: this.windowContainer
			,taskbar: this.taskbar
		} );

		var jsIRCClient = new Client( {
			url: Config.Client.ServerUrl
			,scope: this.ChatApplication
			// Example event handlers, not bound to any scope
			,events: {
				// Connection handler
				connect: this.ChatApplication.connectHandler
				// Disconnect handler
				,disconnect: this.ChatApplication.disconnectHandler
				// Welcome message. This marks the user is now registered with the server
				,RPL_WELCOME: this.ChatApplication.RPL_WELCOME
				// Server info events, usually received upon successul registration
				,RPL_YOURHOST: this.ChatApplication.RPL_YOURHOST
				,RPL_CREATED: this.ChatApplication.RPL_CREATED
				,RPL_MYINFO: this.ChatApplication.RPL_MYINFO
				,ERR_NOSUCHNICK: this.ChatApplication.ERR_NOSUCHNICK
				,ERR_NONICKNAMEGIVEN: this.ChatApplication.ERR_NONICKNAMEGIVEN
				,RPL_WHOISUSER: this.ChatApplication.RPL_WHOISUSER
				,RPL_WHOISSERVER: this.ChatApplication.RPL_WHOISSERVER
				,RPL_ENDOFWHOIS: this.ChatApplication.RPL_ENDOFWHOIS
				,ERR_NICKNAMEINUSE: this.ChatApplication.ERR_NICKNAMEINUSE
				,ERR_NEEDMOREPARAMS: this.ChatApplication.ERR_NEEDMOREPARAMS
				,ERR_NOSUCHCHANNEL: this.ChatApplication.ERR_NOSUCHCHANNEL
				,RPL_TOPIC: this.ChatApplication.RPL_TOPIC
				,RPL_NOTOPIC: this.ChatApplication.RPL_NOTOPIC
				,RPL_NAMREPLY: this.ChatApplication.RPL_NAMREPLY
				,JOIN: this.ChatApplication.JOIN
				,PART: this.ChatApplication.PART
				,ERR_NOTEXTTOSEND: this.ChatApplication.ERR_NOTEXTTOSEND
				,ERR_NORECIPIENT: this.ChatApplication.ERR_NORECIPIENT
				,PRIVMSG: this.ChatApplication.PRIVMSG
				,RPL_WHOISCHANNELS: this.ChatApplication.RPL_WHOISCHANNELS
				,QUIT: this.ChatApplication.QUIT
				,RPL_MOTDSTART: this.ChatApplication.RPL_MOTDSTART
				,RPL_MOTD: this.ChatApplication.RPL_MOTD
				,RPL_ENDOFMOTD: this.ChatApplication.RPL_ENDOFMOTD
				,ERR_NOMOTD: this.ChatApplication.ERR_NOMOTD
				,RPL_LUSERCLIENT: this.ChatApplication.RPL_LUSERCLIENT
				,RPL_LUSEROP: this.ChatApplication.RPL_LUSEROP
				,RPL_LUSERUNKOWN: this.ChatApplication.RPL_LUSERUNKOWN
				,RPL_LUSERCHANNELS: this.ChatApplication.RPL_LUSERCHANNELS
				,RPL_LUSERME: this.ChatApplication.RPL_LUSERME
				,RPL_WHOISIDLE: this.ChatApplication.RPL_WHOISIDLE
				,RPL_WHOISOPERATOR: this.ChatApplication.RPL_WHOISOPERATOR
				,PING: this.ChatApplication.PING
				,RPL_LISTEND: this.ChatApplication.RPL_LISTEND
				,RPL_LIST: this.ChatApplication.RPL_LIST
				,RPL_YOUREOPER: this.ChatApplication.RPL_YOUREOPER
				,ERR_PASSWDMISMATCH: this.ChatApplication.ERR_PASSWDMISMATCH
				,NICK: this.ChatApplication.NICK
				,ERR_ERRONEUSNICKNAME: this.ChatApplication.ERR_ERRONEUSNICKNAME
				,ERR_ALREADYREGISTRED: this.ChatApplication.ERR_ALREADYREGISTRED
				,RPL_VERSION: this.ChatApplication.RPL_VERSION
				,RPL_TIME: this.ChatApplication.RPL_TIME
				,RPL_ADMINME: this.ChatApplication.RPL_ADMINME
				,RPL_ADMINLOC1: this.ChatApplication.RPL_ADMINLOC1
				,RPL_ADMINLOC2: this.ChatApplication.RPL_ADMINLOC2
				,RPL_ADMINEMAIL: this.ChatApplication.RPL_ADMINEMAIL
				,RPL_INFO: this.ChatApplication.RPL_INFO
				,RPL_ENDOFINFO: this.ChatApplication.RPL_ENDOFINFO
				,ERR_NOPRIVILEGES: this.ChatApplication.ERR_NOPRIVILEGES
				,RPL_UMODEIS: this.ChatApplication.RPL_UMODEIS
				,ERR_USERSDONTMATCH: this.ChatApplication.ERR_USERSDONTMATCH
				,ERR_UMODEUNKNOWNFLAG: this.ChatApplication.ERR_UMODEUNKNOWNFLAG
				,RPL_NOWAWAY: this.ChatApplication.RPL_NOWAWAY
				,RPL_UNAWAY: this.ChatApplication.RPL_UNAWAY
				,RPL_AWAY: this.ChatApplication.RPL_AWAY
				,RPL_ENDOFNAMES: this.ChatApplication.RPL_ENDOFNAMES
				,RPL_ENDOFWHO: this.ChatApplication.RPL_ENDOFWHO
				,RPL_WHOREPLY: this.ChatApplication.RPL_WHOREPLY
				,ERR_USERSDISABLED: this.ChatApplication.ERR_USERSDISABLED
				,WALLOPS: this.ChatApplication.WALLOPS
				,RPL_ISON: this.ChatApplication.RPL_ISON
				,RPL_USERHOST: this.ChatApplication.RPL_USERHOST
				,RPL_CHANNELMODEIS: this.ChatApplication.RPL_CHANNELMODEIS
				,ERR_UNKNOWNMODE: this.ChatApplication.ERR_UNKNOWNMODE
				,MODE: this.ChatApplication.MODE
				,ERR_INVITEONLYCHAN: this.ChatApplication.ERR_INVITEONLYCHAN
				,ERR_USERONCHANNEL: this.ChatApplication.ERR_USERONCHANNEL
				,ERR_NOTONCHANNEL: this.ChatApplication.ERR_NOTONCHANNEL
				,INVITE: this.ChatApplication.INVITE
				,RPL_INVITING: this.ChatApplication.RPL_INVITING
				,RPL_INVITELIST: this.ChatApplication.RPL_INVITELIST
				,RPL_ENDOFINVITELIST: this.ChatApplication.RPL_ENDOFINVITELIST
				,ERR_CHANNELISFULL: this.ChatApplication.ERR_CHANNELISFULL
				,ERR_BADCHANNELKEY: this.ChatApplication.ERR_BADCHANNELKEY
				,ERR_USERNOTINCHANNEL: this.ChatApplication.ERR_USERNOTINCHANNEL
				,ERR_CHANOPRIVSNEEDED: this.ChatApplication.ERR_CHANOPRIVSNEEDED
				,ERR_CANNOTSENDTOCHAN: this.ChatApplication.ERR_CANNOTSENDTOCHAN
				,KICK: this.ChatApplication.KICK
				,RPL_ENDOFBANLIST: this.ChatApplication.RPL_ENDOFBANLIST
				,RPL_BANLIST: this.ChatApplication.RPL_BANLIST
				,RPL_EXCEPTLIST: this.ChatApplication.RPL_EXCEPTLIST
				,RPL_ENDOFEXCEPTLIST: this.ChatApplication.RPL_ENDOFEXCEPTLIST
				,ERR_BANNEDFROMCHAN: this.ChatApplication.RPL_ENDOFEXCEPTLIST
			}
		} );

		// Initialise the server
		jsIRCClient.init();

		// Add the chat server to the chat application
		this.ChatApplication.client = jsIRCClient;
	} );
}