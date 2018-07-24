import React from 'react';
import Cookies from 'js-cookie';
import Chat from './Chat.jsx';
import AuthenticatingBanner from '../Layout/Banner/AuthenticatingBanner.jsx';
import { LoggedInNavigation } from '../Layout/LoggedInNavigation.jsx';

export default class Message extends React.Component {
    constructor(props) {
        super(props);

        this.loadMessageRoom = this.loadMessageRoom.bind(this)

        this.state = {

            userIdFrom: null,
            userNameFrom: null,
            userIdTo: null,
            userNameTo: null,
            roomId: null
        }

    };

    componentDidMount() {
        this.loadMessageRoom();
    };


    loadMessageRoom() {
        var cookies = Cookies.get('marsAuthToken');
        var MsgTo = $('#message-section').attr('data-message-to')
        console.log(MsgTo)
        this.setState({
            userIdTo: MsgTo
        })
    }

    render() {
        return (
            <React.Fragment>
                <AuthenticatingBanner />
                <LoggedInNavigation />
                <Chat userIdFrom={this.state.userIdFrom} userIdTo={this.state.userIdTo} userNameFrom={this.state.userNameFrom} userNameTo={this.state.userNameTo} />
            </React.Fragment>
        )
    }
}
