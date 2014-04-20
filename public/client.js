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
        Ext.Loader.setPath('Ext.ux', 'extjs/examples/ux');
        Ext.require('Ext.ux.layout.Center');

	Ext.onReady( function() {
		// Create 'leftBar' and 'rightBar'
		this.leftBar = new LeftBar();
                this.rightBar = new RightBar();

		// Create window container
		this.windowContainer = Ext.create( 'Ext.panel.Panel', {
                        hideHeaders: true
                        ,layout: 'fit'
                        ,frame: false
                        ,border: false
                        ,region: 'center'
		} );

                this.applications = {
                        youtube: new Youtube()
                        ,vimeo: new Vimeo()
                };

		// Create center region, to contain the window container...
		this.centerRegion = Ext.create( 'Ext.panel.Panel', {
			region: 'center'
			,layout: 'border'
                        ,frame: false
                        ,border: false
                        ,hideHeaders: true
			,items: [
                                this.windowContainer
                                ,Ext.create( 'Ext.panel.Panel', {
                                        layout : {
                                                type : 'hbox'
                                        }
                                        ,bodyPadding: 3.5
                                        ,region: 'north'
                                        ,height: 50
                                        ,minHeight: 50
                                        ,items: [
                                                Ext.create( 'Ext.Button', {
                                                        // https://www.iconfinder.com/icons/3407/atom_ball_balls_bend_join_joint_kfouleggs_icon#size=32
                                                        icon: 'data:image/png;base64,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'
                                                        ,scale: 'large'
                                                        ,text: 'Join channel'
                                                        ,handler: function() {
                                                                Ext.MessageBox.prompt( 'Channel name', 'Please enter a channel name:', function( btn, text ){
                                                                        if (btn == 'ok'){
                                                                                if ( text[0] !== "#" ) {
                                                                                        text = "#" + text;
                                                                                }

                                                                                this.ChatApplication.parseCommand( "/join " + text );
                                                                        }
                                                                });
                                                        }.bind( this )
                                                } )
                                                ,Ext.create( 'Ext.panel.Panel', { width: 5, border: false, frame: false } )
                                                ,Ext.create( 'Ext.Button', {
                                                        // https://www.iconfinder.com/icons/27877/find_magnifying_glass_search_zoom_icon#size=32
                                                        icon: 'data:image/png;base64,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'
                                                        ,scale: 'large'
                                                        ,text: 'List channels'
                                                        ,handler: function() {
                                                                this.ChatApplication.parseCommand( "/list" );
                                                        }.bind( this )
                                                } )
                                                ,Ext.create( 'Ext.panel.Panel', { width: 5, border: false, frame: false } )
                                        ]
                                } )
                        ]
		} );

		// Create main viewport...
		this.viewPort = Ext.create( 'Ext.container.Viewport', {
			layout: 'border'
			,items: [
                                this.centerRegion
                                ,this.leftBar.panel
                                ,this.rightBar.panel
                                ,Ext.create( 'Ext.panel.Panel', {
                                        layout : {
                                                type : 'hbox'
                                        }
                                        ,bodyPadding: 3.5
                                        ,region: 'south'
                                        ,height: 50
                                        ,minHeight: 50
                                        ,items: [
                                                this.applications.youtube.button
                                                ,Ext.create( 'Ext.panel.Panel', { width: 5, border: false, frame: false } )
                                                ,this.applications.vimeo.button
                                        ]
                                } )
                        ]
		} );

		this.ChatApplication = new jsIRC( {
			renderTo: this.windowContainer
			,leftbar: this.leftBar
			,rightbar: this.rightBar
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
				,RPL_STREAM: this.ChatApplication.RPL_STREAM
			}
		} );

		// Initialise the server
		jsIRCClient.init();

		// Add the chat server to the chat application
		this.ChatApplication.client = jsIRCClient;
	} );
}
