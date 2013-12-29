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
 * List window.
 * @class Provides client to client chat functionality.
 * @constructor
 * @param {Object} config List window configuration object.
 */
var ListWindow = function( config ) {
	// Set to true, once the list is loaded
	this.listed = false;

	// Store configuation, in a 'private' property
	this._config = config;
	
	// Load 'everything'
	this.init();
	
	return this;
}

/**
 * Method used for initiating the list window.
 * @function
 */
ListWindow.prototype.init = function() {
	// Context menu handler
	this.channelListContextMenu = function( tree, record, item, index, e, eOpts ) {
		// Create the menu
		var menu = Ext.create( 'Ext.menu.Menu', {
			items: [
				{
					text: 'Join Channel'
					,handler: function() {
						// Issue a 'join' command if not already on that channel
						if ( !this._config.parent._channelWindows[record.raw.channel] ) {
							this._config.parent.parseCommand( "/join " + record.raw.channel );
						} else {
							// Just show...
							this._config.parent._channelWindows[record.raw.channel].chatWindow.show();
						}
					}.bind( this )
				}
			]
		} );
		
		// Display menu
		menu.showAt( e.getXY() );
		
		// Prevent default browser right click behaviour
		e.preventDefault();
	}

	// Prepare the grid
	this.channelGrid = Ext.create( 'Ext.grid.Panel', {
		store: Ext.create( 'Ext.data.ArrayStore', {
			fields: [
				{ name: 'channel' }
				,{ name: 'users' }
				,{ name: 'topic' }
			],
		       data: []
		} )
		,columns: [
			{
				text: 'Channel'
				,width: 150
				,dataIndex: 'channel'
			}
			,{
				text: 'Users'
				,width: 150
				,dataIndex: 'users'
			}
			,{
				text: 'Topic'
				,flex: 1
				,dataIndex: 'topic'
			}
		]
		,listeners: {
			itemcontextmenu: this.channelListContextMenu.bind( this )
		}
	} );

	// Prepare the window
	this.listWindow = Ext.create( 'Ext.window.Window', {
		title: 'Channel List'
		,closable: true
		,maximizable: true
		,minimizable: true
		,resizable: true
		,constrain: true
		,renderTo: typeof this._config.renderTo !== "undefined" ? this._config.renderTo.getEl() : document.body
		,layout: 'fit'
		,height: 500
		,width: 800
		,closeAction: 'destroy'
		,listeners: {
			close: function() {
				this._config.parent._channelListWindow = false;
			}.bind( this )
			,render: function() {
                                // If a leftbar is configured, add button
                                if ( this._config.leftbar ) {
                                        this._config.leftbar.addItem( {
                                               text: 'Channel List'
                                               ,id: 'list-window'
                                               ,icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAACuElEQVQ4T6VSXU8TQRS9d3a3u6UVKiqWh6YkQIhRaENM1EffjInRB/+XP8QnQnxQQE3wg1oEYqjQD6EC5VMo2NLdndmZ8c7Gf8BsdmYze8+55957EK648Ip4wPVqteCAnQgVV5xzHYZK+UGoAl8qAA5Ka22SMES0rCRzXXCYZAwcAIxkF39u1t44lpOVIJWKVCSkkrQis0ea8EoSAQIyhhZiggEkAdFG1DoIeAWr9e0NL50a1RQiKZsJpxOUAk0PpBMInkUSjA5SQfd4SUFaCtlpt0v463drU/QNjHVIlh8pCCKFfkTs9G3UF65bkEsxUwqQCDgXDMqnEdxCIfqD0xLWd/arbZYebQtggVDQEwp7QupAUEqt4FHWwbGMoxWlpj7AUQAwu9WDkWQkxuzuMlYaO+vHOjVx2JNWN5RwyRWa7EJpIPXwOJ+EiRuJWA3h4aAj9WylDfk08Lzb/YKlSmO56buTtRNuU+a4RtN3U3KSOv1k/BrcGUoSAf2gu4MLoWdWjiCXYWHW/ruAn1ar5bU/ONk4Dh2N2iQxLwEAPAfh6d0M3BtOUVOJgH7snwUws9SC3KAdZL3ePH4sb3xbOZRTjUPfMdMyBGbuhsAlgmeFm1DM98clGBXtDofV2gkMeCwAcTGPH0qVpe+7vFhrdR1lCKhUcpAZY0zw4v4QFEeIgC7MJGiSEFGPuBBBc6c1hwtffyyVt/xidbfjkHGQekeBABFtHtnm5YPbMD2WiQnMsiyyE5GEXPhbzd05nP+8VirXu4W6UWDAtEXUCqpZew6D5w+HYXo8Y7Ax0LZtMiUDsr3f2N57h+8XlxfPfZg663JbE5hE/K/XKLD1RK4fsoN9SCjyAdnVsmM/mBIazdZ7fD3z9pXrJHLkTgsNAwXGDaDDdRPas0kyIc0FqY9PCkHOo2jv4GjjH3wDnYCRfzA/AAAAAElFTkSuQmCC'
                                               ,itemclick: function( panel, record, item, index, e, eOpts ) {
                                                       // Focus
                                                       this.listWindow.show();
                                               }.bind( this )
                                        } );
                                        this._config.leftbar.selectItem( 'list-window' );
                                }
			}.bind( this )
			,activate: function() {
                                // Select empty in the rightbar
                                if ( this._config.rightbar ) {
                                        this._config.rightbar.selectEmptyPanel();
                                }

                                // If a leftbar is configured, select button
                                if ( this._config.leftbar ) {
                                        this._config.leftbar.selectItem( 'list-window' );
                                }
			}.bind( this )
			,close: function() {
				// Remove from parent
				this._config.parent._channelListWindow = null;

                                // If a leftbar is configured, remove button
                                if ( this._config.leftbar ) {
                                        this._config.leftbar.removeItem( 'list-window' );
                                }
			}.bind( this )
		}
		,items: [
			this.channelGrid
		]
	} );
}