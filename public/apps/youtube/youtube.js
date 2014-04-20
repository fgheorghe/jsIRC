var Youtube = function() {
        this.init();
}

Youtube.prototype.init = function() {
        this.createButton();
}

Youtube.prototype.createButton = function() {
        this.button = Ext.create( 'Ext.Button', {
                // https://www.iconfinder.com/icons/48639/youtube_icon#size=32
                icon: 'data:image/png;base64,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'
                ,scale: 'large'
                ,text: 'Youtube'
                ,handler: function() {
                        if ( !this.playerWindow ) {
                                this.createPlayerWindow();
                        }
                        this.playerWindow.show();
                }.bind( this )
        } );
}

Youtube.prototype.createPlayerWindow = function() {
        this.playerElement = Ext.create( 'Ext.Component', {
                autoEl: {
                        tag: 'iframe'
                        ,type: 'text/html'
                        ,src: '//www.youtube.com/embed/Ip2ZGND1I9Q?wmode=transparent'
                        ,wmode: "Opaque"
                        ,frameborder: 0
                }
                ,height: 145
                ,width: 200
        } );

        this.playerWindow = Ext.create( 'Ext.window.Window', {
                width: '640'
                ,height: '390'
                ,closable: true
                ,minimizable: true
                ,maximizable: true
                ,title: 'Youtube Player'
                ,constrain: true
                ,renderTo: document.body
                ,layout: 'fit'
                ,items: this.playerElement
                ,listeners: {
                        minimize: function() {
                                this.playerWindow.hide();
                        }.bind( this )
                        ,close: function() {
                                this.playerElement.destroy();
                                this.playerWindow.destroy();

                                delete this.playerElement;
                                delete this.playerWindow;
                        }.bind( this )
                }
        } );
}