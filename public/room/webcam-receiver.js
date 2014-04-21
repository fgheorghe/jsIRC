var WebcamReceiver = function() {
         this.init();
};

WebcamReceiver.prototype.init = function() {
         this.panel = Ext.create( 'Ext.Component', {
                  autoEl: {
                           tag: 'img'
                  }
                  ,height: 145
                  ,width: 200
         } );
}

WebcamReceiver.prototype.update = function( data ) {
         if ( this.panel.rendered ) {
                  this.panel.getEl().dom.src = data;
         }
}