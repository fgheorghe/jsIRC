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
var jsIRC = function( config ) {
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

	// Prepare the window
	this.chatWindow = Ext.create( 'Ext.window.Window', {
		title: 'Console'
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
				// If a leftbar is configured, add item
				if ( this._config.leftbar ) {
                                        this._config.leftbar.addItem( {
                                                text: 'Console'
                                                ,id: 'status-window'
                                                // https://www.iconfinder.com/icons/79475/konsole_icon#size=32
                                                ,icon: 'data:image/png;base64,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'
                                                ,itemclick: function( panel, record, item, index, e, eOpts ) {
                                                       // Focus
                                                       this.chatWindow.show();
                                                       this.textField.focus( false, 200 );
                                               }.bind( this )
                                        } );
                                        this._config.leftbar.selectItem( 'status-window' );
				}
			}.bind( this )
			,activate: function() {
                                // Select empty in the rightbar
                                if ( this._config.rightbar ) {
                                        this._config.rightbar.selectEmptyPanel();
                                }
				// If a leftbar is configured, select button
				if ( this._config.leftbar ) {
					// Toggle button
					this._config.leftbar.selectItem( 'status-window' );
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
jsIRC.prototype.findOrCreateQueryWindow = function( nickname ) {
	// Verify if already created
	var queryWindowPosition = this._lcChatNicknames.indexOf( nickname.toLowerCase() )
		,queryWindow;

	if ( queryWindowPosition === -1 ) {
		// Create window
		queryWindow = new ChatWindow( {
			parent: this
			,nickname: nickname
			,renderTo: this._config.renderTo
			,leftbar: this._config.leftbar
			,rightbar: this._config.rightbar
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
jsIRC.prototype.parseCommand = function( text ) {
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

			this.client.emit( command.toUpperCase(), data );
			break;
		case "names":
			// Construct a names command
			if ( parameters.length >= 1 ) {
				// Channel list
				var channels = parameters[0].split( "," );
				data.channels = channels;
			}

			this.client.emit( command.toUpperCase(), data );
			break;
		case "users":
			// NOTE: Command is disabled
			this.client.emit( command.toUpperCase(), data );
			break;
		case "ison":
			// Construct an ison command
			if ( parameters.length >= 1 ) {
				// Channel list
				var nicknames = text.split( " " ).splice( 1 );
				data.nicknames = nicknames;
			}

			this.client.emit( command.toUpperCase(), data );
			break;
		case "userhost":
			// Construct a userhost command
			if ( parameters.length >= 1 ) {
				// Channel list
				var nicknames = text.split( " " ).splice( 1 );
				data.nicknames = nicknames;
			}
			
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
			
			this.client.emit( command.toUpperCase(), data );
			break;
		case "away":
			// Construct an away command
			if ( parameters.length >= 1 ) {
				// Text
				data.text = text.slice( text.indexOf( command ) + command.length + 1 );
			}

			this.client.emit( command.toUpperCase(), data );
			break;
		case "wallops":
			// Construct a wallops command
			if ( parameters.length >= 1 ) {
				// Text
				data.text = text.slice( text.indexOf( command ) + command.length + 1 );
			}

			this.client.emit( command.toUpperCase(), data );
			break;
		case "quit":
			// Construct a quit command
			if ( parameters.length >= 1 ) {
				// Reason
				data.reason = text.slice( text.indexOf( command ) + command.length + 1 );
			}

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

			this.client.emit( command.toUpperCase(), data );
			break;
		case "motd":
			// Construct a motd command
			if ( parameters.length >= 1 ) {
				// Target
				data.target = parameters[0];
			}

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

			this.client.emit( command.toUpperCase(), data );
			break;
		case "kick":
			// Construct a kick command
			// NOTE: Implemented for a single user and channel
			// TODO: Add multiple users and channels

			// Channel
			if ( parameters.length >= 1 ) {
				data.channel = [];
				data.channel.push( parameters[0] );
			}

			// User
			if ( parameters.length >= 2 ) {
				data.user = [];
				data.user.push( parameters[1] );
			}

			// Comment (optional)
			if ( parameters.length >= 3 ) {
				data.comment = "";
				for ( var i = 2; i < parameters.length; i++ ) {
					data.comment += ( i !== 2 ? " " : "" ) + parameters[i];
				}
			}

			this.client.emit( command.toUpperCase(), data );
			break;
		case "version":
			// Construct a version command
			if ( parameters.length >= 1 ) {
				// Target
				data.target = parameters[0];
			}

			this.client.emit( command.toUpperCase(), data );
			break;
		case "time":
			// Construct a time command
			if ( parameters.length >= 1 ) {
				// Target
				data.target = parameters[0];
			}

			this.client.emit( command.toUpperCase(), data );
			break;
		case "admin":
			// Construct an admin command
			if ( parameters.length >= 1 ) {
				// Target
				data.target = parameters[0];
			}

			this.client.emit( command.toUpperCase(), data );
			break;
		case "info":
			// Construct an info command
			if ( parameters.length >= 1 ) {
				// Target
				data.target = parameters[0];
			}

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
			
			this.client.emit( command.toUpperCase(), data );
			break;
		case "nick":
			// Nickname
			if ( parameters.length >= 1 ) {
				// Nickname
				data.nickname = parameters[0];
			}

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
jsIRC.prototype.reconnect = function() {
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
jsIRC.prototype.disconnectHandler = function() {
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
jsIRC.prototype.createNamePrompt = function() {
	this.namePrompt = Ext.Msg.show( {
		title: 'Name'
		,msg: 'Please enter a nickname:'
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
jsIRC.prototype.removeChannelWindow = function( channel ) {
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
jsIRC.prototype.connectHandler = function() {
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
jsIRC.prototype.addText = function( text, noAlert ) {
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
jsIRC.prototype.ERR_NICKNAMEINUSE = function( data ) {
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
jsIRC.prototype.JOIN = function( data ) {
	// Create a new window, if the JOIN command is reffering to the current user AND a window for this channel doesn't exist
	// TODO: Check if channel window exists!
	if ( data.nickname.toLowerCase() === this._nickname.toLowerCase() && typeof this._channelWindows[data.channel] === "undefined" ) {
		// Create window
		this._channelWindows[data.channel] = new ChannelWindow( {
			channel: data.channel
			,parent: this
			,renderTo: this._config.renderTo
			,leftbar: this._config.leftbar
			,rightbar: this._config.rightbar
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
			,operator: false // Upon client join, these are both false
			,voice: false
			,text: Ext.htmlEncode( data.nickname )
                        // https://www.iconfinder.com/icons/80871/coffee_male_person_icon#size=32
			,icon: 'data:image/png;base64,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'
			,user: data.user
			,host: data.host
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
 * Method used for handling 'KICK' event, and close the channel window, or update the client list
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.KICK = function( data ) {
	// If the user being kicked is the same as this user, then display the text accordingly (in the status window)
	if ( data.target.toLowerCase() === this._nickname.toLowerCase() ) {
		this.addText( '* You have been kicked from ' + data.channel + ' by ' + data.nickname + ' (' + Ext.htmlEncode( data.comment ) + ')' );

		// Close channel window
		this._channelWindows[data.channel].chatWindow.close();
	} else {
		// Only display a message, that that user has been kicked, and update the user list
		var channelWindow = this._channelWindows[ data.channel ];

		// Display text
		channelWindow.addText( '* ' + data.nickname + ' has kicked ' + data.target + ' from ' + data.channel + ' (' + Ext.htmlEncode( data.comment ) + ')' );

		// Remove from list of users
		this._channelWindows[data.channel].removeClient( data.target );
	}
}

/**
 * Method used for handling 'PART' event, and close the channel window, or update the client list
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.PART = function( data ) {
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
jsIRC.prototype.ERR_NONICKNAMEGIVEN = function( data ) {
	// Add text to window
	this.addText( '* '  + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'ERR_NOPRIVILEGES' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.ERR_NOPRIVILEGES = function( data ) {
	// Add text to window
	this.addText( '* '  + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'ERR_USERSDISABLED' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.ERR_USERSDISABLED = function( data ) {
	// Add text to window
	this.addText( '* '  + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_BANLIST' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_BANLIST = function( data ) {
	this.addText( '* '  + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'ERR_BANNEDFROMCHAN' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.ERR_BANNEDFROMCHAN = function( data ) {
	this.addText( '* '  + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_ENDOFBANLIST' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_ENDOFBANLIST = function( data ) {
	this.addText( '* '  + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_EXCEPTLIST' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_EXCEPTLIST = function( data ) {
	this.addText( '* '  + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_ENDOFEXCEPTLIST' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_ENDOFEXCEPTLIST = function( data ) {
	this.addText( '* '  + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_TOPIC' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_TOPIC = function( data ) {
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
jsIRC.prototype.RPL_NAMREPLY = function( data ) {
	// Load list of clients, if a window exists
	if ( typeof this._channelWindows[data.channel] !== "undefined" ) {
		var names = [];
		// Convert to tree items
		for ( var i = 0; i < data.names.length; i++ ) {
			names.push( {
				text: Ext.htmlEncode( data.names[i].nick )
				,leaf: true
				,operator: data.names[i].operator
				,voice: data.names[i].voice
				,user: data.names[i].user
				,host: data.names[i].host
				,cls: 'middle-node'
				// TODO: Move to a function
				,icon: data.names[i].operator === true
                                        // https://www.iconfinder.com/icons/80830/business_man_customer_male_icon#size=32
                                        ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAHSElEQVRYR62Xe2yVdxnHv+d+Ts/9cE4vh5aS2o5QpcQq0s2BmrGxRTe3AVoWRZ2XyLYE44IuZnFkE7xEM2ZgjGzZAjZmYc71D7Qmug4GRN2mc4WihfReWjiUnvbcb+95/T6/XraOFkbTX/LkPafn7ft8fs/z/J7n+xpwnbVu3bqGUCh0n8fj+ZTZbK7IZrNaIpEYGB0dbR8bG2vp7OxMXO8Z1/rdMN+PDQ0Nn6Dj/TU1NevpHDabDUajEQQAARCPx3Hp0qWx/v7+r507d65toRBzAqxcubK5qqrqcCAQsJSUlMDhcMBqtSof+Xwe6XRaQSSTSUSjUW14eLixt7e3YyEQVwGUl5d/rq6u7pg4lV2bzGYYDQbofLrJZFJ/04tFBZFKpRCLxRCJRF7u7u7euigA4qd5Q9Pemrq6R8wWG1wuF4J+H8IhHzwOM3p7B/DHU6eRKgATExMYGhoSvxMDAwO+xQLAUOve3Us/3vgTGBl2M81gBLQs458BMjGMRkZw6/ZfIp5MI5fLwWKxYHx8fBmjMnijEHPWQLT9hVbf0tovw2yDgmAKUMwDWRZ8eoKfc/jOz57Hayf+gzwBJDUszlsI8PfFAXj9xX/5li5vhMlCAJqqvjR3H2ckcioajz7dggOtx6FpBQWg6/oXMpnMsUUBiB0/1OsuDS+Hwcznsfwk9AU61rVJAEZj2xPPIZ7O4Fz/CLpHxlAsFpt4Qv65KADjR/de9JZXlHFbk/mfXsUCGZgKwvzuzyexbUMjXj8ziDsffQaFQt7P28YXBWDstT0XfMHSsG7iEWTzIQWKhDEUNQWgF8Sy0PM5tHUM4v7Hn2vXNO22G3Uu989ZhFdeeeI975JQg8EoKSCAMBBAF4ACoyCRIID8bf3Og+l3u/s/zVo8u2gAkZYfH/EFQ1t0o4lNSB5LgiIBUJx0zsIDI/GbV46NHvjL25uHRhPHF+J83gj0Hdz+cHlFeN8kgBBMpUAXAIlCHppuwD/e7dh8++7WVxfqfF6Arl9vDZaFKy9YbXarLgCSf3UtosjdG9icktEo3otkj5/Khu/YtWsXj8bC1rzTsO+3D/4qGArsVE1oaumaBoPVjmQqA0N6HF2l63Gwtf1Iy+HDD/AWntEbX/MCvPTNz/u+9Nm6IZvV6px8rAEGpx9jkQi08cswVq/CnyYq8Ivdu5FIJc6wBzRzQnbeKMK8ACvrPvZ482eqf/SDDSvc4K4nknlEIxfhthph85fhf1UbseOHjyGVToEdUDphwuV0PXW++/zThGCz+GjrKoAQQi5LuWVfOBz+hj8YxJPbt+LKqZcR8DgR9jqR8SyDee0WPLRjJ0aGh9VYTmfSsDvsaFrbhHfefmdg+OLwDgqW1o+CMAsgGAxWOB3ON91ud63NbsPq1avx4N33YPDAHvgqXMg1bsDaB76HPU89iRNvnuAc0GC1WdUsKLJA06k0CI7TpztwKRI5yPb8/etBzAKoXlb9N5/Xd1t0PIqAP4CmW27GXW4PnH9oxXAygcHV9Qh9tRkH9u1Xx1NGcTKVhM/nQ2wihlg8BgGvr6/HyZMnRTF9lwAvXAtiBoC7vqlqaVWX5FPUEAUoNm3ehC0b70DffV/BlYAPt756BFu+vg3FgibDR+XeaDKC4lS1bElHZWWlUkoFHte+vr4LdF59rRMyA1BaWvpQwBfYn8ly8nGVOEpw76b7cW8mh/zRNiRvXoP/Nn4Sh158SQpO3eOjUurp6WF70FUkamtr0dXVBY3NSlJBsSr33sNbj6pjpEarspn1PkCw9Fmq3+0y3zNUvk6nE3WlITx2OY54No0ebwla+Lcsd+mwO5Tzs2fPqgYlQjWeiGPFTStAmY4chxRFLShWJU3P0tvDUwBXQcwA+P3+No/bc6fsTqS3leLTYTbhkVgSWRbYG/zcHwwxMg44XU709vROOmdbltAzhTNyXQDKysqUYOVvb9H5Rpq8P0izmgUxA+B1ezv44FWSS6lu2ZWZUnxdIoYy3tXmWwIToVxuF0Yvj0pbUnmW+0See7weVQvyXeqDkl4VKZvTRTqVUU0tp/QCpdX7qZgBcJY43+I7wBopPoGQirZYrKjJZ+Hn904n+xHFpzz0g5DiLMETIsJUilLgZXm9XgXCfiBFdTctNgUgEFGaalYfPIbLKcH/St1fa+IUlDBKKuwcxVarGTkqIwm5vKAUtSIKemHySn0gjiUiko7pJSmR+5kGzm58i0ZBqaIgEemjqWr/cCf008HzPAGbZJdSWFITFjqle9Xt5LvsTJzLbgv5AgrUCNM7nwaQ1zlZBEjx8lPaFZrMijNTaVC/zzcLvshI/JwdbpWcaYGRUyG7lI6nAAqTUdDy1AezT5Z6sN1ul8jI7ttph2gnaPIWM/cxnInd7A+38+u3CXKXxWzxiCNd0ylGJhvRdD+Y438l1KKQf097gyYNac5xPe80/NBD+YaCNVNWz2slbQnNRJNdSpgjtPO0f0/ZCK8Ujtde/wdqSnpOSrPygwAAAABJRU5ErkJggg=='
                                                : data.names[i].voice === true
                                                        // https://www.iconfinder.com/icons/80876/male_person_icon#size=32
                                                        ? 'data:image/png;base64,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'
                                                        // https://www.iconfinder.com/icons/80871/coffee_male_person_icon#size=32
                                                        : 'data:image/png;base64,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'
			} );
		}
		this._channelWindows[data.channel].loadClientList( names );
		this._channelWindows[data.channel].sortUsers();
	}
}

/**
 * Method used for handling 'RPL_NOTOPIC' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_NOTOPIC = function( data ) {
	// Find channel window, and set to an empty string
	if ( typeof this._channelWindows[data.channel] !== "undefined" ) {
		this._channelWindows[data.channel].topicText.setValue( "" );
	}
}

/**
 * Method used for handling 'ERR_NONICKNAMEGIVEN' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.ERR_NEEDMOREPARAMS = function( data ) {
	// Add text to window
	this.addText( '* '  + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_ENDOFNAMES' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_ENDOFNAMES = function( data ) {
	// Add text to window
	this.addText( '* '  + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'ERR_NOSUCHCHANNEL' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.ERR_NOSUCHCHANNEL = function( data ) {
	// Add text to window
	this.addText( '* '  + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'ERR_ALREADYREGISTRED' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.ERR_ALREADYREGISTRED = function( data ) {
	// Add text to window
	this.addText( '* '  + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_VERSION' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_VERSION = function( data ) {
	// Add text to window
	this.addText( '* '  + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'ERR_NOSUCHNICK' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.ERR_NOSUCHNICK = function( data ) {
	// Add text to window
	this.addText( '* '  + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'PRIVMSG' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.PRIVMSG = function( data ) {
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
jsIRC.prototype.RPL_ENDOFWHOIS = function( data ) {
	// Add text to window
	this.addText( '* [' + Ext.htmlEncode( data.nick ) + '] End of WHOIS list' );
}

/**
 * Method used for handling 'RPL_WHOISIDLE' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_WHOISIDLE = function( data ) {
	// Add text to window
	this.addText( '* [' + Ext.htmlEncode( data.nick ) + '] ' + Ext.htmlEncode( data.idle ) + ' :seconds idle' );
}

/**
 * Method used for handling 'ERR_NOTONCHANNEL' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.ERR_NOTONCHANNEL = function( data ) {
	// Add text to window
	this.addText( '* '  + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_INVITELIST' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_INVITELIST = function( data ) {
	// Add text to window
	this.addText( '* '  + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_ENDOFINVITELIST' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_ENDOFINVITELIST = function( data ) {
	// Add text to window
	this.addText( '* '  + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'INVITE' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.INVITE = function( data ) {
	// Add text to window
	this.addText( '* [' + Ext.htmlEncode( data.nick ) + '] ' + Ext.htmlEncode( data.user ) + '@' + Ext.htmlEncode( data.host ) + ' invites you to join '  + Ext.htmlEncode( data.channel ) );
}

/**
 * Method used for handling 'RPL_INVITING' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_INVITING = function( data ) {
	// Add text to window
	this.addText( '* '  + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'ERR_USERONCHANNEL' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.ERR_USERONCHANNEL = function( data ) {
	// Add text to window
	this.addText( '* '  + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_WHOISUSER' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_WHOISUSER = function( data ) {
	// Add text to window
	this.addText( '* [' + Ext.htmlEncode( data.nick ) + '] (' + Ext.htmlEncode( data.user ) + '@' + Ext.htmlEncode( data.host ) + '): '  + Ext.htmlEncode( data.realname ) );
}

/**
 * Method used for handling 'RPL_WHOISSERVER' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_WHOISSERVER = function( data ) {
	// Add text to window
	this.addText( '* [' + Ext.htmlEncode( data.nick ) + '] ' + Ext.htmlEncode( data.server ) + ' :' + Ext.htmlEncode( data.serverinfo ) );
}

/**
 * Method used for handling 'WALLOPS' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.WALLOPS = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.server ) + ' :' + Ext.htmlEncode( data.text ) );
}

/**
 * Method used for handling 'RPL_WHOISCHANNELS' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_WHOISCHANNELS = function( data ) {
	// Add text to window
	this.addText( '* [' + Ext.htmlEncode( data.nick ) + '] ' + Ext.htmlEncode( data.channels.join( " " ) ) );
}

/**
 * Method used for handling 'QUIT' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.QUIT = function( data ) {
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
jsIRC.prototype.NICK = function( data ) {
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
}

/**
 * Method used for handling 'RPL_MYINFO' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_MYINFO = function( data ) {
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
jsIRC.prototype.RPL_CREATED = function( data ) {
	// Add text to window
	this.addText( '*** ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_YOURHOST' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_YOURHOST = function( data ) {
	// Add text to window
	this.addText( '*** ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'ERR_NORECIPIENT' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.ERR_NORECIPIENT = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_USERHOST' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_USERHOST = function( data ) {
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
jsIRC.prototype.RPL_ISON = function( data ) {
	// Add text to window
	this.addText( '* ISON: ' + Ext.htmlEncode( data.nicknames.join( " " ) ) );
}

/**
 * Method used for handling 'PING' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.PING = function( data ) {
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
jsIRC.prototype.ERR_NOTEXTTOSEND = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_MOTDSTART' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_MOTDSTART = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_MOTD' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_MOTD = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_INFO' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_INFO = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_ENDOFINFO' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_ENDOFINFO = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_TIME' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_TIME = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_ADMINME' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_ADMINME = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_ADMINLOC1' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_ADMINLOC1 = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_ADMINLOC2' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_ADMINLOC2 = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_ADMINEMAIL' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_ADMINEMAIL = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'ERR_ERRONEUSNICKNAME' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.ERR_ERRONEUSNICKNAME = function( data ) {
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
jsIRC.prototype.RPL_ENDOFMOTD = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'ERR_NOMOTD' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.ERR_NOMOTD = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_LUSERCLIENT' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_LUSERCLIENT = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_LUSEROP' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_LUSEROP = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_LUSERUNKOWN' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_LUSERUNKOWN = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_LUSERCHANNELS' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_LUSERCHANNELS = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_LUSERME' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_LUSERME = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_YOUREOPER' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_YOUREOPER = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'ERR_PASSWDMISMATCH' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.ERR_PASSWDMISMATCH = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_WHOISOPERATOR' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_WHOISOPERATOR = function( data ) {
	// Add text to window
	this.addText( '* [' + Ext.htmlEncode( data.nick ) + '] ' + "is an IRC operator" );
}

/**
 * Method used for handling 'RPL_UMODEIS' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_UMODEIS = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'ERR_INVITEONLYCHAN' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.ERR_INVITEONLYCHAN = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'ERR_CHANNELISFULL' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.ERR_CHANNELISFULL = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'ERR_BADCHANNELKEY' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.ERR_BADCHANNELKEY = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'MODE' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.MODE = function( data ) {
	if ( typeof this._channelWindows[data.channel] !== "undefined" ) {
		// Get set or remove type of update
		var value = data.mode[0] === "+";

		if ( data.mode[1] !== "l" && data.mode[1] !== "k" && data.mode[1] !== "o" && data.mode[1] !== "v" && data.mode[1] !== "b" && data.mode[1] !== "e" ) {
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
		} else if ( data.mode[1] === "k" ) {
			if ( typeof data.parameter !== "undefined" && data.parameter !== 0 ) {
				value = data.parameter;
			} else {
				value = "";
			}
			
			this._channelWindows[data.channel].keyInputBox.setValue( value );
		} else if ( data.mode[1] === "o" ) {
			// Set client operator mode
			if ( data.mode[0] === "+" ) {
				this._channelWindows[data.channel].setOperator( data.parameter );
			} else {
				this._channelWindows[data.channel].removeOperator( data.parameter );
			}
		} else if ( data.mode[1] === "v" ) {
			// Set client voice mode
			if ( data.mode[0] === "+" ) {
				this._channelWindows[data.channel].setVoice( data.parameter );
			} else {
				this._channelWindows[data.channel].removeVoice( data.parameter );
			}
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
jsIRC.prototype.RPL_CHANNELMODEIS = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.channel ) + " " + Ext.htmlEncode( data.mode ) + ( data.params ? " " + Ext.htmlEncode( data.params.join( " " ) ) : "" ) );

	// Find the window, and set or unset modes
	var modes = [ "a" ,"i" ,"m" ,"n" ,"q" ,"p" ,"s" ,"r" ,"t", "k", "l" ];
	if ( typeof this._channelWindows[data.channel] !== "undefined" ) {
		var param = 0;
		for ( var i = 0; i < modes.length; i++ ) {
			if ( modes[i] !== "l" && modes[i] !== "k" ) {
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
			} else if ( modes[i] === "k" ) {
				if ( typeof data.params !== "undefined" && typeof data.params[0] !== "undefined" ) {
					value = data.params[param];
				} else {
					value = "";
				}
				this._channelWindows[data.channel].keyInputBox.setValue( value );
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
jsIRC.prototype.ERR_UNKNOWNMODE = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'ERR_USERNOTINCHANNEL' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.ERR_USERNOTINCHANNEL = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'ERR_CHANOPRIVSNEEDED' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.ERR_CHANOPRIVSNEEDED = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_UNAWAY' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_UNAWAY = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_NOWAWAY' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_NOWAWAY = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_WHOREPLY' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_WHOREPLY = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.channel !== "" ? data.channel + " " : "" ) + Ext.htmlEncode( data.user ) + " " + Ext.htmlEncode( data.host ) + " " + Ext.htmlEncode( data.server ) + " " + Ext.htmlEncode( data.nick ) + " " + ( data.away ? "G" : "H" ) + " :" + Ext.htmlEncode( data.hopcount ) + " " + Ext.htmlEncode( data.realname ) );
}

/**
 * Method used for handling 'RPL_ENDOFWHO' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_ENDOFWHO = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'ERR_CANNOTSENDTOCHAN' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.ERR_CANNOTSENDTOCHAN = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'ERR_UMODEUNKNOWNFLAG' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.ERR_UMODEUNKNOWNFLAG = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'ERR_USERSDONTMATCH' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.ERR_USERSDONTMATCH = function( data ) {
	// Add text to window
	this.addText( '* ' + Ext.htmlEncode( data.msg ) );
}

/**
 * Method used for handling 'RPL_AWAY' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_AWAY = function( data ) {
	// Add text to window
	this.addText( '* [' + Ext.htmlEncode( data.nick ) + '] ' + "is away: " + data.text );
}

/**
 * Method used for handling 'RPL_LIST' event.
 * @param {Object} data Data object.
 * @function
 */
jsIRC.prototype.RPL_LIST = function( data ) {
	// Create if not already in place
	if ( !this._channelListWindow ) {
		this._channelListWindow = new ListWindow( {
			parent: this
			,renderTo: this._config.renderTo
			,leftbar: this._config.leftbar
                        ,rightbar: this._config.rightbar
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
jsIRC.prototype.RPL_LISTEND = function( data ) {
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
jsIRC.prototype.RPL_WELCOME = function( data ) {
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

	// Join channel, if the url points to something similar to http://domain/#channel
	// TODO: Move code to proper location
	var documentLocation = location.href
		// TODO: Make use of CHANNEL_NAME_PATTERN
		,channelName = /[#&+!]+[a-zA-Z0-9\-\_]+/.exec( documentLocation );
	if ( channelName ) {
		// Emit a join command
		this.parseCommand( "/join " + channelName );
	}
	
}
