/**
Copyright (c) 2013, Grosan Flaviu Gheorghe
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.
    * Neither the name of the author nor the
      names of its contributors may be used to endorse or promote products
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

var Config = {
        Server: {
                WEB: {
                        Port: 10000
                        ,Host: '127.0.0.1'
                }
                ,TCP: {
                        Port: 6667
                        ,Host: '127.0.0.1'
                }
                // IRC Protocol configuration
                ,IRCProtocol: {
                        ServerName: "localhost"
                        ,ServerInfo: "Oxford, Oxfordshire, UK, EU"
                        ,ServerComments: "Development version."
                        ,AdminInfo: {
                                Location: "Oxford, Oxfordshire, United Kingdom, European Union"
                                ,Organization: "Grosan.co.uk"
                                ,Email: "fgheorghe@grosan.co.uk"
                        }
                        ,MotdFile: 'motd.txt'
                        ,PingFrequency: 10 // In seconds
                        ,MaxChannelList: 10 // Maximum number of channels returned in a RPL_LIST event
                }
        }
        ,Client: {
                // Server URL
                // NOTE: Should be based on http:// + Server.Port + : + Server.Host + /
                ServerUrl: "http://localhost:10000/"
        }
}