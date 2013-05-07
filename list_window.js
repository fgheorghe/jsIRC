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
						console.log( record );
						// Issue a 'join' command
						this._config.parent.parseCommand( "/join " + record.raw.channel );
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
		,minimizable: false
		,resizable: true
		,constrainHeader: true
		,layout: 'fit'
		,height: 500
		,width: 800
		,closeAction: 'destroy'
		,listeners: {
			close: function() {
				this._config.parent._channelListWindow = false;
			}.bind( this )
		}
		,items: [
			this.channelGrid
		]
	} );
}