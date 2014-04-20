/**
 C opyright (c) 2013, Grosan Flaviu Gheorg*he
 All rights reserved.
 
 Redistribution and use in source and binary forms, with or without
 modification, are permitted provided that the following conditions are met:
 * Redistributions of source code must retain the above copyright
 notice, this list of conditions an*d the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright
 notice, this list of conditions an*d the following disclaimer in the
 documentation and/or other materials provided with the distribution.
 * Neither the name of the author nor the
 names of its contributors may be u*sed to endorse or promote products
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
 * RightBar.
 * @class Provides left bar functionality.
 * @constructor
 */
var RightBar = function() {
	this.init();

	return this;
}

RightBar.prototype.init = function() {
        this.createEmptyPanel();
        this.createPanel();
}

RightBar.prototype.addItem = function( item ) {
        this.panel.add( item );
        this.panel.getLayout().setActiveItem( item );
}

RightBar.prototype.removeItem = function( item ) {
        this.panel.remove( item );
}

RightBar.prototype.selectItem = function( item ) {
        this.panel.getLayout().setActiveItem( item );
}

RightBar.prototype.selectEmptyPanel = function() {
        this.selectItem( this.emptyPanel );
}

RightBar.prototype.createEmptyPanel = function() {
        this.emptyPanel = Ext.create( 'Ext.panel.Panel', {
                frame: false
                ,border: false
                ,hideHeaders: true
                ,html: '<div style="padding: 4px;">Select a channel to view friends.</div>'
        } );
}

RightBar.prototype.createPanel = function() {
        this.panel = Ext.create( 'Ext.panel.Panel', {
                region: 'east'
                ,width: 200
                ,frame: false
                ,border: false
                ,title: "Friends"
                ,header : {
                        height: 49
                }
                ,collapsible: true
                ,layout: 'card'
                // Objects add themself
                // TODO: Add empty text, to notify user to select a channel.
                ,items: [ this.emptyPanel ]
        } );
}