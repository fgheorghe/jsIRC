/**
 * Main application object
 * @constructor
 */
var app = function() {
         // User not yet registered to network
         this._registered = false;
         this._channelName = null;
         this._webcams = {};

         // "CONSTANTS"
         this.CHANNEL_NAME_PATTERN = /^[#&+!]+[a-zA-Z0-9\-\_]+$/; // Channel name, as per RFC...
};

/**
 * Method used for creating the user interface.
 * @function
 */
app.prototype.initUi = function() {
         // Prepare webcam
         this.webcamContainer = Ext.create( 'Ext.panel.Panel', {
                  height: 170
                  ,frame: false
                  ,border: false
                  ,region: 'north'
                  ,title: 'Webcam'
                  ,layout: {
                           type: 'hbox',
                           pack: 'start'
                  }
                  ,items: []
         } );

         // Webcam button
         this.webcamButton = Ext.create( 'Ext.button.Button', {
                  text: 'Show Webcam'
                  ,handler: function() {
                           if ( this.webcamButton.getText() === "Show Webcam" ) {
                                    this.webcam = new WebcamRecorder( {
                                             handler: function( data ) {
                                                      this.client.emit( "STREAM", {
                                                               target: this._channelName
                                                               ,data: data
                                                               ,type: "video"
                                                      } );
                                             }.bind( this )
                                    } );
                                    this.webcamContainer.insert( this.webcam.thumbnail );
                                    this.webcam.start();
                                    this.webcamButton.setText( "Close Webcam" );
                           } else {
                                    this.webcamButton.setText( "Show Webcam" );
                                    this.webcamContainer.remove( this.webcam.thumbnail );
                                    this.webcam.stop.bind( this.webcam )();
                                    delete this.webcam;
                           }
                  }.bind( this )
         } );

         // Topic text
         this.topicText = Ext.create( 'Ext.form.field.Text', {
                  width: 560
                  ,enableKeyEvents: true
                  ,listeners: {
                           keydown: function( field, e, eOpts ) {
                                    if ( e.getKey() === 13 ) {
                                             // Set topic
                                             this.client.emit( "TOPIC", {
                                                      channel: this._channelName
                                                      ,topic: field.getValue()
                                             } );

                                             // Get topic...
                                             this.client.emit( "TOPIC", {
                                                      channel: this._channelName
                                             } );
                                    }
                           }.bind( this )
                  }
         } );

         // Method used for creating a new mode checkbox
         var createModeCheckbox = function( mode ) {
                  return Ext.create( 'Ext.form.field.Checkbox', {
                           fieldLabel: mode.label
                           ,labelAlign: 'right'
                           ,labelWidth: 'auto'
                           ,labelSeparator: ''
                           ,listeners: {
                                    change: function( checkbox, value ) {
                                             // Handle /mode command
                                             this.client.emit( "MODE", { target: this._channelName, modes: ( ( value === true ? "+" : "-" ) + mode.type ) } );

                                             // Emit a 'mode' command, to list modes (in case setting this mode fails)
                                             this.client.emit( "MODE", { target: this._channelName } );
                                    }.bind( this )
                           }
                  } );
         }

         // Create checkboxes
         var modes = [
                  { type: "n", label: 'No external messages' },
                  { type: "m", label: 'Moderated' },
                  { type: "p", label: 'Private' },
                  { type: "t", label: 'Topic protected' }
         ];

         var modeCheckboxDockItems = [ '->' ];
         this.modeCheckboxes = {};
         for ( var i = 0; i < modes.length; i++ ) {
                  this.modeCheckboxes[modes[i].type] = createModeCheckbox.bind( this )( modes[i] );
                  modeCheckboxDockItems.push( this.modeCheckboxes[modes[i].type] );
                  modeCheckboxDockItems.push( ' ' );
         }

         // Channel limit box
         this.limitInputBox = Ext.create( 'Ext.form.field.Text', {
                  width: 'auto'
                  ,fieldLabel: 'Limit users'
                  ,labelSeparator: ''
                  ,labelWidth: 'auto'
                  ,enableKeyEvents: true
                  ,listeners: {
                           keydown: function( field, e, eOpts ) {
                                    if ( e.getKey() === 13 ) {
                                             // Handle /mode command
                                             this.client.emit( "MODE", { target: this._channelName, modes: ( parseInt( field.getValue(), 10 ) ? "+l" : "-l" ), parameters: [ parseInt( field.getValue(), 10 ) ] } );

                                             // Emit a 'mode' command, to list modes (in case setting this mode fails)
                                             this.client.emit( "MODE", { target: this._channelName } );
                                    }
                           }.bind( this )
                  }
         } );

         // Channel key box
         this.keyInputBox = Ext.create( 'Ext.form.field.Text', {
                  width: 'auto'
                  ,fieldLabel: 'Channel key'
                  ,labelSeparator: ''
                  ,labelWidth: 'auto'
                  ,enableKeyEvents: true
                  ,listeners: {
                           keydown: function( field, e, eOpts ) {
                                    if ( e.getKey() === 13 ) {
                                             // Handle /mode command
                                             this.client.emit( "MODE", { target: this._channelName, modes: ( field.getValue() ? "+k" : "-k" ), parameters: [ field.getValue() ] } );

                                             // Emit a 'mode' command, to list modes (in case setting this mode fails)
                                             this.client.emit( "MODE", { target: this._channelName } );
                                    }
                           }.bind( this )
                  }
         } );

         modeCheckboxDockItems.push( this.limitInputBox );
         modeCheckboxDockItems.push( this.keyInputBox );

         // Create top panel, hosting the channel topic, name and properties
         this.navigationPanel = Ext.create( 'Ext.panel.Panel', {
                  region: 'north'
                  ,height: 75
                  ,dockedItems: [
                           {
                                    xtype: 'toolbar'
                                    ,dock: 'top'
                                    ,items: [
                                             '->', this.topicText
                                    ]
                           }
                           ,{
                                    xtype: 'toolbar'
                                    ,dock: 'top'
                                    ,items: modeCheckboxDockItems
                           }
                  ]
                  ,frame: false
                  ,title: '&nbsp;'
                  ,listeners: {
                           resize: function() {
                                    // Resize text field
                                    this.topicText.setWidth(
                                             this.navigationPanel.getWidth() - 10
                                    );
                           }.bind( this )
                  }
         } );

         // Text field
         this.textField = Ext.create( 'Ext.form.field.Text', {
                  width: 560
                  ,enableKeyEvents: true
                  ,listeners: {
                           keydown: function( field, e, eOpts ) {
                                    if ( e.getKey() === 13 ) {
                                             this.handleSendText();
                                    }
                           }.bind( this )
                  }
         } );

         // Create chat panel, hosting the conversation
         this.chatPanel = Ext.create( 'Ext.panel.Panel', {
                  region: 'center'
                  ,frame: false
                  ,tbar: [ this.webcamButton ]
                  ,bodyStyle: {
                           padding: '5px'
                           ,whiteSpace: "pre-wrap"
                           ,fontFamily: "monospace"
                           ,fontSize: "11px"
                  }
                  ,autoScroll: true
                  // Start adding text from the bottom
                  ,html: '<div style="height: 3000px;">&nbsp;</div>'
                  ,bbar: [ '->', this.textField ]
                  ,listeners: {
                           resize: function() {
                                    // Scroll to bottom
                                    this.chatPanel.body.scroll( 'b', Infinity );

                                    // Resize text field
                                    this.textField.setWidth(
                                             this.chatPanel.getWidth() - 10
                                    );
                           }.bind( this )
                  }
         } );

         // Chat area, holding the camera and the text part
         this.chatArea = Ext.create( 'Ext.panel.Panel', {
                  layout: 'border'
                  ,region: 'center'
                  ,items: [ this.webcamContainer, this.chatPanel ]
         } );

         // Create center panel, used for hosting the chat window
         this.channelPanel = Ext.create( 'Ext.panel.Panel', {
                  region: 'center'
                  ,layout: 'border'
                  ,frame: false
                  ,border: false
                  ,items: [ this.navigationPanel, this.chatArea ]
         } );

         // Context menu handler
         this.userListContextMenu = function( tree, record, item, index, e, eOpts ) {
                  var node = this.findClient( record.raw.nick );

                  // Create the menu
                  var menu = Ext.create( 'Ext.menu.Menu', {
                           items: [
                                    {
                                             text: 'Give Ops'
                                             ,handler: function() {
                                                      // Issue a 'mode' command
                                                      this.client.emit( "MODE", { target: this._channelName, modes: "+o", parameters:[ record.raw.text ] } );
                                             }.bind( this )
                                             ,hidden: node.raw.operator === true
                                    }
                                    ,{
                                             text: 'Remove Ops'
                                             ,handler: function() {
                                                      // Issue a 'mode' command
                                                      this.client.emit( "MODE", { target: this._channelName, modes: "-o", parameters:[ record.raw.text ] } );
                                             }.bind( this )
                                             ,hidden: node.raw.operator === false
                                    }
                                    ,{
                                             text: 'Give Voice'
                                             ,handler: function() {
                                                      // Issue a 'mode' command
                                                      this.client.emit( "MODE", { target: this._channelName, modes: "+v", parameters:[ record.raw.text ] } );
                                             }.bind( this )
                                             ,hidden: node.raw.voice === true
                                    }
                                    ,{
                                             text: 'Remove Voice'
                                             ,handler: function() {
                                                      // Issue a 'mode' command
                                                      this.client.emit( "MODE", { target: this._channelName, modes: "-v", parameters:[ record.raw.text ] } );
                                             }.bind( this )
                                             ,hidden: node.raw.voice === false
                                    }
                                    ,{
                                             text: 'Kick'
                                             ,handler: function() {
                                                      // Issue a 'kick' command
                                                      this.client.emit( "KICK", { channel: [ this._channelName ], user: [ record.raw.text ] } );
                                             }.bind( this )
                                    }
                                    ,{
                                             text: 'Ban'
                                             ,handler: function() {
                                                      // Issue a 'ban' command, for the nick!user@host mask
                                                      this.client.emit( "MODE", { target: this._channelName, modes: "+b", parameters:[ record.raw.text + "!" + record.raw.user + "@" + record.raw.host ] } );
                                             }.bind( this )
                                    }
                                    ,{
                                             text: 'Kick & Ban'
                                             ,handler: function() {
                                                      // Issue a 'ban' command, for the nick!user@host mask
                                                      this.client.emit( "MODE", { target: this._channelName, modes: "+b", parameters:[ record.raw.text + "!" + record.raw.user + "@" + record.raw.host ] } );

                                                      // Issue a 'kick' command
                                                      this.client.emit( "KICK", { channel: [ this._channelName ], user: [ record.raw.text ] } );
                                             }.bind( this )
                                    }
                           ]
                  } );

                  // Display menu
                  menu.showAt( e.getXY() );

                  // Prevent default browser right click behaviour
                  e.preventDefault();
         }

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
                  client.cls = 'middle-node';
                  this.clientList.getRootNode().appendChild( client );
                  this.sortUsers();
         }

         // Set 'node' icon (and sort), based on status (operator, voice or none)
         this.setNodeIcon = function( node ) {
                  // Set icon
                  node.set( 'icon', node.raw.operator === true
                  // https://www.iconfinder.com/icons/80830/business_man_customer_male_icon#size=32
                  ? 'data:image/png;base64,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'
                  : node.raw.voice === true
                  // https://www.iconfinder.com/icons/80876/male_person_icon#size=32
                  ? 'data:image/png;base64,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'
                  // https://www.iconfinder.com/icons/80871/coffee_male_person_icon#size=32
                  : 'data:image/png;base64,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'
                  );

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

                  if ( typeof this._webcams[nickname.toLowerCase()] !== "undefined" ) {
                           this.webcamContainer.remove( this._webcams[nickname.toLowerCase()].panel );
                           delete this._webcams[nickname.toLowerCase()];
                  }

                  this.clientList.getRootNode().removeChild( node, true );
         }

         // Method used for finding if a user is in the window's list
         this.findClient = function( nickname ) {
                  var r = this.clientList.getRootNode().findChildBy( function( _node ) {
                           if ( _node.raw.nick.toLowerCase() === nickname.toLowerCase() ) {
                                    return true;
                           }
                           return false;
                  } );
                  return r;
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
                  }
         } );

         // Create east panel, used for hosting channel names
         this.friendListPanel = Ext.create( 'Ext.panel.Panel', {
                  region: 'east'
                  ,width: 150
                  ,layout: 'fit'
                  ,title: 'Friends'
                  ,collapsible: true
                  ,resizable: true
                  ,items: [ this.clientList ]
         } );

         // Create the main panel, which hosts all other panels
         this.mainPanel = Ext.create( 'Ext.container.Viewport', {
                  title: "Chat"
                  ,layout: 'border'
                  ,items: [ this.channelPanel, this.friendListPanel ]
         } );
};

