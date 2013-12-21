/**
 * Copyright (c) 2013, Grosan Flaviu Gheorghe
 * All rights reserved.
 * 
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * Redistributions of source code must retain the above copyright
 *      notice, this list of conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright
 *      notice, this list of conditions and the following disclaimer in the
 *      documentation and/or other materials provided with the distribution.
 * Neither the name of the author nor the
 *      names of its contributors may be used to endorse or promote products
 *      derived from this software without specific prior written permission.
 * 
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL GROSAN FLAVIU GHEORGHE BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * Chat window.
 * @class Provides client to client chat functionality.
 * @constructor
 * @param {Object} config Chat window configuration object. Required key: nickname (client nickname string).
 */
var ChatWindow = function( config ) {
	// Store configuation, in a 'private' property
	this._config = config;
	
	// Load 'everything'
	this.init();
	
	return this;
}

/**
 * Method used for initiating the chat window.
 * @function
 */
ChatWindow.prototype.init = function() {
	// Text field
	this.textField = Ext.create( 'Ext.form.field.Text', {
		width: 560
		,enableKeyEvents: true
		,listeners: {
			keydown: function( field, e, eOpts ) {
				if ( e.getKey() === 13 ) {
					if ( field.getValue().toString().charAt( 0 ) !== "/" ) {
						this.addText( "<b>[" + this._config.parent.getTimeStamp() + " " + Ext.htmlEncode( this._config.parent._nickname ) + "]</b> " + Ext.htmlEncode( field.getValue() ) );
					}
					this._config.parent.handleSendText.bind( this._config.parent )( this.textField, this._config.nickname );
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
			this._config.parent.handleSendText.bind( this._config.parent )( this.textField, this._config.nickname );
		}
	} );
	
	// Prepare the text window
	this.textPanel = Ext.create( 'Ext.panel.Panel', {
		region: 'center'
		,border: true
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
		text: Ext.htmlEncode( this._config.nickname )
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
		title: Ext.htmlEncode( this._config.nickname )
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
				// Remove from query array
				var queryWindowPosition = this._config.parent._lcChatNicknames.indexOf( this._config.nickname );

				this._config.parent._lcChatNicknames.splice( queryWindowPosition, 1 );
				this._config.parent._queryWindows.splice( queryWindowPosition, 1 );

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
			this.textPanel
		]
	} );
}

/**
 * Method used for appending text.
 * TODO: Clean redundant code!
 * @param {String} text String to add to window.
 * @function
 */
ChatWindow.prototype.addText = function( text, noAlert ) {
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
