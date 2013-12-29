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
						this.addText( "<b>[" + Ext.htmlEncode( this._config.parent._nickname ) + "]</b> " + Ext.htmlEncode( field.getValue() ) );
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

                                // If a leftbar is configured, remove button
                                if ( this._config.leftbar ) {
                                        this._config.leftbar.removeItem( this._config.nickname );
                                }
			}.bind( this )
			,render: function() {
				this.textField.focus( false, 200 );

                                // If a leftbar is configured, add button
                                if ( this._config.leftbar ) {
                                        this._config.leftbar.addItem( {
                                               text: this._config.nickname
                                               ,id: this._config.nickname
                                               ,icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACF0lEQVQ4T81Sz2sTQRR+szuzM9tNq6lgCoIgmIO3gpAWS23pSYVCPEhFE7R4MYXgRYSYHnqS9B+oh0BEgz8wIhYKoqCIhzYiwkIRPAiKBGoVhMYV9/f6Zm2kCIVALx14zOPNvO+973uPwA4P2WE+7BKA0wvPx4ze5Ejg26v3p0eXkFbULTVy9s7K5d8+WQCiEIKEDKos3V2cz0KjEUiQUqm0zzCMhPSFEDGubdvx7fv+d5KtrTQVqg0xxiCKInBdF9qtDyMvZ/PLhUIhWSwW1zRN42igqmqcGIYheJ4HjuO8IpO15gvBxQTnIn5wHBtY6J55cGH4UblcPpDL5VqysgSglIJsMwiCuBB2YpJTN19f1BOJW4xuduA5EPnewyeXjk2Zpjmt63qtb2MRGKOgei2IkqNA1++BNXAFrHC/SWB8nE7mb7RVlelSOxXCz6nQOX7+iJbtEWIOq/f3CAoakxSwf4VjgV9g+/RvBxLg5NRcO1KIrgCseoH/iX57nx901ng6nYZMJrPOOScdDToUpAYI8CYGGMteu02Ick5n2rOnMxMnto6wWq0eRYH3Sv4dEaUGOAGwLOvjv00cqjy+ShX1uv12+dC7xvxG13vQ7cft/pFKpbInlUodxPb68VMfctTQ4sX5/+CeWGguxttI4weO8gup1+uHMWEYHwYkAFoCfQyRXqn5JkiIsZ8YkytuSQD0v2Ks+Qc+pdj5ZazyPgAAAABJRU5ErkJggg=='
                                               ,itemclick: function( panel, record, item, index, e, eOpts ) {
                                                       // Focus
                                                       this.chatWindow.show();
                                                       this.textField.focus( false, 200 );
                                               }.bind( this )
                                        } );
                                        this._config.leftbar.selectItem( this._config.nickname );
                                }
			}.bind( this )
			,activate: function() {
                                // Select empty in the rightbar
                                if ( this._config.rightbar ) {
                                        this._config.rightbar.selectEmptyPanel();
                                }

                                // If a leftbar is configured, select button
                                if ( this._config.leftbar ) {
                                        this._config.leftbar.selectItem( this._config.nickname );
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