// Create a new instance of the chat application
// ...as soon as ExtJS is ready, and right after SocketIO has been loaded
app.prototype.init = function() {
         Ext.Loader.setPath('Ext.ux', '../extjs/examples/ux');
         Ext.require('Ext.ux.layout.Center');

         Ext.onReady( function() {
                  // Fire-up the user interface
                  this.initUi();

                  var jsIRCClient = new Client( {
                           url: Config.Client.ServerUrl
                           ,scope: this
                           ,events: {
                                    // Connection handler
                                    connect: this.connectHandler
//                                     // Disconnect handler
//                                     ,disconnect: this.ChatApplication.disconnectHandler
//                                     // Welcome message. This marks the user is now registered with the server
                                    ,RPL_WELCOME: this.RPL_WELCOME
                                    ,RPL_NAMREPLY: this.RPL_NAMREPLY
                                    ,PRIVMSG: this.PRIVMSG
                                    ,JOIN: this.JOIN
                                    ,PART: this.PART
                                    ,QUIT: this.QUIT
                                    ,RPL_TOPIC: this.RPL_TOPIC
                                    ,ERR_CHANOPRIVSNEEDED: this.ERR_CHANOPRIVSNEEDED
                                    ,RPL_CHANNELMODEIS: this.RPL_CHANNELMODEIS
                                    ,MODE: this.MODE
                                    ,ERR_ERRONEUSNICKNAME: this.ERR_ERRONEUSNICKNAME
                                    ,ERR_NICKNAMEINUSE: this.ERR_NICKNAMEINUSE
                                    ,ERR_CHANNELISFULL: this.ERR_CHANNELISFULL
                                    ,ERR_BADCHANNELKEY: this.ERR_BADCHANNELKEY
                                    ,ERR_CANNOTSENDTOCHAN: this.ERR_CANNOTSENDTOCHAN
                                    ,ERR_NOTEXTTOSEND: this.ERR_NOTEXTTOSEND
                                    ,QUIT: this.QUIT
                                    ,PING: this.PING
                                    ,ERR_NOPRIVILEGES: this.ERR_NOPRIVILEGES
                                    ,ERR_USERNOTINCHANNEL: this.ERR_USERNOTINCHANNEL
                                    ,KICK: this.KICK
                                    ,RPL_STREAM: this.RPL_STREAM
//                                     ,RPL_ENDOFBANLIST: this.ChatApplication.RPL_ENDOFBANLIST
//                                     ,RPL_BANLIST: this.ChatApplication.RPL_BANLIST
//                                     ,ERR_BANNEDFROMCHAN: this.ChatApplication.RPL_ENDOFEXCEPTLIST
                           }
                  } );

                  // Initialise the server
                  jsIRCClient.init();

                  // Add the chat server to the chat application
                  this.client = jsIRCClient;
         }.bind( this ) );
}

