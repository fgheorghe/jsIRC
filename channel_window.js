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
 * Channel window.
 * @class Provides channel functionality.
 * @constructor
 * @param {Object} config Channel window configuration object. Required key: channel (channel name string).
 */
var ChannelWindow = function( config ) {
	// Store configuation, in a 'private' property
	this._config = config;

	// Load 'everything'
	this.init();

	return this;
}

/**
 * Method used for appending text.
 * TODO: Clean redundant code!
 * @param {String} text String to add to window.
 * @function
 */
ChannelWindow.prototype.addText = function( text, noAlert ) {
	// Apply extra formats
	text = Ext.util.Format.nl2br( text );

	// Convert links
	text = text.replace( /(\b(https?):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig, "<a href='$1' target='_blank'>$1</a>" );

	this.textPanel.body.insertHtml( "beforeEnd", text + '<br>' );
	this.textPanel.body.scroll( 'b', Infinity );

	// If the window is blured (user switched to another tab), flash the title
	if ( !this._config.parent._windowFocus && !noAlert ) {
		$.titleAlert( "New chat message!", {
			stopOnFocus: true
			,duration: 4000
			,interval: 700
		} );
	}
}

/**
 * Method used for initiating the channel window.
 * @function
 */
ChannelWindow.prototype.init = function() {
	// Nick name double click event (default to query)
	this.userListItemDblClick = function( tree, record, item, index, e, eOpts ) {
		// Issue a 'query' command
		this._config.parent.parseCommand( "/query " + record.raw.text );
	}

	// Context menu handler
	this.userListContextMenu = function( tree, record, item, index, e, eOpts ) {
		// Create the menu
		var menu = Ext.create( 'Ext.menu.Menu', {
			items: [
				{
					text: 'Query'
					,handler: function() {
						// Issue a 'query' command
						this._config.parent.parseCommand( "/query " + record.raw.text );
					}.bind( this )
				}
				,{
					text: 'Whois'
					,handler: function() {
						// Issue a 'whois' command
						this._config.parent.parseCommand( "/whois " + record.raw.text );
					}.bind( this )
				}
			]
		} );

		// Display menu
		menu.showAt( e.getXY() );

		// Prevent default browser right click behaviour
		e.preventDefault();
	}

	// Prepare the client list
	this.clientList = Ext.create( 'Ext.tree.Panel', {
		store: Ext.create( 'Ext.data.TreeStore', {
			data: {
				children: []
			}
		} )
		,width: 180
		,minWidth: 180
		,resizable: true
		,frame: false
		,border: true
		,lines: false
		,hideHeaders: true
		,collapsible: true
		,rootVisible: false
		,region: 'east'
		,title: 'Users'
		,listeners: {
			itemcontextmenu: this.userListContextMenu.bind( this )
			,itemdblclick: this.userListItemDblClick.bind( this )
		}
	} );

	// Method used for loading channels users
	this.loadClientList = function( list ) {
		this.clientList.getRootNode().removeAll( false );
		this.clientList.getRootNode().appendChild( list );
	}

	// Method used for replacing a 'client' (change nickname that is)
	this.replaceClient = function( initialNickname, nickname ) {
		var node = this.findClient( initialNickname );
		node.set( 'text', Ext.htmlEncode( nickname ) );
		node.raw.text = Ext.htmlEncode( nickname );
		node.save();
	}

	// Method used for adding a new user to the list
	// TODO: Sort by op, voice, non-op etc
	this.addClient = function( client ) {
		this.clientList.getRootNode().appendChild( client );
	}

	// Method used for removing a user from the list
	this.removeClient = function( nickname ) {
		var node = this.findClient( nickname );

		this.clientList.getRootNode().removeChild( node, true );
	}

	// Method used for finding if a user is in the window's list
	this.findClient = function( nickname ) {
		return this.clientList.getRootNode().findChildBy( function( _node ) {
			if ( _node.data.text.toLowerCase() === nickname.toLowerCase() ) {
				return true;
			}
			return false;
		} );
	}

	// Text field
	this.textField = Ext.create( 'Ext.form.field.Text', {
		width: 560
		,enableKeyEvents: true
		,listeners: {
			keydown: function( field, e, eOpts ) {
				if ( e.getKey() === 13 ) {
					this._config.parent.handleSendText.bind( this._config.parent )( this.textField, this._config.channel );
				}
			}.bind( this )
		}
	} );

	// Send button
	this.sendButton = Ext.create( 'Ext.button.Button', {
		text: 'Send'
		,handler: this._config.parent.handleSendText.bind( this._config.parent, [ this.textField, this._config.channel ] )
	} );

	// Topic text
	this.topicText = Ext.create( 'Ext.form.field.Text', {
		width: 560
		,enableKeyEvents: true
		,listeners: {
			keydown: function( field, e, eOpts ) {
				if ( e.getKey() === 13 ) {
					// TODO: Handle failed topic update
					this._config.parent.parseCommand( "/topic " + this._config.channel + " " + field.getValue() );
				}
			}.bind( this )
		}
	} );

	// Method used for creating a new mode checkbox
	var createModeCheckbox = function( mode ) {
		return Ext.create( 'Ext.form.field.Checkbox', {
			fieldLabel: mode
			,labelAlign: 'right'
			,labelWidth: 8
			,labelSeparator: ''
			,listeners: {
				change: function( checkbox, value ) {
					// Set or remove the mode
					console.log( "called" )
					this._config.parent.client.emit(
						'MODE'
						,{
							target: this._config.channel
							,modes: [ ( value === true ? "+" : "-" ) + mode ]
						}
					);
				}.bind( this )
			}
		} );
	}

	// Create checkboxes
	var modes = [ "a" ,"i" ,"m" ,"n" ,"q" ,"p" ,"s" ,"r" ,"t" ];
	var modeCheckboxDockItems = [];
	this.modeCheckboxes = {};
	for ( var i = 0; i < modes.length; i++ ) {
		this.modeCheckboxes[modes[i]] = createModeCheckbox.bind( this )( modes[i] );
		modeCheckboxDockItems.push( this.modeCheckboxes[modes[i]] );
	}

	// Prepare the text window
	this.textPanel = Ext.create( 'Ext.panel.Panel', {
		region: 'center'
		,border: true
		,frame: false
		,dockedItems: [
			{
				xtype: 'toolbar'
				,dock: 'top'
				,items: [
					this.topicText
				]
			}
			,{
				xtype: 'toolbar'
				,dock: 'top'
				,items: modeCheckboxDockItems
			}
			
		]
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

				// Resize topic field
				this.topicText.setWidth(
					this.textPanel.getWidth() - 6
				);
			}.bind( this )
		}
	} );

	// Prepare taskbar button
	this.taskbarButton = Ext.create( 'Ext.button.Button', {
		text: Ext.htmlEncode( this._config.channel )
		,enableToggle: true
		,depressed: true
		,toggleGroup: 'taskList'
		,autoDestroy: false
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
		title: Ext.htmlEncode( this._config.channel )
		,closable: true
		,maximizable: true
		,minimizable: true
		,resizable: true
		,constrain: true
		,renderTo: typeof this._config.renderTo !== "undefined" ? this._config.renderTo.getEl() : document.body
		,height: 500
		,width: 800
		,layout: 'border'
		,listeners: {
			close: function() {
				// Emit a part command
				this._config.parent.client.emit( 'PART', {
					channels: [ this._config.channel ]
				} );

				// Remove from window array
				this._config.parent.removeChannelWindow( this._config.channel );

				// If a taskbar is configured, remove button
				if ( this._config.taskbar ) {
					this._config.taskbar.toolbar.remove( this.taskbarButton );
				}
			}.bind( this )
			,render: function() {
				this.textField.focus( false, 200 );

				// If a taskbar is configured, add button
				if ( this._config.taskbar ) {
					this._config.taskbar.toolbar.add( this.taskbarButton );
				}
			}.bind( this )
			,activate: function() {
				// If a taskbar is configured, toggle button
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
		,items: [
			this.clientList
			,this.textPanel
		]
	} );
}