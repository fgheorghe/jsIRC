var Webcam = function( config ) {
	this._config = config;
	this.paused = true;
        this._deffered = false;
        this._ready = false;
	// Based on: http://www.html5rocks.com/en/tutorials/getusermedia/intro/
	this.checkFunctionality();

	this.init();
}

Webcam.prototype.setErrorPanel = function() {
        this.thumbnail.remove( this.canvasTag );
        this.thumbnail.remove( this.videoTag );
        this.thumbnail.add( {
                xtype: 'box'
                ,html: '<div style="padding: 4px;">Your camera is not enabled.</div>'
        } );
}

Webcam.prototype.checkFunctionality = function() {
	function hasGetUserMedia() {
		return !!(navigator.getUserMedia || navigator.webkitGetUserMedia ||
	        	navigator.mozGetUserMedia || navigator.msGetUserMedia);
	}

	if (hasGetUserMedia()) {
		// Good to go!
	} else {
               Ext.MessageBox.alert( 'Error', 'Your browser does not support HTML5 webcam functionality. Please upgrade.' );
               this.setErrorPanel();
	}
}

Webcam.prototype.stop = function() {
        if ( this.paused === false ) {
                this.video.pause();
                this.localMediaStream.stop(); // Doesn't do anything in Chrome.
                this.paused = true;
        }
}

Webcam.prototype.init = function() {
        this.createSend();
        this.createReceive();
}

Webcam.prototype.start = function( readyCheck ) {
        if ( this._ready === true && !readyCheck ) {
                this.recordVideo();
                return;
        }
        if ( readyCheck === true && this.paused === true && this._deffered === true ) {
                this.recordVideo();
        } else if ( !readyCheck ) {
                this._deffered = true;
        }
}

Webcam.prototype.createReceive = function() {
        this.webcamReceiveImg = Ext.create( 'Ext.Component', {
                autoEl: {
                        tag: 'img'
                }
                ,height: 145
                ,width: 200
        } );

        this.panel = Ext.create( 'Ext.panel.Panel', {
                frame: false
                ,border: false
                ,height: 2 * this._config.height
                ,width: this._config.width
                ,items: [ this.webcamReceiveImg, this.thumbnail ]
                ,title: 'Friend Webcam'
                ,layout: {
                        type: 'table'
                        ,columns: 1
                }
        } );
}

Webcam.prototype.updateWebcam = function( data ) {
        if ( this.webcamReceiveImg.rendered ) {
                this.webcamReceiveImg.getEl().dom.src = data;
        }
}

Webcam.prototype.createWebcamTags = function() {
	this.videoTag = Ext.create( 'Ext.Component', {
		autoEl: {
		        tag: 'video'
			,autoplay: true
			,width: 200
			,height: 150
		}
		,listeners: {
			afterrender: function() {
			        this.canvasTag = Ext.create( 'Ext.Component', {
		        	        autoEl: {
		               		        tag: 'canvas'
						,height: this._config.height
						,width: this._config.width
        	        		}
			                ,listeners: {
                        			afterrender: function() {
                                                        this._ready = true;
                                                        this.start( true );
                        			}.bind( this )
			                }
			        } );
                                this.thumbnail.add( this.canvasTag );
			}.bind( this )
		}
	} );
}

Webcam.prototype.createSend = function() {
	this.thumbnail = Ext.create( 'Ext.panel.Panel', {
                frame: false
                ,border: false
                ,title: 'Your Webcam'
		,width: 200
		,height: 179
		,shadow: false
		,listeners: {
			afterrender: function() {
			        this.createWebcamTags();
                                this.thumbnail.add( this.videoTag );
			}.bind( this )
		}
	} );
}

Webcam.prototype.handleError = function( Exception ) {
        if ( typeof Exception.PERMISSION_DENIED !== "undefined" && Exception.PERMISSION_DENIED === 1 ) {
                Ext.MessageBox.alert( 'Error', 'Webcam access permission denied.' );
                this.setErrorPanel();
        }
}

Webcam.prototype.recordVideo = function() {
	this.video = this.videoTag.getEl().dom;
	if (navigator.getUserMedia) {
		navigator.getUserMedia('video', function(stream) {
		      this.video.src = stream;
		      this.localMediaStream = stream;
                      this.stream.bind( this )();
		}.bind( this ), this.handleError.bind( this ) );
	} else if (navigator.webkitGetUserMedia) {
		navigator.webkitGetUserMedia({video: true}, function(stream) {
			this.video.src = window.URL.createObjectURL(stream);
			this.localMediaStream = stream;
			this.stream.bind( this )();
		}.bind( this ), this.handleError.bind( this ) );
	} else {
                // TODO
	}
}

Webcam.prototype.stream = function() {
        this.canvasTag.getEl().dom.getContext("2d").drawImage(this.video, 0, 0, this._config.height, this._config.width);
        var url = this.canvasTag.getEl().dom.toDataURL('image/webp', 1); // Second param is quality.

        var rafId;
        var ctx = this.canvasTag.getEl().dom.getContext("2d")
                video = this.video
                ,canvas = this.canvasTag.getEl().dom
                ,panel = this.window
		,config = this._config;

        function drawVideoFrame(time) {
		if ( this.paused === false ) {
	                rafId = requestAnimationFrame(drawVideoFrame.bind( this ));
        	        ctx.drawImage(video, 0, 0, config.height, config.width);
	                var data = canvas.toDataURL('image/webp', 1);
			if ( config.handler !== "undefined" ) {
				config.handler( data );
			}
		}
        };

        this.paused = false;
        rafId = requestAnimationFrame(drawVideoFrame.bind(this)); // Note: not using vendor prefixes!
}