/**
 * Method used for creating the name prompt.
 * @function
 */
app.prototype.createNamePrompt = function() {
         this.nameInputField = Ext.create( 'Ext.form.field.Text', {
                  width: 560
                  ,enableKeyEvents: true
                  ,listeners: {
                           keydown: function( field, e, eOpts ) {
                                    if ( e.getKey() === 13 ) {
                                             // TODO: Remove redundant code
                                             var nickname = this.nameInputField.getValue();
                                             // Check if anything has been filled in
                                             if ( !nickname ) {
                                                      return;
                                             }

                                             // Store realname
                                             this._nickname = nickname;

                                             // Set the name of this client
                                             this.client.emit( 'NICK', { nickname: this._nickname } );

                                             // Set the user details
                                             this.client.emit( 'USER', {
                                                      user: 'user'
                                                      ,mode: 0
                                                      ,realname: this._nickname
                                             } );

                                             this.namePrompt.hide();
                                    }
                           }.bind( this )
                  }
         } );

         this.loginButton = Ext.create( 'Ext.button.Button', {
                  text: 'Join'
                  ,handler: function() {
                           var nickname = this.nameInputField.getValue();
                           // Check if anything has been filled in
                           if ( !nickname ) {
                                    return;
                           }

                           // Store realname
                           this._nickname = nickname;

                           // Set the name of this client
                           this.client.emit( 'NICK', { nickname: this._nickname } );

                           // Set the user details
                           this.client.emit( 'USER', {
                                    user: 'user'
                                    ,mode: 0
                                    ,realname: this._nickname
                           } );

                           this.namePrompt.hide();
                  }.bind( this )
         } );

         this.namePrompt = Ext.create( 'Ext.window.Window', {
                  title: 'Your name'
                  ,modal: true
                  ,closable: false
                  ,height: 80
                  ,width: 200
                  ,items: [ this.nameInputField ]
                  ,bbar: [ '->', this.loginButton ]
                  ,listeners: {
                           afterrender: function() {
                                    this.nameInputField.focus( false, 200 );
                           }.bind( this )
                  }
         } );

         this.namePrompt.show();
}

