import React, { Component } from 'react';
import Cookies from 'js-cookie';
import { HubConnection, HubConnectionBuilder, HttpConnection, IHttpConnectionOptions, TransportType, NullLogger, LogLevel, JsonHubProtocol } from '@aspnet/signalr';

class Chat extends Component {
    constructor(props) {
        super(props);

        this.state = {
            nick: this.props.userNameFrom,
            userId: this.props.userIdFrom,
            message: '',
            messages: [],
            historyMessages: [],
            hubConnection: null,
            roomId: this.props.roomId,
            profilePhotoSrc : null
        };
        this.sendMessage = this.sendMessage.bind(this);
        this.createNewConnection = this.createNewConnection.bind(this);
        this.configureConnection = this.configureConnection.bind(this)
        this.leaveConnection = this.leaveConnection.bind(this);
        this.checkPressEnter = this.checkPressEnter.bind(this);
        this.scrollToBottom = this.scrollToBottom.bind(this);
        
    } 

    componentDidUpdate(prevProps, prevState) {
        if (this.props.userIdTo != '' && this.props.userIdTo != prevProps.userIdTo) {
            if (prevProps.userIdTo != null) {
                this.leaveConnection(prevState.roomId, this.state.nick);
            }

            this.createNewConnection();
            this.getProfilePhoto();
        }
    }

    leaveConnection(roomId, userName) {
        this.state.hubConnection
            .invoke('leaveGroup', roomId, userName)
            .catch(err => console.error(err));
        this.setState({ messages: [], message: ''});
    }

    createNewConnection() {

        let userId = this.props.userIdTo;
        let nick = this.props.userNameFrom;
        let build = new HubConnectionBuilder();
        let options = {}
        let token = Cookies.get('marsAuthToken');
        options.accessTokenFactory = () => token

        build.withUrl(`http://localhost:60190/chat?userId=${userId}&access_token=${token}`)
        const hubConnection = build.build()

        this.setState({ hubConnection, nick, userId }, () => {
            this.state.hubConnection
                .start()
                .then(this.configureConnection)
                .catch(err => console.log(err))

            
        });
    }

    configureConnection() {
        this.state.hubConnection.on('joinChat', (room) => {
            console.log('Room: ' + room)
            this.setState({
                roomId: room
            })
        })

        this.state.hubConnection.on('leaveChat', (nick) => {
            //const text = `${nick} left the chat`;
            //const messages = this.state.messages.concat([text]);
            //this.setState({ messages});
        });

        this.state.hubConnection.on('sendMsg', (room, userId, receivedMessage) => {
            const text = `${userId} : ${receivedMessage}`;
            const messages = this.state.messages.concat([text]);
            this.setState({ messages });
            this.scrollToBottom();
        });

        this.state.hubConnection.on('sendHistory', history => {
            console.log(history);
            const text = history.map(x => `${x.id} : ${x.textMsg}`)
            const messages = text.concat(this.state.messages)
            this.setState({ messages })
        })
    }

    sendMessage() {
        this.state.hubConnection
            .invoke('sendMessageToUser', this.props.userIdTo, this.state.userId, this.state.message)
            .catch(err => console.error(err));
        this.setState({ message: '' });
        document.getElementById("chatTextBox").focus();
    };

    checkPressEnter(e) {
        if (e.keyCode == 13) {
            document.getElementById('btnSend').click();
        }
    };

    getProfilePhoto() {

        var cookies = Cookies.get('marsAuthToken');

        $.ajax({
            url: PROFILE_API + '/profile/profile/getProfilePhoto/?uid=' + this.props.userIdTo,
            headers: {
                'Authorization': 'Bearer ' + cookies,
                'Content-Type': 'application/json'
            },
            type: "GET",
            contentType: "application/json",
            dataType: "json",
            success: function (res) {
                this.setState({
                    profilePhotoSrc: res.photoSrc,
                })
            }.bind(this)

        });
    }

    

    

    scrollToBottom() {

        var element = document.getElementById("chatBox");
        element.scrollTop = element.scrollHeight;
    }


    render() {

        const styleToChat = {
            overflowY: 'auto'
        }


        const styleSelf = {
            overflowY: 'auto'
        }


        return (
            <div className="ui grid">
                <div className="four wide column">&nbsp;</div>
                <div className="ten wide column">
                <div className="ui form">
                <div><img className="ui avatar tiny image" src={this.state.profilePhotoSrc} />{this.props.userNameTo}</div>
                <div style={{ align: 'center', width: 500}}> 
                     <span id="chatBox" className="ui blue segment" style={{ display: 'block', height: 500, width: 650, align: 'center', overflowY: 'auto' }} >
                         {this.state.historyMessages.map((historyMessage, index) => (
                                    <div>{this.state.userId == historyMessage.substring(0, historyMessage.indexOf(" : ")) ? <div key={index} style={{ color: 'blue', textAlign: 'right' }}>{historyMessage.substring(historyMessage.indexOf(":") + 1)}</div> : <div key={index} style={{ color: 'red', textAlign: 'left' }}>{historyMessage.substring(historyMessage.indexOf(":") + 1)}</div>}</div>
                          ))}
                        {this.state.messages.map((message, index) => (
                                    <div>{this.state.userId == message.substring(0, message.indexOf(" : ")) ? <div key={index} style={{ color: 'blue', textAlign: 'right' }}>{message.substring(message.indexOf(":") + 1)}</div> : <div key={index} style={{ color: 'red', textAlign: 'left' }}>{message.substring(message.indexOf(":") + 1)}</div>}</div> 
                        ))}
                     </span>


                            
                   
                </div>

                <br />
                <div className="ui grid">
                    <div className="fourteen wide column">
                            <input className="ui fluid" type="text" id="chatTextBox" style={{ width: 570 }} value={this.state.message} onChange={e => this.setState({ message: e.target.value })} onKeyDown={this.checkPressEnter} placeholder="Type your message here..." />
                            &nbsp;
                            <button className="ui blue button" id="btnSend" onClick={this.sendMessage}>Send</button>
                        </div>
                  
                </div>
                </div>
                </div>
                <div className="two wide column">&nbsp;</div>
            </div>
        );
    }
}

export default Chat;