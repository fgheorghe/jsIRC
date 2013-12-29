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
                                               // https://www.iconfinder.com/icons/36993/app_list_search_window_icon#size=32
                                               ,icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAEr0lEQVRYR8WWbUxbVRjH/+3tKy0vHZRRwPEOi+B0XSAzOk0I+AWjWRYxfjFEF+M3s7iYJSYmbjHT8G1fjNHF6L44EnxZ9BMkxk2ZtNkyIVsHlBcHtExcC20tpe291/OccrdbbCkvEk7y5OTee87z/M7/nuc5R4M9bpo9jg8O0NfXZ7DZbB9oNJoe9lixm1CyLE+zOJcCgcDZ7u5ukQMMDAycr6ysPMMMer1+N+NjdXUVPp8Pc3Nz73V2dvYqAH85nU57NBqFKIq7CkALJBsZGRnr6Og4yAEGBwfllpYWEMBuNyY/DAYDPB7PAgNwPATY7cDr/Wu1WrS3tzMc1lwul9za2rplhomJCTQ0NGx5Hk1wu91oa2tLB1hZWQFJpLaNvE9NTaG2tjYnANv5UJvZbM4MEIvFsLy8jGQyySGyNbvdDpJwcnISdXV1fFgwGEQ8Hs86hwB0Oh0KCwthMpkyA1CKkOPNKuD1elFfX78lBSRJgtFozAxAKyAFEokEd5pNhdLSUg6q3gOssGRVgFZPjdKPFKAsyLgHCIAcKypsBEHfNrMJleDU0+rJsgLQypeWlrgCym/IpO92FCAAUqCoqIj3GRVQAqv3wUY/eDMK0HwlA2j1CkhWgO0qcNnlw4WhMGZDUs5NSQPK8iT4InglrRDtRIFDveN4/wUHGvfnIbXlsjcKOn4/itPfzwb+A7BdBQ6c9eDE01Vw+5OQchBoWdRWhw791/9M3QeUUrwTBQjg+ScPwBtMnaZHK3ToOWREsVmD0UURF9wxLMUekdXbBPzyx710AEpDUoAq4VbrQNW5u3juicfgDYg4XKbDp10WfHvzPkZnl/GSsxyWPBPevPIPEmtbpH6fgKujs+kAdBYoGUB9rjqgLsU1H43jWHMK4ON2A8SVEN79YR6CyQp9LICf3nHiw6txuOZTChHAtdvrAOg+EAqFcp4FJSUlHFR9GNWd9+LZxxnAAxEXXxTgmg7hs9sWHkyWRHzeJeDKWBI/TulSAMUCfr2zDiASiaSdBbkUmJmZQXV1NXfY8MkUnmmsxAQDOOWM4lhTCV7vX0EkLqN5v4Avjlvx2pf3MLNamBrPAH4bn0v/BeFwmFfAzchPTvx+PxwOB3fY1DuDozUVGGcbzhydxTdvN6Agzwh/WEZdsRahaByvfhVEIGHk4xvtAn6fnn8EYLFYdnQf7PpOhyNlDpbfIpM8CW3Ag5db7SgvseKW92+80VGD0uIC9HwdRiAqsXoh4MaCnwNohoeHJXY74WTbbZSGTxU6MLaQyiDIIpLRB5CT7Ig3WKCLL+LSqWb8PKHFxWtxNLFMubWcAtAODQ2xy7DIFSBTajb3s3aUKr36nRr2LVcVjuxz4G62QiRLWF30QDDbYCgox0FWiG4EUgDCmtH25Ga1WumdhgXlCq0FVV+R0q5LbJxQfMbtOXG4whITBehZqRNYFq+/U1EZElkdSLBSaRJE9N/0RZQASk/JT8GpVyxtTH5+/kMoRQFWwIpsJy+f1JU2nmYfaX7OxmBEKeg/tx5SeVYHUb9TO1bPNTMwPft9elJjTT1agDJGZtlFAkisJxNZpoks6xLZb5451/D/DNhzgH8BzqKXFlz2rtQAAAAASUVORK5CYII='
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