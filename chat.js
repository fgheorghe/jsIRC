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

// TODO: Format client names

/**
 * Chat Application Object.
 * TODO: Document optional keys for all objects.
 * @param {Object} config Chat status window configuration object.
 * @class Provides chat functionality.
 * @constructor
 */
var ChatJs = function( config ) {
	this._config = config;
	// Constants
	this.NICK_PATTERN = /^[a-zA-Z0-9]+$/; // Nickname pattern, as per RFC
	this.CHANNEL_NAME_PATTERN = /^[#&+!]+[a-zA-Z0-9\-\_]+$/; // Channel name, as per RFC...

	// Client id array
	this._clients = [];

	// 'Array' of channel windows
	this._channelWindows = {};

	// Array of chat windows
	this._queryWindows = [];
	this._lcChatNicknames = []; // Array of lower case chat nicknames

	// Keep of a client's registered state
	this._registered = false;

	// Client instance
	this.client = {};

	// The current nickname
	this._nickname = null;

	// Keep track of the current 'tab' or browser window focus...
	this._windowFocus = true;
	var me = this;
	$( window ).focus( function() {
		me._windowFocus = true;
	} );
	$( window ).blur( function() {
		me._windowFocus = false;
	} );


	// Handle a text sending UI action
	this.handleSendText = function( textField, recipient ) {
		var _textField = textField || this.textField;
		// Check if the user tries sending a command (string starting with a /).
		if ( _textField.getValue().toString().charAt( 0 ) === "/" ) {
			// Parse command
			this.parseCommand( _textField.getValue().toString() );
		} else {
			// If a recipient if set, construct a privmsg command, and call same function again
			if ( recipient ) {
				this.parseCommand( "/privmsg " + recipient + " " + _textField.getValue().toString() );
			}
		}
		_textField.setValue( "" );
	}

	// Text field
	this.textField = Ext.create( 'Ext.form.field.Text', {
		width: 560
		,enableKeyEvents: true
		,listeners: {
			keydown: function( field, e, eOpts ) {
				if ( e.getKey() === 13 ) {
					this.handleSendText.bind( this )();
				}
			}.bind( this )
		}
	} );

	// Send button
	this.sendButton = Ext.create( 'Ext.button.Button', {
		text: 'Send'
		,handler: this.handleSendText.bind( this, [ this.textField ] )
	} );

	// Prepare the text window
	this.textPanel = Ext.create( 'Ext.panel.Panel', {
		border: true
		,frame: false
		,bodyStyle: {
			padding: '5px'
			,whiteSpace: "pre-wrap"
			,fontFamily: "monospace"
			,fontSize: "11px"
		}
		,autoScroll: true
		// Start adding text from the bottom
		,html: '<div style="height: 3000px;">&nbsp;</div>'
		,bbar: [
			this.textField
			, '-'
			,this.sendButton
		]
		,listeners: {
			resize: function() {
				// Scroll to bottom
				this.textPanel.body.scroll( 'b', Infinity );

				// Resize text field
				this.textField.setWidth(
					this.textPanel.getWidth() - this.sendButton.getWidth() - 11
				);
			}.bind( this )
		}
	} );

	// Prepare taskbar button
	this.taskbarButton = Ext.create( 'Ext.button.Button', {
		text: 'Status'
		,enableToggle: true
		,depressed: true
		,toggleGroup: 'taskList'
		,handler: function( button ) {
			// Hide or show the window
			if ( !button.pressed && this.chatWindow.isHidden() === false ) {
				this.chatWindow.hide();
			} else {
				this.chatWindow.show();
				this.textField.focus( false, 200 );
			}
		}.bind( this )
		,listeners: {
			render: function() {
				// Toggle button
				this.taskbarButton.toggle( true );
			}.bind( this )
		}
	} );

	// Prepare the window
	this.chatWindow = Ext.create( 'Ext.window.Window', {
		title: 'Status'
		,closable: false
		,maximizable: true
		,minimizable: true
		,resizable: true
		,constrain: true
		,renderTo: typeof this._config.renderTo !== "undefined" ? this._config.renderTo.getEl() : document.body
		,height: 500
		,width: 800
		,layout: 'fit'
		,items: [
			this.textPanel
		]
		,listeners: {
			render: function() {
				// If a taskbar is configured, add button
				if ( this._config.taskbar ) {
					this._config.taskbar.toolbar.add( this.taskbarButton );
					this._config.taskbar.toolbar.add( '-' );
				}
			}.bind( this )
			,activate: function() {
				// If a taskbar is configured, add button
				if ( this._config.taskbar ) {
					// Toggle button
					this.taskbarButton.toggle( true );
				}
			}.bind( this )
			,minimize: function() {
				// If a taskbar is configured, un-toggle button
				if ( this._config.taskbar ) {
					// Un-toggle button
					this.taskbarButton.toggle( false );
					this.chatWindow.hide();
				}
			}.bind( this )
		}
	} );

	// Show
	this.chatWindow.show();

	// Mask, until a connection is made
	this.chatWindow.mask();
};

/**
 * Method used for finding or creating a query window.
 * @param {String} nickname Client nickname.
 * @function
 */
ChatJs.prototype.findOrCreateQueryWindow = function( nickname ) {
	// Verify if already created
	var queryWindowPosition = this._lcChatNicknames.indexOf( nickname.toLowerCase() )
		,queryWindow;

	if ( queryWindowPosition === -1 ) {
		// Create window
		queryWindow = new ChatWindow( {
			parent: this
			,nickname: nickname
			,renderTo: this._config.renderTo
			,taskbar: this._config.taskbar
		} );

		// Add to list
		this._queryWindows.push( queryWindow );
		this._lcChatNicknames.push( nickname.toLowerCase() );
	} else {
		// Display window
		queryWindow = this._queryWindows[queryWindowPosition];
	}

	return queryWindow;
}

/**
 * Parse a command, prepare parameters, and send it.
 * @param {String} text String to parse.
 * @function
 */
ChatJs.prototype.parseCommand = function( text ) {
	// Trim command
	text = Ext.util.Format.trim( text ).toString();

	// Get the command name
	var commandPattern = /\/([A-Za-z]+)/i
		,parameters = text.split( " " ).slice( 1 )
		,command = commandPattern.exec( text )[1].toLowerCase()
		,data = {};

	switch ( command ) {
		case "whois":
			// Construct a whois command
			if ( parameters.length >= 1 ) {
				// Target
				data.target = parameters[0];
			}

			// Optional mask
			if ( parameters.length > 2 ) {
				data.mask = parameters.slice( 1 );
			} else if ( parameters.length === 2 ) {
				data.mask = parameters[1];
			}
			console.log( data );
			this.client.emit( command.toUpperCase(), data );
			break;
		case "names":
			// Construct a names command
			if ( parameters.length >= 1 ) {
				// Channel list
				var channels = parameters[0].split( "," );
				data.channels = channels;
			}

			console.log( data );
			this.client.emit( command.toUpperCase(), data );
			break;
		case "users":
			// NOTE: Command is disabled
			console.log( data );
			this.client.emit( command.toUpperCase(), data );
			break;
		case "ison":
			// Construct an ison command
			if ( parameters.length >= 1 ) {
				// Channel list
				var nicknames = text.split( " " ).splice( 1 );
				data.nicknames = nicknames;
			}

			console.log( data );
			this.client.emit( command.toUpperCase(), data );
			break;
		case "userhost":
			// Construct a userhost command
			if ( parameters.length >= 1 ) {
				// Channel list
				var nicknames = text.split( " " ).splice( 1 );
				data.nicknames = nicknames;
			}
			
			console.log( data );
			this.client.emit( command.toUpperCase(), data );
			break;
		case "join":
			// TODO: Properly handle whitespace!
			// Construct a join command
			if ( parameters.length >= 1 ) {
				// Channel list
				var channels = parameters[0].split( "," );
				data.channels = channels;
			}

			// Key(s)
			if ( parameters.length >= 2 ) {
				var keys = parameters[1].split( "," );
				data.keys = keys;
			}

			console.log( data );
			this.client.emit( command.toUpperCase(), data );
			break;
		case "part":
			// TODO: Properly handle whitespace!
			// Construct a part command
			if ( parameters.length >= 1 ) {
				// Channel list
				var channels = parameters[0].split( "," );
				data.channels = channels;
			}

			console.log( data );
			this.client.emit( command.toUpperCase(), data );
			break;
		case "topic":
			// Construct a topic command
			if ( parameters.length >= 1 ) {
				// Target
				data.channel = parameters[0];
			}
			
			// Construct a topic command
			if ( parameters.length >= 2 ) {
				// Target
				data.topic = text.slice( text.indexOf( data.channel ) + data.channel.length + 1 );
			} else {
				// Set an empty topic, used for removing it
				data.topic = "";
			}
			
			console.log( data );
			this.client.emit( command.toUpperCase(), data );
			break;
		case "away":
			// Construct an away command
			if ( parameters.length >= 1 ) {
				// Text
				data.text = text.slice( text.indexOf( command ) + command.length + 1 );
			}

			console.log( data );
			this.client.emit( command.toUpperCase(), data );
			break;
		case "wallops":
			// Construct a wallops command
			if ( parameters.length >= 1 ) {
				// Text
				data.text = text.slice( text.indexOf( command ) + command.length + 1 );
			}
			
			console.log( data );
			this.client.emit( command.toUpperCase(), data );
			break;
		case "quit":
			// Construct a quit command
			if ( parameters.length >= 1 ) {
				// Reason
				data.reason = text.slice( text.indexOf( command ) + command.length + 1 );
			}

			console.log( data );
			this.client.emit( command.toUpperCase(), data );
			break;
		case "privmsg":
			// Construct a privmsg command
			if ( parameters.length >= 1 ) {
				// Target
				data.target = parameters[0];
			}

			// Construct a whois command
			if ( parameters.length >= 2 ) {
				// Target
				data.message = text.slice( text.indexOf( data.target ) + data.target.length + 1 );
			}

			console.log( data );
			this.client.emit( command.toUpperCase(), data );
			break;
		case "kill":
			// Construct a kill command
			if ( parameters.length >= 1 ) {
				// Nickname
				data.nickname = parameters[0];
			}

			// Comment
			if ( parameters.length >= 2 ) {
				// Comment
				data.comment = text.slice( text.indexOf( data.nickname ) + data.nickname.length + 1 );
			}

			console.log( data );
			this.client.emit( command.toUpperCase(), data );
			break;
		case "who":
			// Construct a who command
			if ( parameters.length >= 1 ) {
				// Mask
				data.mask = parameters[0];
			}

			// o
			if ( parameters.length >= 2 ) {
				// o
				data.o = parameters[1];
			}

			console.log( data );
			this.client.emit( command.toUpperCase(), data );
			break;
		case "motd":
			// Construct a motd command
			if ( parameters.length >= 1 ) {
				// Target
				data.target = parameters[0];
			}

			console.log( data );
			this.client.emit( command.toUpperCase(), data );
			break;
		case "mode":
			// Construct a mode command
			if ( parameters.length >= 1 ) {
				// Target
				data.target = parameters[0];
			}

			// NOTE: If this is a channel, then the second (and following) set of "parameters" are...mode parameters
			// NOTE: E.g. mode #channel +lk 100 channelkey
			// NOTE: As opposed to regular modes, where the user may set/remove modes using the same command
			var isChannel = this.CHANNEL_NAME_PATTERN.test( data.target );

			// Modes
			if ( parameters.length >= 2 ) {
				if ( !isChannel ) {
					data.modes = parameters.splice( 1 );
				} else {
					data.modes = parameters[1];
					if ( parameters.length >= 3 ) {
						data.parameters = parameters.splice( 2 );
					}
				}
			}

			console.log( data );
			this.client.emit( command.toUpperCase(), data );
			break;
		case "version":
			// Construct a version command
			if ( parameters.length >= 1 ) {
				// Target
				data.target = parameters[0];
			}

			console.log( data );
			this.client.emit( command.toUpperCase(), data );
			break;
		case "time":
			// Construct a time command
			if ( parameters.length >= 1 ) {
				// Target
				data.target = parameters[0];
			}

			console.log( data );
			this.client.emit( command.toUpperCase(), data );
			break;
		case "admin":
			// Construct an admin command
			if ( parameters.length >= 1 ) {
				// Target
				data.target = parameters[0];
			}

			console.log( data );
			this.client.emit( command.toUpperCase(), data );
			break;
		case "info":
			// Construct an info command
			if ( parameters.length >= 1 ) {
				// Target
				data.target = parameters[0];
			}

			console.log( data );
			this.client.emit( command.toUpperCase(), data );
			break;
		case "lusers":
			// Mask
			if ( parameters.length >= 1 ) {
				// Target
				data.mask = parameters[0];
			}

			// Target
			if ( parameters.length >= 2 ) {
				// Target
				data.target = parameters[0];
			}

			console.log( data );
			this.client.emit( command.toUpperCase(), data );
			break;
		case "query": // NOTE: Not an IRC command. Opens a new client query window, if it doesn't already exist
			// Nickname
			if ( parameters.length >= 1 ) {
				var queryWindow = this.findOrCreateQueryWindow( parameters[0] );

				queryWindow.chatWindow.show();
			} else {
				this.addText( '* query command usage: /query nickname' );
			}
			break;
		case "list":
			// TODO: Add channel and target filters
			// Clear, if already open and listed
			if ( this._channelListWindow ) {
				// Remove all items
				this._channelListWindow.channelGrid.getStore().removeAll();
			}

			this.client.emit( command.toUpperCase(), {} );
			break;
		case "oper":
			// Password
			if ( parameters.length >= 1 ) {
				// Password
				data.password = parameters[0];
			}
			
			console.log( data );
			this.client.emit( command.toUpperCase(), data );
			break;
		case "nick":
			// Nickname
			if ( parameters.length >= 1 ) {
				// Nickname
				data.nickname = parameters[0];
			}
			
			console.log( data );
			this.client.emit( command.toUpperCase(), data );
			break;
		case "invite":
			// Nickname
			if ( parameters.length >= 1 ) {
				// Nickname
				data.nickname = parameters[0];
			}

			// Channel
			if ( parameters.length >= 2 ) {
				// Nickname
				data.channel = parameters[1];
			}
			
			console.log( data );
			this.client.emit( command.toUpperCase(), data );
			break;
		default:
			// TODO:
			break;
	}
}

/**
 * Method used for re-connecting to server.
 * TODO: Implement.
 * @function
 */
ChatJs.prototype.reconnect = function() {
	var i;

	// Unmask chat windows, if any
	for ( var key in this._channelWindows ) {
		this._channelWindows[key].chatWindow.unmask();
	}

	// Unmask query windows, if any
	for ( i = 0; i < this._queryWindows.length; i++ ) {
		this._queryWindows[i].chatWindow.unmask();
	}

	// Unmask list window, if loaded
	if ( this._channelListWindow ) {
		this._channelListWindow.listWindow.unmask();
	}

	// Unmask status window
	this.chatWindow.unmask();
}

/**
 * Method used for handling a lost connection.
 * @function
 */
ChatJs.prototype.disconnectHandler = function() {
	var i;

	// Mask chat windows, if any
	for ( var key in this._channelWindows ) {
		this._channelWindows[key].chatWindow.mask();
	}

	// Mask query windows, if any
	for ( i = 0; i < this._queryWindows.length; i++ ) {
		this._queryWindows[i].chatWindow.mask();
	}

	// Mask list window, if loaded
	if ( this._channelListWindow ) {
		this._channelListWindow.listWindow.mask();
	}

	// Mask status window
	this.chatWindow.mask();

	// Just display an error window
	Ext.Msg.show( {
		title: 'Error'
		,msg: 'Connection lost. Please reload page.'
		,closable: false
		,modal: false
	} );
}

/**
 * Method used for creating the name prompt.
 * @function
 */
ChatJs.prototype.createNamePrompt = function() {
	this.namePrompt = Ext.Msg.show( {
		title: 'Name'
		,msg: 'Please enter your name:'
		,width: 300
		,hideMode: 'hide'
		,buttons: Ext.Msg.OK
		,prompt: true
		,modal: false
		,closable: false
		,fn: function( button, text ) {
			// Set the name of this client
			this.client.emit( 'NICK', { nickname: text } );
			// Set the user details
			this.client.emit( 'USER', {
				user: 'user'
				,mode: 0
				,realname: 'realname'
			} );

			// Store name
			this._nickname = text;
		}.bind( this )
		,icon: Ext.window.MessageBox.INFO
	} );
}

/**
 * Method used for removing a channel window, from the window list.
 * @param {String} channel Channel name.
 * @function
 */
ChatJs.prototype.removeChannelWindow = function( channel ) {
	// Find in the list of windows
	var _newList = {};
	for ( var key in this._channelWindows ) {
		if ( key.toLowerCase() !== channel.toLowerCase() ) {
			_newList[key] = this._channelWindows[key];
		}
	}
	this._channelWindows = _newList;
}

/**
 * Method used for handling a successful connection.
 * @function
 */
ChatJs.prototype.connectHandler = function() {
	// Ignore if we already went through this process...
	if ( this._namePromptDisplayed ) {
		return;
	}
	this._namePromptDisplayed = true;

	// Request a name for this client
	// Hidden by an 'okName' event.
	this.createNamePrompt();
}

/**
 * Method used for appending text.
 * @param {String} text String to add to window.
 * @param {Boolean} noAlert Ignore the window title alert.
 * @function
 */
ChatJs.prototype.addText = function( text, noAlert ) {
	// Apply extra formats
	text = Ext.util.Format.nl2br( text );

	// Convert links
	text = text.replace( /(\b(https?):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig, "<a href='$1' target='_blank'>$1</a>" );

	this.textPanel.body.insertHtml( "beforeEnd", text + '<br>' );
	this.textPanel.body.scroll( 'b', Infinity );

	// If the window is blured (user switched to another tab), flash the title
	if ( !this._windowFocus && !noAlert ) {
		$.titleAlert( "New chat message!", {
			stopOnFocus: true
			,duration: 4000
			,interval: 700
		} );
	}
}

/** IRC Client Protocol Handlers */

/**
 * Handler for an 'ERR_NICKNAMEINUSE' event.
 * @function
 */
ChatJs.prototype.ERR_NICKNAMEINUSE = function( data ) {
	if ( this._registered === false ) {
		// Show an error message, then the prompt asking for a new name
		Ext.Msg.show( {
			title: 'Nickname'
			,msg: 'Nickname is already in use. Please input a different nickname.'
			,buttons: Ext.Msg.OK
			,width: 380
			,modal: false
			,closable: false
			,fn: function() {
				// Display the prompt again
				this.createNamePrompt();
			}.bind( this )
		} );
	} else {
		this.addText( '* ' + Ext.htmlEncode( data.msg ) );
	}
}

/**
 * Method used for handling 'JOIN' event, and create a new channel window or update the channel member list.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.JOIN = function( data ) {
	// Create a new window, if the JOIN command is reffering to the current user AND a window for this channel doesn't exist
	// TODO: Check if channel window exists!
	if ( data.nickname.toLowerCase() === this._nickname.toLowerCase() && typeof this._channelWindows[data.channel] === "undefined" ) {
		// Create window
		this._channelWindows[data.channel] = new ChannelWindow( {
			channel: data.channel
			,parent: this
			,renderTo: this._config.renderTo
			,taskbar: this._config.taskbar
		} );

		// Show window
		this._channelWindows[data.channel].chatWindow.show();
	} else if ( data.nickname.toLowerCase() === this._nickname.toLowerCase() && this._channelWindows[data.channel] ) {
		// Just set active
		this._channelWindows[data.channel].chatWindow.show();
	} else if ( data.nickname.toLowerCase() !== this._nickname.toLowerCase() && this._channelWindows[data.channel] ) {
		// Append text
		this._channelWindows[data.channel].addText( "* " + Ext.htmlEncode( data.nickname ) + " (" + Ext.htmlEncode( data.user ) + "@" + Ext.htmlEncode( data.host ) + ") has joined " + Ext.htmlEncode( data.channel ), true );
		// Append to user list
		this._channelWindows[data.channel].addClient( {
			leaf: true
			,text: Ext.htmlEncode( data.nickname )
			,icon: 'img/face-smile.png'
		} );
	}

	// Request channel modes
	this.client.emit( 'MODE',
		{
			target: data.channel
		}
	);

	// TODO: Handle out of synch 'JOIN' reply (display event in status window, if the channel window doesn't exist)
}

/**
 * Method used for handling 'PART' event, and close the channel window, or update the client list
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.PART = function( data ) {
	if ( data.nickname.toLowerCase() === this._nickname.toLowerCase() && typeof this._channelWindows[data.channel] === "undefined" ) {
		// 'Terminate' the window
		// TODO:
		// Remove from list
	} else {
		// Append text
		this._channelWindows[data.channel].addText( "* " + Ext.htmlEncode( data.nickname ) + " (" + Ext.htmlEncode( data.user ) + "@" + Ext.htmlEncode( data.host ) + ") has left " + Ext.htmlEncode( data.channel ), true );

		// Remove from list of users
		this._channelWindows[data.channel].removeClient( data.nickname );
	}
}

/**
 * Method used for handling 'ERR_NONICKNAMEGIVEN' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.ERR_NONICKNAMEGIVEN = function( data ) {
	// Add text to window
	this.addText( '* '  + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'ERR_NOPRIVILEGES' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.ERR_NOPRIVILEGES = function( data ) {
	// Add text to window
	this.addText( '* '  + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'ERR_USERSDISABLED' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.ERR_USERSDISABLED = function( data ) {
	// Add text to window
	this.addText( '* '  + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_TOPIC' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_TOPIC = function( data ) {
	// Find the channel window
	var channelWindow = this._channelWindows[ data.channel ];

	// If this is a user updating (as opposed to requesting it on join) notify the user, and update topic
	if ( data.nickname ) {
		// Add text
		channelWindow.addText( '* ' + Ext.htmlEncode( data.nickname ) + ' has changed topic to: ' + Ext.htmlEncode( data.topic ) );
	} else {
		channelWindow.addText( '* Topic for ' + Ext.htmlEncode( data.channel ) + ' is: ' + Ext.htmlEncode( data.topic ) );
	}

	// Update the window's topic value
	channelWindow.topicText.setValue( data.topic );
}

/**
 * Method used for handling 'RPL_NAMREPLY' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_NAMREPLY = function( data ) {
	console.log( data.names );
	// Load list of clients, if a window exists
	if ( typeof this._channelWindows[data.channel] !== "undefined" ) {
		var names = [];
		// Convert to tree items
		for ( var i = 0; i < data.names.length; i++ ) {
			names.push( {
				text: Ext.htmlEncode( data.names[i] )
				,leaf: true
				,icon: 'img/face-smile.png'
			} );
		}
		this._channelWindows[data.channel].loadClientList( names );
	}
}

/**
 * Method used for handling 'RPL_NOTOPIC' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_NOTOPIC = function( data ) {
	// Find channel window, and set to an empty string
	if ( typeof this._channelWindows[data.channel] !== "undefined" ) {
		this._channelWindows[data.channel].topicText.setValue( "" );
	}
	console.log( data );
}

/**
 * Method used for handling 'ERR_NONICKNAMEGIVEN' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.ERR_NEEDMOREPARAMS = function( data ) {
	// Add text to window
	this.addText( '* '  + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_ENDOFNAMES' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_ENDOFNAMES = function( data ) {
	// Add text to window
	this.addText( '* '  + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'ERR_NOSUCHCHANNEL' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.ERR_NOSUCHCHANNEL = function( data ) {
	// Add text to window
	this.addText( '* '  + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'ERR_ALREADYREGISTRED' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.ERR_ALREADYREGISTRED = function( data ) {
	// Add text to window
	this.addText( '* '  + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_VERSION' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_VERSION = function( data ) {
	// Add text to window
	this.addText( '* '  + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'ERR_NOSUCHNICK' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.ERR_NOSUCHNICK = function( data ) {
	// Add text to window
	this.addText( '* '  + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'PRIVMSG' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.PRIVMSG = function( data ) {
	// Check if target is a channel, or current user
	var isChannel = this.CHANNEL_NAME_PATTERN.test( data.target );
	var isNickname = this.NICK_PATTERN.test( data.target );

	// Handle channel messages
	if ( isChannel ) {
		// Find a channel window
		// TODO: Handle non existing channel windows
		if ( typeof this._channelWindows[data.target] !== "undefined" ) {
			this._channelWindows[data.target].addText( "<b>[" + Ext.htmlEncode( data.nickname ) + "]</b> " + Ext.htmlEncode( data.message ) );
		}
	} else if ( isNickname ) {
		// TODO: Handle target / nickname mismatch
		if ( data.target.toLowerCase() === this._nickname.toLowerCase() ) {
			// Check if window exists
			var windowExists = this._lcChatNicknames.indexOf( data.nickname.toLowerCase() );

			// Get an instance
			var queryWindow = this.findOrCreateQueryWindow( data.nickname );

			// Show, if just created
			if ( windowExists === -1 ) {
				queryWindow.chatWindow.show();
			}

			// Append text
			queryWindow.addText( "<b>[" + Ext.htmlEncode( data.nickname ) + "]</b> " + Ext.htmlEncode( data.message ) );
		}
	}
}

/**
 * Method used for handling 'RPL_ENDOFWHOIS' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_ENDOFWHOIS = function( data ) {
	// Add text to window
	this.addText( '* [' + Ext.htmlEncode( data.nick ) + '] End of WHOIS list' );
}

/**
 * Method used for handling 'RPL_WHOISIDLE' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_WHOISIDLE = function( data ) {
	// Add text to window
	this.addText( '* [' + Ext.htmlEncode( data.nick ) + '] ' + Ext.htmlEncode( data.idle ) + ' :seconds idle' );
}

/**
 * Method used for handling 'ERR_NOTONCHANNEL' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.ERR_NOTONCHANNEL = function( data ) {
	// Add text to window
	this.addText( '* '  + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_INVITELIST' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_INVITELIST = function( data ) {
	// Add text to window
	this.addText( '* '  + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_ENDOFINVITELIST' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_ENDOFINVITELIST = function( data ) {
	// Add text to window
	this.addText( '* '  + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'INVITE' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.INVITE = function( data ) {
	// Add text to window
	this.addText( '* [' + Ext.htmlEncode( data.nick ) + '] ' + Ext.htmlEncode( data.user ) + '@' + Ext.htmlEncode( data.host ) + ' invites you to join '  + Ext.htmlEncode( data.channel ) );
}

/**
 * Method used for handling 'RPL_INVITING' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_INVITING = function( data ) {
	// Add text to window
	this.addText( '* '  + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'ERR_USERONCHANNEL' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.ERR_USERONCHANNEL = function( data ) {
	// Add text to window
	this.addText( '* '  + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_WHOISUSER' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_WHOISUSER = function( data ) {
	// Add text to window
	this.addText( '* [' + Ext.htmlEncode( data.nick ) + '] (' + Ext.htmlEncode( data.user ) + '@' + Ext.htmlEncode( data.host ) + '): '  + Ext.htmlEncode( data.realname ) );
}

/**
 * Method used for handling 'RPL_WHOISSERVER' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_WHOISSERVER = function( data ) {
	// Add text to window
	this.addText( '* [' + Ext.htmlEncode( data.nick ) + '] ' + Ext.htmlEncode( data.server ) + ' :' + Ext.htmlEncode( data.serverinfo ) );
}

/**
 * Method used for handling 'WALLOPS' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.WALLOPS = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.server ) + ' :' + Ext.htmlEncode( data.text ) );
}

/**
 * Method used for handling 'RPL_WHOISCHANNELS' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_WHOISCHANNELS = function( data ) {
	// Add text to window
	this.addText( '* [' + Ext.htmlEncode( data.nick ) + '] ' + Ext.htmlEncode( data.channels.join( " " ) ) );
}

/**
 * Method used for handling 'QUIT' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.QUIT = function( data ) {
	// Remove from all windows
	// TODO: Handle out of synch quits, and optimize the process
	for ( var channel in this._channelWindows ) {
		if ( this._channelWindows[ channel ].findClient( data.nickname ) ) {
			this._channelWindows[ channel ].addText( "* " + Ext.htmlEncode( data.nickname ) + " (" + Ext.htmlEncode( data.user ) + "@" + Ext.htmlEncode( data.host ) + ") has quit (" + Ext.htmlEncode( data.reason ) + ")", true );
			this._channelWindows[ channel ].removeClient( data.nickname );
		}
	}
}

/**
 * Method used for handling 'NICK' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.NICK = function( data ) {
	// Add text to all channel windows
	for ( var channel in this._channelWindows ) {
		if ( this._channelWindows[ channel ].findClient( data.initial ) ) {
			if ( data.initial.toLowerCase() === this._nickname.toLowerCase() ) {
				this._channelWindows[ channel ].addText( "* You are now known as " + Ext.htmlEncode( data.nickname ), true );
			} else {
				this._channelWindows[ channel ].addText( "* " + Ext.htmlEncode( data.initial ) + " (" + Ext.htmlEncode( data.user ) + "@" + Ext.htmlEncode( data.host ) + ") is now known as " + Ext.htmlEncode( data.nickname ), true );
			}

			// Update channel nickname list
			this._channelWindows[ channel ].replaceClient( data.initial, data.nickname );
		}
	}

	if ( data.initial.toLowerCase() === this._nickname.toLowerCase() ) {
		this.addText( "* You are now known as " + Ext.htmlEncode( data.nickname ) );
		this._nickname = data.nickname;
	}

	console.log( "Current: " + this._nickname );
}

/**
 * Method used for handling 'RPL_MYINFO' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_MYINFO = function( data ) {
	// Add text to window
	this.addText( '*** ' + Ext.htmlEncode( data.msg ) );

	// Once this is displayed, request a motd
	this.client.emit( "MOTD", {} );
}

/**
 * Method used for handling 'RPL_CREATED' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_CREATED = function( data ) {
	// Add text to window
	this.addText( '*** ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_YOURHOST' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_YOURHOST = function( data ) {
	// Add text to window
	this.addText( '*** ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'ERR_NORECIPIENT' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.ERR_NORECIPIENT = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_USERHOST' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_USERHOST = function( data ) {
	// Add text to window
	for ( var i = 0; i < data.nicknames.length; i++ ) {
		this.addText( '* USERHOST: ' + Ext.htmlEncode( data.nicknames[i].nickname ) + "=" + Ext.htmlEncode( data.nicknames[i].user ) + "@" + Ext.htmlEncode( data.nicknames[i].host ) );
	}
}

/**
 * Method used for handling 'RPL_ISON' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_ISON = function( data ) {
	// Add text to window
	this.addText( '* ISON: ' + Ext.htmlEncode( data.nicknames.join( " " ) ) );
}

/**
 * Method used for handling 'PING' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.PING = function( data ) {
	// Add text to window
	// TODO: Clarify
	// TODO: Add text back
// 	this.addText( '* PING from ' + Ext.htmlEncode( data.source ), true );

// 	this.addText( '* PONG to ' + Ext.htmlEncode( data.source ), true );
	this.client.emit( 'PONG', {
		server: data.source
	} );
}

/**
 * Method used for handling 'ERR_NOTEXTTOSEND' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.ERR_NOTEXTTOSEND = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_MOTDSTART' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_MOTDSTART = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_MOTD' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_MOTD = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_INFO' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_INFO = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_ENDOFINFO' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_ENDOFINFO = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_TIME' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_TIME = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_ADMINME' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_ADMINME = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_ADMINLOC1' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_ADMINLOC1 = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_ADMINLOC2' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_ADMINLOC2 = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_ADMINEMAIL' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_ADMINEMAIL = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'ERR_ERRONEUSNICKNAME' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.ERR_ERRONEUSNICKNAME = function( data ) {
	if ( this._registered === false ) {
		// Show an error message, then the prompt asking for a new name
		Ext.Msg.show( {
			title: 'Nickname'
			,msg: 'Erroneus nickname. Please input a different nickname.'
			,buttons: Ext.Msg.OK
			,width: 380
			,modal: false
			,closable: false
			,fn: function() {
				// Display the prompt again
				this.createNamePrompt();
			}.bind( this )
		} );
	} else {
		// Add text to window
		this.addText( "* " + Ext.htmlEncode( data.msg ) );
	}
}

/**
 * Method used for handling 'RPL_ENDOFMOTD' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_ENDOFMOTD = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'ERR_NOMOTD' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.ERR_NOMOTD = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_LUSERCLIENT' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_LUSERCLIENT = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_LUSEROP' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_LUSEROP = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_LUSERUNKOWN' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_LUSERUNKOWN = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_LUSERCHANNELS' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_LUSERCHANNELS = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_LUSERME' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_LUSERME = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_YOUREOPER' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_YOUREOPER = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'ERR_PASSWDMISMATCH' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.ERR_PASSWDMISMATCH = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_WHOISOPERATOR' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_WHOISOPERATOR = function( data ) {
	// Add text to window
	this.addText( '* [' + Ext.htmlEncode( data.nick ) + '] ' + "is an IRC operator" );
}

/**
 * Method used for handling 'RPL_UMODEIS' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_UMODEIS = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'ERR_INVITEONLYCHAN' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.ERR_INVITEONLYCHAN = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'ERR_CHANNELISFULL' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.ERR_CHANNELISFULL = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'MODE' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.MODE = function( data ) {
	if ( typeof this._channelWindows[data.channel] !== "undefined" ) {
		// Get set or remove type of update
		var value = data.mode[0] === "+";

		if ( data.mode[1] !== "l" ) {
			this._channelWindows[data.channel].modeCheckboxes[data.mode[1]].suspendEvents();

			// Update window
			this._channelWindows[data.channel].modeCheckboxes[data.mode[1]].setValue( value );

			this._channelWindows[data.channel].modeCheckboxes[data.mode[1]].resumeEvents();

		} else if ( data.mode[1] === "l" ) {
			if ( typeof data.parameter !== "undefined" && data.parameter !== 0 ) {
				value = data.parameter;
			} else {
				value = "";
			}

			this._channelWindows[data.channel].limitInputBox.setValue( value );
		}

		// And notify user
		this._channelWindows[data.channel].addText( '* ' + Ext.htmlEncode( data.nickname ) + ' sets mode ' + Ext.htmlEncode( data.mode ) + ( data.parameter ? " " + Ext.htmlEncode( data.parameter ) : "" ) + ' ' + Ext.htmlEncode( data.channel ) );
	}
}

/**
 * Method used for handling 'RPL_CHANNELMODEIS' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_CHANNELMODEIS = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.channel ) + " " + Ext.htmlEncode( data.mode ) + ( data.params ? " " + Ext.htmlEncode( data.params.join( " " ) ) : "" ) );

	// Find the window, and set or unset modes
	var modes = [ "a" ,"i" ,"m" ,"n" ,"q" ,"p" ,"s" ,"r" ,"t", "k", "l" ];
	if ( typeof this._channelWindows[data.channel] !== "undefined" ) {
		var param = 0;
		for ( var i = 0; i < modes.length; i++ ) {
			if ( modes[i] !== "l" ) {
				this._channelWindows[data.channel].modeCheckboxes[modes[i]].suspendEvents();
				if ( data.mode.indexOf( modes[i] ) === -1 ) {
					this._channelWindows[data.channel].modeCheckboxes[modes[i]].setValue( false );
				} else {
					this._channelWindows[data.channel].modeCheckboxes[modes[i]].setValue( true );
				}
				this._channelWindows[data.channel].modeCheckboxes[modes[i]].resumeEvents();
			} else if ( modes[i] === "l" ) {
				if ( typeof data.params !== "undefined" && typeof data.params[0] !== "undefined" ) {
					value = data.params[param];
				} else {
					value = "";
				}
				this._channelWindows[data.channel].limitInputBox.setValue( value );
				param++;
			}
		}
	}
}

/**
 * Method used for handling 'ERR_UNKNOWNMODE' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.ERR_UNKNOWNMODE = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_UNAWAY' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_UNAWAY = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_NOWAWAY' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_NOWAWAY = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_WHOREPLY' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_WHOREPLY = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.channel !== "" ? data.channel + " " : "" ) + Ext.htmlEncode( data.user ) + " " + Ext.htmlEncode( data.host ) + " " + Ext.htmlEncode( data.server ) + " " + Ext.htmlEncode( data.nick ) + ": " + Ext.htmlEncode( data.realname ) );
}

/**
 * Method used for handling 'RPL_ENDOFWHO' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_ENDOFWHO = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'ERR_UMODEUNKNOWNFLAG' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.ERR_UMODEUNKNOWNFLAG = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'ERR_USERSDONTMATCH' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.ERR_USERSDONTMATCH = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_AWAY' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_AWAY = function( data ) {
	// Add text to window
	this.addText( '* [' + Ext.htmlEncode( data.nick ) + '] ' + "is away: " + data.text );
}

/**
 * Method used for handling 'RPL_LIST' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_LIST = function( data ) {
	// Create if not already in place
	if ( !this._channelListWindow ) {
		this._channelListWindow = new ListWindow( {
			parent: this
			,renderTo: this._config.renderTo
			,taskbar: this._config.taskbar
		} );
	}

	// Show
	this._channelListWindow.listWindow.show();

	var channels = data.channels
		,topics = data.topics
		,users = data.users;

	for ( var i = 0; i < channels.length; i++ ) {
		this._channelListWindow.channelGrid.getStore().insert( 0, {
			users: Ext.htmlEncode( users[i] )
			,channel: Ext.htmlEncode( channels[i] )
			,topic: Ext.htmlEncode( topics[i] )
		} );
	}
}

/**
 * Method used for handling 'RPL_LISTEND' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_LISTEND = function( data ) {
	// Set as listed, so on next request it will be cleared
	if ( this._channelListWindow ) {
		this._channelListWindow.listed = true;
	}

	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_WELCOME' reply, this marks a successful registration event!
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_WELCOME = function( data ) {
	// Set client as 'registered'
	this._registered = true;

	// Unmask the window
	this.chatWindow.unmask();

	// Focus the input field
	this.textField.focus( false, 200 );

	// Display welcome text
	this.addText( '<b>Welcome to ChatJS.</b>' );

	// Add text to window
	this.addText( '*** ' + Ext.htmlEncode( data.msg ) );
}