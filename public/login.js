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
 * Login.
 * @class Provides login functionality.
 * @constructor
 */
var Login = function( config ) {
	this._config = config;

	this.init();

	return this;
}

Login.prototype.init = function() {
        this.createLoginWindow();
}

Login.prototype.createLoginWindow = function() {
        this.realnameField = Ext.create( 'Ext.form.field.Text', {
                fieldLabel: 'Real name'
                ,labelAlign: 'right'
                ,enableKeyEvents: true
                ,listeners: {
                        keydown: function( field, e, eOpts ) {
                                if ( e.getKey() === 13 ) {
                                        this.nicknameField.focus( 200 );
                                }
                        }.bind( this )
                }
        } );

	this.nicknameField = Ext.create( 'Ext.form.field.Text', {
		fieldLabel: 'Nickname'
		,labelAlign: 'right'
                ,enableKeyEvents: true
                ,listeners: {
                        keydown: function( field, e, eOpts ) {
                                if ( e.getKey() === 13 ) {
                                        this.loginButton.focus( 200 );
                                }
                        }.bind( this )
                }
	} );

	this.loginFormPanel = Ext.create( 'Ext.form.Panel', {
		items: [
			this.realnameField
			,this.nicknameField
		]
	} );

	this.loginButton = Ext.create( 'Ext.button.Button', {
		text: 'Login'
		,handler: function() {
			this._config.loginHandler(
				this.nicknameField.getValue()
				,this.realnameField.getValue()
			);

			this.loginWindow.hide();
		}.bind( this )
	} );

	this.loginWindow = Ext.create( 'Ext.window.Window', {
		title: 'Login'
		,resizable: false
		,layout: 'fit'
		,closable: false
		,minimizable: false
		,modal: true
		,width: 300
		,height: 110
		,items: [
			this.loginFormPanel
		]
		,bbar: [
			'->'
			,this.loginButton
		]
		,listeners: {
			afterrender: function() {
                                this.realnameField.focus( false, 200 );
			}.bind( this )
		}
	} );
}
