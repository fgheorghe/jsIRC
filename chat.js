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
 * @class Provides chat functionality.
 * @constructor
 */
var ChatJs = function() {
	// Client id array
	this._clients = [];

	// 'Array' of channel windows
	this._channelWindows = {};

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

	// Create the UI as soon as ExtJS is ready
	Ext.onReady( function() {
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
			,handler: this.handleSendText.bind( this )
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
			title: 'Status'
			,closable: false
			,maximizable: true
			,minimizable: false
			,resizable: true
			,constrainHeader: true
			,height: 500
			,width: 800
			,layout: 'fit'
			,items: [
				this.textPanel
			]
		} );

		// Show
		this.chatWindow.show();

		// Mask, until a connection is made
		this.chatWindow.mask();
	}.bind( this ) );
};

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
		case "motd":
			// Construct a privmsg command
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
		default:
			// TODO:
			break;
	}
}

/**
 * Method used for handling a lost connection.
 * @function
 */
ChatJs.prototype.disconnectHandler = function() {
	// Just display an error window
	Ext.Msg.show( {
		title: 'Error'
		,msg: 'Connection lost. Please reload the page.'
		,closable: false
		,width: 255
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
		,hideModel: 'hide'
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
 * @function
 */
ChatJs.prototype.addText = function( text ) {
	// Apply extra formats
	text = Ext.util.Format.nl2br( text );

	// Convert links
	text = text.replace( /(\b(https?):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig, "<a href='$1' target='_blank'>$1</a>" );

	this.textPanel.body.insertHtml( "beforeEnd", text + '<br>' );
	this.textPanel.body.scroll( 'b', Infinity );

	// If the window is blured (user switched to another tab), flash the title
	if ( !this._windowFocus ) {
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
		} );

		// Show window
		this._channelWindows[data.channel].chatWindow.show();
	} else if ( data.nickname.toLowerCase() === this._nickname.toLowerCase() && this._channelWindows[data.channel] ) {
		// Just focus
		this._channelWindows[data.channel].chatWindow.focus();
	} else if ( data.nickname.toLowerCase() !== this._nickname.toLowerCase() && this._channelWindows[data.channel] ) {
		// Append text
		this._channelWindows[data.channel].addText( "* " + Ext.htmlEncode( data.nickname ) + " (" + Ext.htmlEncode( data.user ) + "@" + Ext.htmlEncode( data.host ) + ") has joined " + Ext.htmlEncode( data.channel ) );
		// Append to user list
		this._channelWindows[data.channel].addClient( {
			leaf: true
			,text: Ext.htmlEncode( data.nickname )
		} );
	}

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
		this._channelWindows[data.channel].addText( "* " + Ext.htmlEncode( data.nickname ) + " (" + Ext.htmlEncode( data.user ) + "@" + Ext.htmlEncode( data.host ) + ") has left " + Ext.htmlEncode( data.channel ) );

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
 * Method used for handling 'RPL_TOPIC' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_TOPIC = function( data ) {
	console.log( data );
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
 * Method used for handling 'ERR_NOSUCHCHANNEL' event.
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.ERR_NOSUCHCHANNEL = function( data ) {
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
	// Find a channel window
	// TODO: Add private user message
	// TODO: Handle non existing channel/user windows
	if ( typeof this._channelWindows[data.target] !== "undefined" ) {
		this._channelWindows[data.target].addText( "<b>[" + Ext.htmlEncode( data.nickname ) + "]</b> " + Ext.htmlEncode( data.message ) );
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
			this._channelWindows[ channel ].addText( "* " + Ext.htmlEncode( data.nickname ) + " (" + Ext.htmlEncode( data.user ) + "@" + Ext.htmlEncode( data.host ) + ") has quit (" + Ext.htmlEncode( data.reason ) + ")" );
			this._channelWindows[ channel ].removeClient( data.nickname );
		}
	}
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
 * Method used for handling 'RPL_WELCOME' reply, this marks a successful registration event!
 * @param {Object} data Data object.
 * @function
 */
ChatJs.prototype.RPL_WELCOME = function( data ) {
	// Unmask the window
	this.chatWindow.unmask();

	// Focus the input field
	this.textField.focus( false, 200 );

	// Display welcome text
	this.addText( '<b>Welcome to ChatJS.</b>' );

	// Add text to window
	this.addText( '*** ' + Ext.htmlEncode( data.msg ) );
}