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
		this.clientList.getRootNode().appendChild( client );
		this.sortUsers();
	}

	// Set 'node' icon (and sort), based on status (operator, voice or none)
	this.setNodeIcon = function( node ) {
		// Set icon
		node.set( 'icon', node.raw.operator === true ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAADQklEQVQ4T2WTf0yMcRzH3/c8z13XXVfpl34RGm6z1swmQyxOG3PMr01kfjVaW2IhCdFY9Qf/CJthaMiPtf4wDMXCIpYf4XLVleiu3Lku9+O5e376OjPRd3v23b7P83l93s/n/f4q8N+6sQaq8fGx1TEzluXoJqZHK+kAZe9+7bt7p/lVw9Ovux73483IEsX/gPaq6c8mrT8zW5OcAchegLUCnA1wf0L9+VpP2cknqzqcuP+n7h9AW3nykakbag5pUg0AL5DnBwEM/oaIbkDhQsX+Glv5lQ49AZCX5Gikgp7aZV0pi/ekKqAGKBUg8aS7Ewg4ILAu0EoZL5sb5bW76wt7hnBqFMB0efkX/cLcZIgUQSsJgKgQvYTjJYI4CLwbbS1PkHf4fpV5UCodBbhQEHM1J39njlqbQIoEyJAgSyIEUYDP7wHnMOF8XZNQfsmWKwLXRwHSF+QnFRs585rMeA2UOgigwfMcAu7v8A58RHuvFwXH25ttjuH5o4YYlyePzZ6JmylSx9yVqU0KYfAFVIKLDMmPQbsHrsh0tLEb0e9gXbfrzm52ma81/FVgtGryFke37lgUmEYp1JAilTC9syCuYhXU3R9gKruOQOYK6MnIE8KA28/MfEn+pvXicMvNoAtphb6qo1vpknHhHFKTtJBkBUSZh3V7PlzPW5FYX4+oqZMRTr7udQTgkkJw4NBZ+71z29OCgNXV3v5cI5MYHkIhKoxBmJYY4LZDVVYKqrsTzgPHoMuaiz6bHX42AjKxuOWVFZVb5h0MAtbVsHzWHBWjU1EIZQA1kUnZejDpaDFCP1vwNm8fqHVr8b6nEz+cyZg4NhSWzz6c2GJoCAIWVQq8wUAzDPHmF4AOByJaHyCzuggqSxcebiqFv/gIvCRTfd+A+Higw8ziYkHWnSAgcWnTJ2NR1pQxGoAh2aHIHmExYf7pElj7LHizrQKyYSVkP/k1kjE/ydjD2ndoO5Vd8zvK2gXZSQv33kpbYtBFJ9DQkCQzZA4Uz0PgRDCRxBkPuRIEMExUmJ++hamu2CwNNxpH3IUJemWUvlw7LmOWJjZGp9SqaSqEoSiagszy4FlO9jmHOE//+6HAwKNGSAOVpPWXnzVHYsT1SsA5AAAAAElFTkSuQmCC' : node.raw.voice === true ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAADG0lEQVQ4T42TeUhUURTGv/dm3jyXGTKbKcXSxLHF/MOooGgnTUocNcuijMbU0hYoBMkWUcoyaCHayCS3SjJNihYJirJNTCowQ62JqGkqG3Wc0ZnnvK3rRFFZ0IEL9557vh+H79xL4T9CO/5yQVzC2MyoqFE6W58o3rr5zNR8uzYfqL9C/arPi9Et9Q8IXQlK9nrQ3HrzWjtXoZ3auCd12+TCjGQt5UuKJaJosQB7829wL6s3rPoJKErRF0Svyd0ZPn0OoxA/4nVTg7ivqLz6w8RzM437DHrGAShJtSQBQ6RXJhkl6XH3PIBd0Zo5CVk7785I3sEATsDRSbJmtFytk/PqAvuX7S7QBPmrwNIkTRQMAdxo6MbJzbF3PYALebNPxWfmZmsCIwCOAFykx8HPZG9BSvbVbsw8p960fQor9AOCDDxpMqH0QLHV0lZq9ACuFy+qWpC0OlXFaiG4Ochu0q/IgRbMyMq/Z79mSekJHWPzGfj60cYLkmx+29zudrQdItKHHsDGWP+0nPXLS30nxNPqoGlglCp8ev0cvS2HseXIg9YmE78acHeT0qE1FO4f5n83MRJhewzTWo2zYrzp0GhAwcD6uAr17Q3Yf8Z8GnZs+te0KSyA1hCffD8pxhAx2tYJRU0N0OPAmxV6cPr5eHH9a9/5whIDODT+DUIFZ4Sfqdh9bMOMkHl4L3FgDh4FLFZ8OZqNScpAfHaYkbYuq/Np/dOpBEAc/j2o5GNJXblGo06rCMEIdjRkp0xmLYLV+MLp7kW34gNKKi9Kx7POpkJE9TBA+qUUPnHhXKWXNApqpS8YVg2aosFzLjglJ3iVHXcePcGRNZUneNvg1mGAxLJoIW5JhELh9IOXwgcMzZK3QkGUBXCiC9AM4H5jG8rXNlRIA7xxGCB4pf7d8vywEJ2fBoxAOqBUgEwAtACBdsHOO1Ff1C63ne3IIWJi0B8ewMcncdxiXdmkWH+/kQEsWC+l573yvAB7lxsdjb2SqdbSBCeXQC6swwHfM5Hw9k5n1XQ4raKHPh0lCbI4OCD2od/1iJzLyOr52xi/ATaEOwRqk65OAAAAAElFTkSuQmCC' : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAADF0lEQVQ4T32TXUiTURjH/9v77luazelsfmC6aW1DzEpLV5GoWULILgwJwoxuooK6DLswDbqwi+iqoCCVNIzSikrDwnRJocsU5/c2J36+zX35bmufvQ0KM+lcnvP8f5zznN/DwhZLq9VuL2IWQRCZVqvVaTQauwcGBmaZ0sjmctbmDSacqtPpbkul0hNMWDg5ORmiKGpMIpE8ZUB3h4eHHRszmwFkZWXlbbVafdlsNsNkMmFpeRkCPh95eXlBBnSxs7Pz3v8A8oKCgi42m62Zn5/Hmt0OlXIndikzMLdsQzAYau7v7z/HAAK/IX/dICM5XhFicbsomz2deT8OFx7A9dpaKBQZuFl/Ax/7+l8sjhirFgHPloCZJ/UV3dO2xx2DVkFmWiqOHC1CfIIMfq8HM9MTyCRWzXz/2nHthTuTWwLe3Tp7LHZ3ziNLVoUMPBHEYQ/8IOBjcUDS36EyvzG86uw+dfVB18yWgNM6XbKuJPdW1r7cKh9fzE6HCzbwsQIRiBWLR9/b1/j8vaFRr9e7/wE0NTVpxHHxDQ6nu1RBmAUH5SRYLB7AdMnnp9Ey5IRpPcaRII1tXqBWGhrr6lZ/QaJNrKm5KD9SpG0lSOIw7QtCxFvAoZTP4NtViLC9sMVY0TOhhdMVQsDvi3jp9Xvtj5uvWCwWXxTQ1lau4/H2t7o9Ci5PKIEohgOJyAKaTgab8IPLtcPmToXb5YTPNYXYbYZF2jtaWl1tHIsC3r5Wn1HvIB86ltWEm1cMrjgTHEE8CIIbdTcY8MPvWQTp7EMc6w0iUpr6YAiU1dSMG6KAS5cUe44XyJrkXI5GFscBIY0DS5qECLmXsT+AyI9RgLIibFuAiRJi2k68uN/y9fynTyurv0Xi5OcXlpwsSrtWVijIT0jykXwZwOZpGLwXYc84PEsczJq20e09jre9+umbRuPgN+YwvNFEUqnUKMvLi3U52RnFcnlMmlAkEjHWht0ut3PO4hr/MjT1srXjWZd3bY2REeE/v7BpIoVisThRpcpOSUyUxTL+h+bmrNTIyPg8YzC1cQ5+5X4CP3FLIFINpycAAAAASUVORK5CYII=' );

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
                                               ,icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAADf0lEQVQ4T3XTXWhbdRQA8PO/X/lo0qQ2TUk3uph9GNrRFSs6vysTmY4yJvZBpr4Mij6odIP5UdC+CAOnqzAfMpGBCIONTdeHobC6js0SJDVRG5emtE2T5vYmvbk3N1/3f29u7t9UbR6UnZfzcA4/zuH/Pwj+jdXoRbdOtF0VZcOmlIpyWVzlj56YLm/X75fRViFyK+Tp6OBOqBX5SEHaaBNzQj6zlr/28+L6pStX4pWxsTE2mUyS2dlZ47/QFoB+unxyhLXZztWxHlBLVeD5vJxY3jhbtwanOZenr6Qo/rKiqKVSaU4QhN/n5+fr2xC6/OWoA4CbcLd7x3f5+yxIM2BlcSkRTWY/4rqDBzHWj4uy3M4LYkOU5JlqVf4gHP71XgsInR3xcCb96Y6u3W8M7H+EamAMS4uLS6v85lQgsO9l3TAOZXmehOMZtJAqpLGmvROJRK63gHOTw27A9GSHo/OtA8EDLEczkFhaltI58cazBx99mKFQP8+vk/AfqyicFLOior0biUavtoDRUaD3eB4fsXHWM8Ee/z67xY4TqbUVuVSde2pw/xMMQ/cXZYmsZXMknhJvL/L45FwsHmsBX18/7ZR06ZVKuvC+r8rsBZ2o0WL+N6uFvjtg63yOMWFIVTEqyEUlKxY/vrGwEEqlALeAi7cm3tRN7e1aufKQU0QIVRn4U+V106qJLkEn3KbWZWDVUlFxBVu9n0veI6Fvp8aFJkC2EPTVzfd+MaE+iOuYsRInuLgApAtxKJQFkyp7FUu2RuuZmNPkXGDufSljdg38UMjlv/nxwlSM5+dV9Nm1sbxJmZ4GMREFFui0B0EqpUCqGsTleNFoK0oAGzFad+9BxDcEWoPScrn83XQy8cn358fvoNOhY1ebszyGEHERgig73Q01vdIw6CDt8xy27rSbyGFvA6FuBYpmQVOrKMMLeH0tfT4yN3MGHZ98uo8iaBCZZq9JwMKBzcR1quHqHn3e193/jN/NUZTNDUWDRiyNAKvNn5rbJJnl5ZuR2e8m/r6FZlAw1HxOL1CWNBB6xwvs0JOvv+bxek/1etofNFkHo1MsUM1urNZAkosgrK2EY7enP9wG/ndsw6+e8vQGAof8vp0jDYuzH7HsA4ggRsWqUS4rkpTjp5PROxfuC/wjDjOjY8M9rNu5m2XtPaS5jKEZaq1WypYLwr2ZS1/k/wKvm8i5pI+BtwAAAABJRU5ErkJggg=='
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