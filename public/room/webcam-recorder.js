var WebcamRecorder = function( config ) {
         this._config = config;
         this.paused = true;
         this._deffered = false;
         this._ready = false;

         // Based on: http://www.html5rocks.com/en/tutorials/getusermedia/intro/
         this.checkFunctionality();

         this.init();
};

WebcamRecorder.prototype.setErrorPanel = function() {
         this.thumbnail.remove( this.canvasTag );
         this.thumbnail.remove( this.videoTag );
         this.thumbnail.add( {
                  xtype: 'box'
                  ,html: '<div style="padding: 4px;">Your camera is not enabled.</div>'
         } );
}

WebcamRecorder.prototype.checkFunctionality = function() {
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

WebcamRecorder.prototype.stop = function() {
         if ( this.paused === false ) {
                  this.video.pause();
                  this.localMediaStream.stop(); // Doesn't do anything in Chrome.
                  this.paused = true;
         }
}

WebcamRecorder.prototype.init = function() {
         this.createSend();
}

WebcamRecorder.prototype.start = function( readyCheck ) {
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

WebcamRecorder.prototype.createWebcamTags = function() {
         this.preview = Ext.create( 'Ext.Component', {
                  autoEl: {
                           tag: 'img'
                  }
                  ,height: 145
                  ,width: 200
         } );

         this.videoTag = Ext.create( 'Ext.Component', {
                  autoEl: {
                           tag: 'video'
                           ,autoplay: true
                           ,width: 200
                           ,height: 145
                           ,border: false
                  }
                  ,listeners: {
                           afterrender: function() {
                                    this.canvasTag = Ext.create( 'Ext.Component', {
                                             autoEl: {
                                                      tag: 'canvas'
                                                      ,height: 145
                                                      ,width: 200
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

WebcamRecorder.prototype.createSend = function() {
         this.thumbnail = Ext.create( 'Ext.panel.Panel', {
                  frame: false
                  ,border: false
                  ,width: 200
                  ,height: 145
                  ,shadow: false
                  ,listeners: {
                           afterrender: function() {
                                    this.createWebcamTags();
                                    this.thumbnail.add( this.videoTag );
                           }.bind( this )
                  }
         } );
}

WebcamRecorder.prototype.handleError = function( Exception ) {
         if ( typeof Exception.PERMISSION_DENIED !== "undefined" && Exception.PERMISSION_DENIED === 1 ) {
                  Ext.MessageBox.alert( 'Error', 'Webcam access permission denied.' );
                  this.setErrorPanel();
         }
}

WebcamRecorder.prototype.recordVideo = function() {
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

WebcamRecorder.prototype.stream = function() {
         // Width / height
         this.canvasTag.getEl().dom.getContext("2d").drawImage(this.video, 0, 0, 145, 200);
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
                           ctx.drawImage(video, 0, 0, 200, 145);
                           var data = canvas.toDataURL('image/webp', 1);
                           this._config.handler( data );
                  }
         };

         this.paused = false;
         rafId = requestAnimationFrame(drawVideoFrame.bind(this)); // Note: not using vendor prefixes!
}