/**
 * Method used for handling 'PING' event.
 * @param {Object} data Data object.
 * @function
 */
app.prototype.PING = function( data ) {
         // Add text to window
         this.client.emit( 'PONG', {
                  server: data.source
         } );
}


/**
 * Method used for handling 'ERR_NOTEXTTOSEND' event.
 * @param {Object} data Data object.
 * @function
 */
app.prototype.ERR_NOTEXTTOSEND = function( data ) {
         // Add text to window
         this.addText( "<b>" + Ext.htmlEncode( data.msg ) + "</b>" );
}

/**
 * Method used for handling 'ERR_NOPRIVILEGES' event.
 * @param {Object} data Data object.
 * @function
 */
app.prototype.ERR_NOPRIVILEGES = function( data ) {
         // Add text to window
         this.addText( "<b>" + Ext.htmlEncode( data.msg ) + "</b>" );
}

/**
 * Method used for handling 'ERR_USERNOTINCHANNEL' event.
 * @param {Object} data Data object.
 * @function
 */
app.prototype.ERR_USERNOTINCHANNEL = function( data ) {
         // Add text to window
         this.addText( "<b>" + Ext.htmlEncode( data.msg ) + "</b>" );
}

/**
 * Method used for handling 'KICK' event, and close the channel window, or update the client list
 * @param {Object} data Data object.
 * @function
 */
