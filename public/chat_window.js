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

ChatWindow.prototype.updateWebcam = function( data ) {
	this.webcam.updateWebcam.bind( this.webcam )( data );
}

ChatWindow.prototype.createWebcam = function() {
        this.webcam = new Webcam( {
                height: 200
                ,width: 200
                ,handler: function( data ) {
                        this._config.parent.client.emit( 'STREAM', {
                                type: 'video'
                                ,data: data
                                ,target: this._config.nickname
                        } );
                }.bind( this )
        } );

	this.webcamContainer = Ext.create( 'Ext.panel.Panel', {
		width: 200
                ,minWidth: 200
                ,frame: false
                ,border: false
                ,region: 'east'
		,hidden: true
		,collapsible: true
		,title: 'Webcam'
		,items: [ this.webcam.panel ]
	} );
}

/**
 * Method used for initiating the chat window.
 * @function
 */
ChatWindow.prototype.init = function() {
	// Create webcam component
	this.createWebcam();

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
					this.textPanel.getWidth() - this.sendButton.getWidth() - 20
				);
			}.bind( this )
		}
	} );

	this.webcamButton = Ext.create( 'Ext.button.Button', {
		text: 'Show Webcam'
		,handler: function() {
			if ( this.webcamContainer.isHidden() ) {
                               this.webcam.start();
                               this.webcamButton.setText( "Close Webcam" );
				this.webcamContainer.setVisible( true );
			} else {
				this.webcamContainer.setVisible( false );
                               this.webcamButton.setText( "Webcam Invite" );
				this.webcam.stop.bind( this.webcam )();
			}
		}.bind( this )
	} );

	// Prepare the window
	this.chatWindow = Ext.create( 'Ext.window.Window', {
		title: Ext.htmlEncode( this._config.nickname )
		,closable: true
		,maximizable: true
		,minimizable: true
		,resizable: true
		,constrain: true
		,height: 500
		,width: 800
		,layout: 'border'
		,tbar: [ this.webcamButton ]
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
				try {
	                                this.webcam.stop();
				} catch ( e ) {
					// Do nothing.
				}
			}.bind( this )
			,render: function() {
				this.textField.focus( false, 200 );

                                // If a leftbar is configured, add button
                                if ( this._config.leftbar ) {
                                        this._config.leftbar.addItem( {
                                               text: this._config.nickname
                                               ,id: this._config.nickname
                                               // https://www.iconfinder.com/icons/72854/chat_conversation_icon#size=32
                                               ,icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAaCAYAAADWm14/AAADF0lEQVRIS72X209TMRzHewZjbjjmMtyD+qDiBQf/hhr1dYnPaqKRZ/UPMCYmhAcTExY16oPxwYTExMQLIxpjCCBBFGHj4sASQG7CYIMNmOx42p7fTtd2Mgyjy9L19PL99Ntf2zMNCelMy0AzQtp18fnOl/VQOFjfoPEDg/iFwKGd1xNGfB2dNJ7oIQEgop8/dbDk4iDwZnAKSQDnag/sGsDboV8M4EbrQLOmlWbdXS4X8ng8ykm9G55GGog3ng6UZOa32qKIQFRVVUnjt47MIO1mOKKD+MpqijYy3FDmhQh1XadVYg7tb3dg5Pf7pe5tsTkLILFiiRMAEWIre3hx8hvKpN+dToyqq/dLQ7wfm7cA4skUFRW/vCPFOADiPMTdLox8Pp/U/cPPBQtgIZkuCQABafyMkdfrlQA+jsctgLlEGtlsth11IJvNksBATd1YuRM+TSxbADPLayT6KACAFGM/TEu0nsaA8SUQ93owcrvdkgPtU0kLYGppjc2ec0G1I/jg4keU1t4MRAJw/wtGlZWVEkDH9KoFMB43AcgW5ILxYSxJO147zvbxgx8JZfnqMTeNfJg5yYk4yUO9GDmdTgmga9aIOzgHYr/zYwAgnowxgCs1DODxKAO4fJRZCvWXjuyllquW4tE3jBwOhwTQPb9uAQzOpZBNk4OwxltOO44ubdK8Zl8ZK8f/sLJZH1vMyOKIHVBP+zCy2+0SQM9CxgLonzXOAfIRzgKpl+KB6hAyvMi1fPYdo7IyBs6n3vimBdA3w05Car0Jwop5F2auvxiM1HoQNY9maPy8H1N3xfR1OWtdRhfrDufVU+EC4hxFQSCoeBHBShP7aCiZLySFruNggEERGDLDlqh6MKWC+VC8F/pXwAnFKxk/EOyOzkm2NC8HMYEINZ2tb/iXIKmDV7s6FwtUPkVS5SgcrMutq3qBjR4A0D6RQq+GihcHMYAIODN5ANG0fXsA5IWi2JmLswWIWsdGrmpovaI4AIiL/xUXnThZYdw1Rhre2FMcwFbrvJ16cOKEPY1GMs7dB+ADk2w98ocEJvAXE6wNUbonuqkAAAAASUVORK5CYII='
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
                        ,minimize: function() {
                                this.chatWindow.hide();
                        }.bind( this )
		}
		,items: [
			this.textPanel
			,this.webcamContainer
		]
	} );

        // Constrain to configured renderTo object
        if ( typeof this._config.renderTo !== "undefined" ) {
                this._config.renderTo.add ( this.chatWindow );
        }
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
