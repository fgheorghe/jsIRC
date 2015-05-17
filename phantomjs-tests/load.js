// Run: phantomjs --web-security=no load.js index.html
// Requires: phantomjs >= 1.9.0
var config = {
	ServerHost: 'localhost'
	,ServerPort: 80
	,NicknamePrefix: 'test'
	,Channels: [ '#test' ]
	,User: 'test'
	,Realname: 'test'
	,Mode: 0
};

// Create dummy page
var page = require( 'webpage' ).create();

// Handle page console messages
page.onConsoleMessage = function( msg ) {
	console.log( msg );
};

// 'Convert' alers to console messages
page.onAlert = function( msg ) {
	console.log( msg );
};

// Load a script tag
page.content = '<script src="http://' + config.ServerHost + ':' + config.ServerPort + '/socket.io/socket.io.js"></script>';

// On page load, create large number of connections
// Based on: https://groups.google.com/forum/#!msg/socket_io/G4eabH_XhJA/cZiwGT79SrgJ
page.onLoadFinished = function ( status ) {
	console.log( "[+] Creating sockets..." );

	for ( var i = 0; i < 100; i++ ) {
		console.log( "[+] Creating socket " + i + "..." );
		page.evaluate( function( i, config ) {
				// Force a new socket connection
				var socket = new io.connect( 'http://' + config.ServerHost + ':' + config.ServerPort, { 'force new connection': true } );
				console.log( "[+] Socket created " + i + "..." );

				// Send user and nick commands
				socket.on( 'connect', function() {
					console.log( "[+] Client " + i + " connected..." );
					this.emit( 'NICK', { nickname: config.NicknamePrefix + i } );
					this.emit( 'USER', { user: config.User + i, mode: config.Mode, realname: config.Realname } );
				} );

				// Join a test channel
				socket.on( 'RPL_WELCOME', function() {
					console.log( "[+] Client " + i + " registered with network..." );

					this.emit( 'JOIN', {
						channels: config.Channels
					} );
				} );

				// Allow channel/private commands
				socket.on( 'PRIVMSG', function( data ) {
					var temp = data.message.split( " " );
					// Join/part
					if ( temp[0].toLowerCase() === "join" || temp[0].toLowerCase() === "part" ) {
						this.emit( temp[0].toUpperCase(), {
							channels: [ temp[1] ]
						} );
					}

					// Motd/lusers/list
					if ( temp[0].toLowerCase() === "motd" || temp[0].toLowerCase() === "lusers" || temp[0].toLowerCase() === "list" ) {
						this.emit( temp[0].toUpperCase(), {} );
					}

					// Cycle, to put more load
					if ( temp[0].toLowerCase() === "cycle" ) {
						this.emit( "PART", {
							channels: [ data.target ]
						} );
						this.emit( "JOIN", {
							channels: [ data.target ]
						} );
					}

					// Privmsg
					if ( temp[0].toLowerCase() === "privmsg" ) {
						this.emit( "PRIVMSG", {
							target: temp[1]
							,message: data.message.slice( data.message.indexOf( temp[1] ) + temp[1].length + 1 )
						} );
					}
				} );
		}, i, config );
	}
};

console.log( "Running" );