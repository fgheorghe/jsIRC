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
 * Method used for sorting channel users: first by operator status, then voice, then regular. Each sorted by name.
 * @function
 */
ChannelWindow.prototype.sortUsers = function() {
	// Set sorting
	this.clientList.getStore().sort( [
		{
			property : 'operator'
			,direction: 'desc'
		},{
			property : 'voice'
			,direction: 'desc'
		}, {
			property : 'text'
			,direction: 'asc'
		}
	] );
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
		var node = this.findClient( record.raw.text );
		
		// Create the menu
		var menu = Ext.create( 'Ext.menu.Menu', {
			items: [
				{
					text: 'Give Ops'
					,handler: function() {
						// Issue a 'mode' command
						this._config.parent.parseCommand( "/mode " + this._config.channel + " +o " + record.raw.text );
					}.bind( this )
					,hidden: node.raw.operator === true
				}
				,{
					text: 'Remove Ops'
					,handler: function() {
						// Issue a 'mode' command
						this._config.parent.parseCommand( "/mode " + this._config.channel + " -o " + record.raw.text );
					}.bind( this )
					,hidden: node.raw.operator === false
				}
				,{
					text: 'Give Voice'
					,handler: function() {
						// Issue a 'mode' command
						this._config.parent.parseCommand( "/mode " + this._config.channel + " +v " + record.raw.text );
					}.bind( this )
					,hidden: node.raw.voice === true
				}
				,{
					text: 'Remove Voice'
					,handler: function() {
						// Issue a 'mode' command
						this._config.parent.parseCommand( "/mode " + this._config.channel + " -v " + record.raw.text );
					}.bind( this )
					,hidden: node.raw.voice === false
				}
				,{
					text: 'Kick'
					,handler: function() {
						// Issue a 'kick' command
						this._config.parent.parseCommand( "/kick " + this._config.channel + " " + record.raw.text );
					}.bind( this )
				}
				,{
					text: 'Ban'
					,handler: function() {
						// Issue a 'ban' command, for the nick!user@host mask
						this._config.parent.parseCommand( "/mode " + this._config.channel + " +b " + record.raw.text + "!" + record.raw.user + "@" + record.raw.host );
					}.bind( this )
				}
				,{
					text: 'Kick & Ban'
					,handler: function() {
						// Issue a 'ban' command, for the nick!user@host mask
						this._config.parent.parseCommand( "/mode " + this._config.channel + " +b " + record.raw.text + "!" + record.raw.user + "@" + record.raw.host );

						// Issue a 'kick' command
						this._config.parent.parseCommand( "/kick " + this._config.channel + " " + record.raw.text );
					}.bind( this )
				}
				,'-'
				,{
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
			,fields: [ 'text', 'operator', 'voice' ]
		} )
		,width: 180
		,minWidth: 180
		,frame: false
		,border: false
		,lines: false
		,hideHeaders: true
		,rootVisible: false
		,region: 'east'
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
		this.sortUsers();
	}

	// Method used for adding a new user to the list
	// TODO: Sort by op, voice, non-op etc
	this.addClient = function( client ) {
                client.cls = 'middle-node';
		this.clientList.getRootNode().appendChild( client );
		this.sortUsers();
	}

	// Set 'node' icon (and sort), based on status (operator, voice or none)
	this.setNodeIcon = function( node ) {
		// Set icon
		node.set( 'icon', node.raw.operator === true
                        // https://www.iconfinder.com/icons/80830/business_man_customer_male_icon#size=32
                        ? 'data:image/png;base64,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'
                                : node.raw.voice === true
                                        // https://www.iconfinder.com/icons/80876/male_person_icon#size=32
                                        ? 'data:image/png;base64,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'
                                        // https://www.iconfinder.com/icons/80871/coffee_male_person_icon#size=32
                                        : 'data:image/png;base64,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'
                );

		// Save node properties
		node.set( 'voice', node.raw.voice );
		node.set( 'operator', node.raw.operator );
		node.save();

		// Sort
		this.sortUsers();
	}

	// Set nickname as operator
	// TODO: Remove redundant code
	this.setOperator = function( nickname ) {
		var node = this.findClient( nickname );
		
		node.raw.operator = true;
		this.setNodeIcon( node );
	}

	// Remove operator
	this.removeOperator = function( nickname ) {
		var node = this.findClient( nickname );
		
		node.raw.operator = false;
		this.setNodeIcon( node );
	}

	// Set nickname as voice
	this.setVoice = function( nickname ) {
		var node = this.findClient( nickname );
		
		node.raw.voice = true;
		this.setNodeIcon( node );
	}
	
	// Remove voice
	this.removeVoice = function( nickname ) {
		var node = this.findClient( nickname );
		
		node.raw.voice = false;
		this.setNodeIcon( node );
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
			keydown:  function( field, e, eOpts ) {
                                if ( e.getKey() === 13 ) {
                                        if ( field.getValue().toString().charAt( 0 ) !== "/" ) {
                                                this.addText( "<b>[" + Ext.htmlEncode( this._config.parent._nickname ) + "]</b> " + Ext.htmlEncode( field.getValue() ) );
                                        }
                                        this._config.parent.handleSendText.bind( this._config.parent )( this.textField, this._config.channel );
                                }
                        }.bind( this )
		}
	} );

	// Send button
	this.sendButton = Ext.create( 'Ext.button.Button', {
		text: 'Send'
		,handler: function() {
                        if ( this.textField.getValue().toString().charAt( 0 ) !== "/" ) {
                                this.addText( "<b>[" + Ext.htmlEncode( this._config.parent._nickname ) + "]</b> " + Ext.htmlEncode( this.textField.getValue() ) );
                        }
                        this._config.parent.handleSendText.bind( this._config.parent )( this.textField, this._config.channel );
                }
	} );

	// Topic text
	this.topicText = Ext.create( 'Ext.form.field.Text', {
		width: 560
		,enableKeyEvents: true
		,listeners: {
			keydown: function( field, e, eOpts ) {
				if ( e.getKey() === 13 ) {
					// Set topic
					this._config.parent.parseCommand( "/topic " + this._config.channel + " " + field.getValue() );

					// Get topic...
					// TODO: Handle this differently if a topic change is successful...otherwise it would return something similar to:
					// TODO: * flaviu has changed topic to: test
					// TODO: * Topic for #test is: test
					this._config.parent.client.emit( "TOPIC", {
						channel: this._config.channel
					} );
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
					// Handle /mode command
					this._config.parent.parseCommand( "/mode " + this._config.channel + " " + ( ( value === true ? "+" : "-" ) + mode ) );

					// Emit a 'mode' command, to list modes (in case setting this mode fails)
					this._config.parent.parseCommand( "/mode " + this._config.channel );
				}.bind( this )
			}
		} );
	}

	// Create checkboxes
	var modes = [ "a" ,"i" ,"m" ,"n" ,"q" ,"p" ,"s" ,"r" ,"t" ];
	var modeCheckboxDockItems = [ '->' ];
	this.modeCheckboxes = {};
	for ( var i = 0; i < modes.length; i++ ) {
		this.modeCheckboxes[modes[i]] = createModeCheckbox.bind( this )( modes[i] );
		modeCheckboxDockItems.push( this.modeCheckboxes[modes[i]] );
	}

	// Channel limit box
	this.limitInputBox = Ext.create( 'Ext.form.field.Text', {
		width: 42
		,fieldLabel: 'l'
		,labelWidth: 8
		,labelSeparator: ''
		,enableKeyEvents: true
		,listeners: {
			keydown: function( field, e, eOpts ) {
				if ( e.getKey() === 13 ) {
					// Handle limit change
					this._config.parent.parseCommand( "/mode " + this._config.channel + " " + ( parseInt( field.getValue(), 10 ) ? "+l " + parseInt( field.getValue(), 10 ) : "-l" ) );

					// Emit a 'mode' command, to list modes (in case setting this mode fails)
					this._config.parent.parseCommand( "/mode " + this._config.channel );
				}
			}.bind( this )
		}
	} );

	// Channel key box
	this.keyInputBox = Ext.create( 'Ext.form.field.Text', {
		width: 42
		,fieldLabel: 'k'
		,labelWidth: 8
		,labelSeparator: ''
		,enableKeyEvents: true
		,listeners: {
			keydown: function( field, e, eOpts ) {
				if ( e.getKey() === 13 ) {
					// Handle key change
					this._config.parent.parseCommand( "/mode " + this._config.channel + " " + ( field.getValue() ? "+k " + field.getValue() : "-k" ) );

					// Emit a 'mode' command, to list modes (in case setting this mode fails)
					this._config.parent.parseCommand( "/mode " + this._config.channel );
				}
			}.bind( this )
		}
	} );

	modeCheckboxDockItems.push( this.limitInputBox );
	modeCheckboxDockItems.push( this.keyInputBox );

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

				// If a leftbar is configured, remove button
				if ( this._config.leftbar ) {
					this._config.leftbar.removeItem( this._config.channel );
				}

                                // If a rightbar is configured, remove this user list.
                                if ( this._config.rightbar ) {
                                        this._config.rightbar.removeItem( this.clientList );
                                }
			}.bind( this )
			,render: function() {
				this.textField.focus( false, 200 );

                                // If a rightbar is configured, add user list to it.
                                if ( this._config.rightbar ) {
                                        this._config.rightbar.addItem( this.clientList );
                                }

				// If a leftbar is configured, add button
				if ( this._config.leftbar ) {
                                        this._config.leftbar.addItem( {
                                               text: this._config.channel
                                               ,id: this._config.channel
                                               // https://www.iconfinder.com/icons/34641/comments_forum_icon#size=32
                                               ,icon: 'data:image/png;base64,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'
                                               ,itemclick: function( panel, record, item, index, e, eOpts ) {
                                                       // Focus
                                                       this.chatWindow.show();
                                                       this.textField.focus( false, 200 );
                                               }.bind( this )
                                        } );
                                        this._config.leftbar.selectItem( this._config.channel );
				}
			}.bind( this )
			,activate: function() {
                                // If a rightbar is configured, select this user list.
                                if ( this._config.rightbar ) {
                                        this._config.rightbar.selectItem( this.clientList );
                                }

				// If a leftbar is configured, select button
				if ( this._config.leftbar ) {
                                        this._config.leftbar.selectItem( this._config.channel );
				}
			}.bind( this )
		}
		,items: [
			this.textPanel
		]
	} );
}