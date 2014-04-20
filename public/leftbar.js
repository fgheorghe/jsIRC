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
 * LeftBar.
 * @class Provides left bar functionality.
 * @constructor
 */
var LeftBar = function() {
	this.init();

	return this;
}

LeftBar.prototype.init = function() {
        this.createItemTreePanel();
        this.createPanel();
}

LeftBar.prototype.addItem = function( item ) {
        item.icon = typeof item.icon !== "undefined" ? item.icon : ' ';
        item.cls = typeof item.cls !== "undefined" ? item.cls : 'middle-node';
        item.leaf = typeof item.leaf !== "undefined" ? item.leaf : true;
        this.itemTreePanel.getRootNode().appendChild( item );
}

LeftBar.prototype.removeItem = function( itemId ) {
        this.itemTreePanel.getStore().getNodeById( itemId ).remove( true );
}

LeftBar.prototype.selectItem = function( itemId ) {
        this.itemTreePanel.getSelectionModel().select( this.itemTreePanel.getStore().getNodeById( itemId ) );
}

LeftBar.prototype.itemclick = function( panel, record, item, index, e, eOpts ) {
        if ( typeof record.raw.itemclick !== "undefined" ) {
                record.raw.itemclick( panel, record, item, index, e, eOpts );
        }
}

LeftBar.prototype.createItemTreePanel = function() {
        // Prepare the client list
        this.itemTreePanel = Ext.create( 'Ext.tree.Panel', {
                store: Ext.create( 'Ext.data.TreeStore', {
                        data: {
                                children: []
                        }
                        ,fields: [ 'text' ]
                } )
                ,bodyCfg: {
                        cls: 'x-tree-noicon'
                }
                ,frame: false
                ,border: false
                ,lines: false
                ,rootVisible: false
                ,listeners: {
                        itemclick: this.itemclick.bind( this )
                }
        } );
}

LeftBar.prototype.createPanel = function() {
        this.panel = Ext.create( 'Ext.panel.Panel', {
                region: 'west'
                ,width: 200
                ,frame: false
                ,border: false
                ,title: "Conversations"
                ,header : {
                        height: 49
                }
                ,lyout: 'fit'
                // Objects add themself
                ,items: [ this.itemTreePanel ]
        } );
}