app.prototype.KICK = function( data ) {
         // If the user being kicked is the same as this user, then display the text accordingly (in the status window)
         if ( data.target.toLowerCase() === this._nickname.toLowerCase() ) {
                  this.addText( '<b>You have been kicked by ' + data.nickname + '</b>' );
         } else {
                  // Display text
                  this.addText( '<b>' + data.nickname + ' has kicked ' + data.target + '</b>' );

                  // Remove from list of users
                  this.removeClient( data.target );
         }
}

/**
 * Method used for handling a TCP / SOCKET connection.
 * @function
 */
app.prototype.connectHandler = function() {
         // Request a name for this client
         // Hidden by an 'okName' event.
         this.createNamePrompt();
};

/**
 * Method used for appending text.
 * @param {String} text String to add to window.
 * @function
 */
app.prototype.addText = function( text ) {
         // Apply extra formats
         text = Ext.util.Format.nl2br( text );

         // Convert links
         text = text.replace( /(\b(https?):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig, "<a href='$1' target='_blank'>$1</a>" );

         this.chatPanel.body.insertHtml( "beforeEnd", text + '<br>' );
         this.chatPanel.body.scroll( 'b', Infinity );
}

// Handle a text sending UI action
app.prototype.handleSendText = function() {
         var textField = this.textField
                  ,recipient = this._channelName;
         // Check if the user tries sending a command (string starting with a /).
         if ( textField.getValue().toString().charAt( 0 ) === "/" ) {
                  // Parse command
                  this.parseCommand( textField.getValue().toString() );
         } else {
                  // If a recipient if set, construct a privmsg command, and call same function again
                  if ( recipient ) {
                           this.client.emit( 'PRIVMSG', {
                                    target: recipient
                                    ,message: textField.getValue().toString()
                           } );
                  }
         }
         if ( this.textField.getValue() ) {
                  this.addText( "<b>[" + Ext.htmlEncode( this._nickname ) + "]</b> " + Ext.htmlEncode( this.textField.getValue() ) );
         }
         textField.setValue( "" );
}

/**
 * Method used for handling 'RPL_WELCOME' reply, this marks a successful registration event!
 * @param {Object} data Data object.
 * @function
 */
app.prototype.RPL_WELCOME = function( data ) {
         // Set client as 'registered'
         this._registered = true;

         // Focus the input field
         this.textField.focus( false, 200 );

         // Display welcome text
         this.addText( '<b>You have joined the chat.</b>' );

         // Join channel, if the url points to something similar to http://domain/#channel
         // TODO: Move code to proper location
         var documentLocation = location.href
                  // TODO: Make use of CHANNEL_NAME_PATTERN
                  ,channelName = /[#&+!]+[a-zA-Z0-9\-\_]+/.exec( documentLocation );

         if ( channelName ) {
                  // Store current channel name
                  this._channelName = channelName[0];

                  // Emit a join command
                  this.client.emit( 'JOIN',
                           {
                                    channels: [ channelName[0] ]
                           }
                  );

                  this.navigationPanel.setTitle( channelName[0] );
         }
}

/**
 * Method used for sorting channel users: first by operator status, then voice, then regular. Each sorted by name.
 * @function
 */
app.prototype.sortUsers = function() {
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
 * Method used for handling 'ERR_ERRONEUSNICKNAME' event.
 * @param {Object} data Data object.
 * @function
 */
app.prototype.ERR_ERRONEUSNICKNAME = function( data ) {
         // Display name window
         this.namePrompt.show();

         // Add text to window
         this.addText( "<b>" + Ext.htmlEncode( data.msg ) + "</b>" );
}

/**
 * Method used for handling 'RPL_NAMREPLY' event.
 * @param {Object} data Data object.
 * @function
 */
app.prototype.RPL_NAMREPLY = function( data ) {
         var names = [];

         // Convert to tree items
         for ( var i = 0; i < data.names.length; i++ ) {
                  names.push( {
                           text: Ext.htmlEncode( data.names[i].nick )
                           ,leaf: true
                           ,operator: data.names[i].operator
                           ,voice: data.names[i].voice
                           ,user: data.names[i].user
                           ,host: data.names[i].host
                           ,nick: data.names[i].nick
                           ,cls: 'middle-node'
                           // TODO: Move to a function
                           ,icon: data.names[i].operator === true
                           // https://www.iconfinder.com/icons/80830/business_man_customer_male_icon#size=32
                           ? 'data:image/png;base64,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'
                           : data.names[i].voice === true
                           // https://www.iconfinder.com/icons/80876/male_person_icon#size=32
                           ? 'data:image/png;base64,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'
                           // https://www.iconfinder.com/icons/80871/coffee_male_person_icon#size=32
                           : 'data:image/png;base64,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'
                  } );
         }

         this.loadClientList( names );
         this.sortUsers();
}

/**
 * Method used for handling 'PRIVMSG' event.
 * @param {Object} data Data object.
 * @function
 */
app.prototype.PRIVMSG = function( data ) {
         // Check if target is a channel, or current user
         var isChannel = this.CHANNEL_NAME_PATTERN.test( data.target );

         // Handle channel messages
         if ( isChannel ) {
                  // Find a channel window
                  // TODO: Handle non existing channel windows
                  if ( this._channelName.toLowerCase() === data.target.toLowerCase() ) {
                           this.addText( "<b>[" + Ext.htmlEncode( data.nickname ) + "]</b> " + Ext.htmlEncode( data.message ) );
                  }
         }
}

/**
 * Method used for handling 'JOIN' event, and create a new channel window or update the channel member list.
 * @param {Object} data Data object.
 * @function
 */
app.prototype.JOIN = function( data ) {
         // Create a new window, if the JOIN command is reffering to the current user AND a window for this channel doesn't exist
         // TODO: Check if channel window exists!
         if ( data.nickname.toString().toLowerCase() !== this._nickname.toString().toLowerCase() ) {
                  // Append text
                  this.addText( "<b>" + Ext.htmlEncode( data.nickname ) + " has joined the chat.</b>", true );

                  // Append to user list
                  this.addClient( {
                           leaf: true
                           ,operator: false // Upon client join, these are both false
                           ,voice: false
                           ,text: Ext.htmlEncode( data.nickname )
                           // https://www.iconfinder.com/icons/80871/coffee_male_person_icon#size=32
                           ,icon: 'data:image/png;base64,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'
                           ,user: data.user
                           ,host: data.host
                           ,nick: data.nickname
                  } );
         } else if( data.nickname.toString().toLowerCase() === this._nickname.toString().toLowerCase() ) {
                  // Request channel modes
                  this.client.emit( 'MODE',
                           {
                                    target: data.channel
                           }
                  );
         }
}

/**
 * Method used for handling 'PART' event, and close the channel window, or update the client list
 * @param {Object} data Data object.
 * @function
 */
app.prototype.PART = function( data ) {
         // Append text
         this.addText( "<b>" + Ext.htmlEncode( data.nickname ) + " has left the chat.</b>", true );

         // Remove from list of users
         this.removeClient( data.nickname );
}

/**
 * Method used for handling 'QUIT' event.
 * @param {Object} data Data object.
 * @function
 */
app.prototype.QUIT = function( data ) {
         // Remove from all windows
         if ( this.findClient( data.nickname ) ) {
                  this.addText( "<b>" + Ext.htmlEncode( data.nickname ) + " has left the chat.</b>", true );

                  this.removeClient( data.nickname );
         }
}

/**
 * Method used for handling 'RPL_TOPIC' event.
 * @param {Object} data Data object.
 * @function
 */
app.prototype.RPL_TOPIC = function( data ) {
         // If this is a user updating (as opposed to requesting it on join) notify the user, and update topic
         if ( data.nickname ) {
                  // Add text
                  this.addText( '<b>' + Ext.htmlEncode( data.nickname ) + ' has changed topic to: ' + Ext.htmlEncode( data.topic ) + "</b>" );
         } else {
                  this.addText( '<b>Topic is: ' + Ext.htmlEncode( data.topic ) + "</b>" );
         }

         // Update the window's topic value
         this.topicText.setValue( data.topic );
}

/**
 * Method used for handling 'ERR_CHANOPRIVSNEEDED' event.
 * @param {Object} data Data object.
 * @function
 */
app.prototype.ERR_CHANOPRIVSNEEDED = function( data ) {
         // Add text to window
         this.addText( "<b>" + Ext.htmlEncode( data.msg ) + "</b>" );
}

/**
 * Method used for handling 'MODE' event.
 * @param {Object} data Data object.
 * @function
 */
app.prototype.MODE = function( data ) {
         var verb, subject;
         // Get set or remove type of update
         var value = data.mode[0] === "+";

         if ( data.mode[1] !== "l" && data.mode[1] !== "k" && data.mode[1] !== "o" && data.mode[1] !== "v" && data.mode[1] !== "b" && data.mode[1] !== "e" ) {
                  this.modeCheckboxes[data.mode[1]].suspendEvents();

                  // Update window
                  this.modeCheckboxes[data.mode[1]].setValue( value );

                  this.modeCheckboxes[data.mode[1]].resumeEvents();

         } else if ( data.mode[1] === "l" ) {
                  if ( typeof data.parameter !== "undefined" && data.parameter !== 0 ) {
                           value = data.parameter;
                  } else {
                           value = "";
                  }

                  this.limitInputBox.setValue( value );
         } else if ( data.mode[1] === "k" ) {
                  if ( typeof data.parameter !== "undefined" && data.parameter !== 0 ) {
                           value = data.parameter;
                  } else {
                           value = "";
                  }

                  this.keyInputBox.setValue( value );
         } else if ( data.mode[1] === "o" ) {
                  // Set client operator mode
                  if ( data.mode[0] === "+" ) {
                           this.setOperator( data.parameter );
                  } else {
                           this.removeOperator( data.parameter );
                  }
         } else if ( data.mode[1] === "v" ) {
                  // Set client voice mode
                  if ( data.mode[0] === "+" ) {
                           this.setVoice( data.parameter );
                  } else {
                           this.removeVoice( data.parameter );
                  }
         }

         // And notify user
         switch ( data.mode[1] ) {
                  case "t":
                           subject = "topic protection";
                           break;
                  case "m":
                           subject = "moderation";
                           break;
                  case "p":
                           subject = "private channel";
                           break;
                  case "n":
                           subject = "no external messages";
                           break;
                  case "k":
                           subject = "channel key";
                           break;
                  case "l":
                           subject = "channel limit";
                           break;
                  case "v":
                           subject = "channel voice";
                           break;
                  case "o":
                           subject = "channel operator";
                           break;
                  case "b":
                           subject = "user";
                           break;
         }

         if ( data.mode[1] !== "b" ) {
                  if ( data.mode[0] === "-" ) {
                           verb = "removes";
                  } else {
                           verb = "sets";
                  }
         } else {
                  if ( data.mode[0] === "-" ) {
                           verb = "unbans";
                  } else {
                           verb = "bans";
                  }
         }
         this.addText( "<b>" + Ext.htmlEncode( data.nickname ) + ' ' + verb + ' ' + subject + ( data.parameter ? " " + Ext.htmlEncode( data.parameter ) : "" ) + "</b>" );
}

/**
 * Method used for handling 'RPL_CHANNELMODEIS' event.
 * @param {Object} data Data object.
 * @function
 */
app.prototype.RPL_CHANNELMODEIS = function( data ) {
         // Find the window, and set or unset modes
         var modes = [ "m" ,"n" ,"p","t", "k", "l" ];

         var param = 0;
         for ( var i = 0; i < modes.length; i++ ) {
                  if ( modes[i] !== "l" && modes[i] !== "k" ) {
                           this.modeCheckboxes[modes[i]].suspendEvents();
                           if ( data.mode.indexOf( modes[i] ) === -1 ) {
                                    this.modeCheckboxes[modes[i]].setValue( false );
                           } else {
                                    this.modeCheckboxes[modes[i]].setValue( true );
                           }
                           this.modeCheckboxes[modes[i]].resumeEvents();
                  } else if ( modes[i] === "l" ) {
                           if ( typeof data.params !== "undefined" && typeof data.params[0] !== "undefined" ) {
                                    value = data.params[param];
                           } else {
                                    value = "";
                           }
                           this.limitInputBox.setValue( value );
                           param++;
                  } else if ( modes[i] === "k" ) {
                           if ( typeof data.params !== "undefined" && typeof data.params[0] !== "undefined" ) {
                                    value = data.params[param];
                           } else {
                                    value = "";
                           }
                           this.keyInputBox.setValue( value );
                           param++;
                  }
         }
}

/**
 * Handler for an 'ERR_NICKNAMEINUSE' event.
 * @function
 */
app.prototype.ERR_NICKNAMEINUSE = function( data ) {
         this.namePrompt.show();
         this.addText( "<b>" + Ext.htmlEncode( data.msg ) + "</b>" );
}

/**
 * Method used for handling 'ERR_BADCHANNELKEY' event.
 * @param {Object} data Data object.
 * @function
 */
app.prototype.ERR_BADCHANNELKEY = function( data ) {
         // Ask for password
         this.passInputField = Ext.create( 'Ext.form.field.Text', {
                  width: 560
                  ,enableKeyEvents: true
                  ,listeners: {
                           keydown: function( field, e, eOpts ) {
                                    if ( e.getKey() === 13 ) {
                                             this.passButton.focus( 200 );
                                    }
                           }.bind( this )
                  }
         } );

         this.passButton = Ext.create( 'Ext.button.Button', {
                  text: 'Join'
                  ,handler: function() {
                           var pass = this.passInputField.getValue();
                           // Check if anything has been filled in
                           if ( !pass ) {
                                    return;
                           }

                           // Emit a join command
                           this.client.emit( 'JOIN',
                                             {
                                                      channels: [ this._channelName ]
                                                      ,keys: [ pass ]
                                             }
                           );

                           this.passPrompt.hide();
                  }.bind( this )
         } );

         this.passPrompt = Ext.create( 'Ext.window.Window', {
                  title: 'Channel key'
                  ,modal: true
                  ,closable: false
                  ,height: 80
                  ,width: 200
                  ,items: [ this.passInputField ]
                  ,bbar: [ '->', this.passButton ]
                  ,listeners: {
                           afterrender: function() {
                                    this.passInputField.focus( false, 200 );
                           }.bind( this )
                  }
         } );

         this.passPrompt.show();
}

/**
 * Method used for handling 'ERR_CANNOTSENDTOCHAN' event.
 * @param {Object} data Data object.
 * @function
 */
app.prototype.ERR_CANNOTSENDTOCHAN = function( data ) {
         // Add text to window
         this.addText( "<b>" + Ext.htmlEncode( data.msg ) + "</b>" );
}

/**
 * Method used for handling 'ERR_CHANNELISFULL' event.
 * @param {Object} data Data object.
 * @function
 */
app.prototype.ERR_CHANNELISFULL = function( data ) {
         // Add text to window
         this.addText( "<b>" + Ext.htmlEncode( data.msg ) + "</b>" );
         this.addText( "<b>" + 'Try again later...' + "</b>" );
}

/**
 * Method used for handling 'ERR_CANNOTSENDTOCHAN' event.
 * @param {Object} data Data object.
 * @function
 */
app.prototype.ERR_CANNOTSENDTOCHAN = function( data ) {
         // Add text to window
         this.addText( "<b>" + Ext.htmlEncode( data.msg ) + "</b>" );
}

app.prototype.RPL_STREAM = function( data ) {
         if ( typeof this._webcams[data.nick.toLowerCase()] === "undefined" ) {
                  this._webcams[data.nick.toLowerCase()] = new WebcamReceiver();
                  this.webcamContainer.insert( this._webcams[data.nick.toLowerCase()].panel );
         }
         this._webcams[data.nick.toLowerCase()].update( data.data );
}
