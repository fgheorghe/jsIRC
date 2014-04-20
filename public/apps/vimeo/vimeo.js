var Vimeo = function() {
        this.init();
}

Vimeo.prototype.init = function() {
        this.createButton();
}

Vimeo.prototype.createButton = function() {
        this.button = Ext.create( 'Ext.Button', {
                // https://www.iconfinder.com/icons/57892/vimeo_icon#size=32
                icon: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAE60lEQVRYR8WXbUxTVxjH/7e9bW/faClVh0TYxoxZmAwiG0JMJA6IhuyND1vCJFtYtiXjyz74xUGMmWP4MiNhATclM9ky44TNsaGCUwfT6AZkwiYRRWCCBrAipbTllvbeu3NuI1hb2kZhPt/uvSfP8zvPy/+cy4BYcnnNRknFlUHJvigpFGr6brGMEcUZCL52xstX9H9a2swkl+/f4DXFnZkxmCGoORCAxYot+yUAUM7wUDvtUE2Ov8Qk7j56wW19Isuri4GkZCExzOICSBIYwQeVewq68ZEuZllNi3vaslQrsqpFDfygc4XPC85+W2Csda2Sx2hZ9J0H7Y5kgpu6Cyauro0AxP6vu78XTEP6wA9AGvBxmAxgOUhK8FgBDpyNCiBZx+K9lVZolQrU9dnwj2OGzNTcxDCkpq8mGLAlZTnSrAYMOKbRbnPio85hOMXQk+XPwFdnwgIwkoi3Ek2oykoGx/o1YsLjRfpP3bgj+J/pmuIkE2rXrQyq5Ccdg9hzdTykvsgAsV8SAL0pZAtQ0ShLWYqta5KCvr/z62U0jEzLjq0KAd2FaTBzwSJ6enAMha39EFSaIB8a1yQB2H86JADd1a60eJSmrggJt/uPq9hx5a4MsDc9Hh+kJoZc137ThvzmK/BqdKEBzLWnggBo8LdpSnOeRdv1YayOt8Ki1wY4aOwdRvH5QYgKJV7QChgdGkZlfgZeS18VsO547xCKfu+Hl9PPA1DTEgwgCjB6XMgxq3Ch7wayEyw4UvJygINemx2Zxy5BYNVQej1Q8W7kL+FwuCg3YF1laxd2XpsIk4EvTobMAHXKekmnk+5W8y78WZKHpLi5XhHI+4SDZ+FgtWAgQUmkdcuqOGxbv3oWwCsIWFvXgmuMbv4eMFVTgJig9NCxItHl9+ppJyrSlqN0XWrAuvz6izjvEGUZN5JTtvvNTMQb50pVe64L5X/dBE+aXCKletA0LgcYU/VxyUNOwnDGkmxs0EtoLA5Mb1nr36jqm5ABPk5ZhvKsufqPOZzIrjuJ29pY+MgxH8o0bgpQ1STxEQAU5Pi08A5cLy0Ap2JnfbX9O4qCE5eRk2BG4ytroLxPmD6s/w2Hb7ng0RrnvWNwMsC+XyIC0HJQ2ubXM7D2yfiAzZwbsiF7hTUgeEvPADY3dcJNTlnapPOZH2BvY0QAuQ88bmylopSbEbZcA7YJbPq6GSOaGLnzw11wZICYzymAMaxT+pFORAbnQ9v7BfOutbt5FBz4GT0+NUm9QdaIcMaRWxEBOCbxpE6RTEG0QUuks7MkF08vCb4/jE06sfmbE+h0M6A9JZLrXSTjpinAnh+jAqAjqSFi8+5TZuwrXB/g+8YdO9441IQ+QQ26GSHK650MYNz1Q5QAkMVG75pAdd7zKMp8ToZo6OhBeUsHRpU6Oe2CvPPoLrZ+gJ0NUQPQaVB5eejIMfqMTgHe58MtD0jKjfCodVGl/f7U+QEq6wmAIVK5Zr/Tg4olmWB9RKaJ+Ui6fUr1Q/1PcERhGUPlUYnnoge4R+KXatIZj/AfwfEU4LPvHwog6pSFWSgD6CuO+DycIfzALkS0ED40vFNg9Du+u0RGJy3azl04FvJjMj3VxZi2Hcpz682nIqnWwgX2e6LCpnPZ8+WB1W//dqOH05eJSkUWgwj6+YgkEkRBIYgXNbyrwrW9uPk/dSoT8hSc3i4AAAAASUVORK5CYII='
                ,scale: 'large'
                ,text: 'Vimeo'
                ,handler: function() {
                        if ( !this.playerWindow ) {
                                this.createPlayerWindow();
                        }
                        this.playerWindow.show();
                }.bind( this )
        } );
}

Vimeo.prototype.createPlayerWindow = function() {
        this.playerElement = Ext.create( 'Ext.Component', {
                autoEl: {
                        tag: 'iframe'
                        ,type: 'text/html'
                        ,src: '//player.vimeo.com/video/45878034'
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
                ,title: 'Vimeo Player'
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