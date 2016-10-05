import PubNub from "pubnub";
import React, { Component } from 'react';
import "./appy-style/layout.css";
import "./appy-style/look.css";
import "./index.css";
import PresenceService from './services/PresenceService';

const CHANNEL = "my-doc-1";

const COLORS = ['red','blue','green','orange','yellow','purple','brown','lightBlue'];
function pick(arr) {
    return arr[Math.floor(Math.random()*arr.length)];
}
function randi(min,max) {
    return min + Math.floor(Math.random()*(max-min))
}


class App extends Component {
    constructor() {
        super();
        this.state = {
            users:[]
        };
        console.log("connecting to pubnub", PubNub);
        this.uuid = 'my_uuid'+Math.floor(Math.random()*1000);
        this.pubnub = new PubNub({
            publishKey:'pub-c-84cc1e5d-138c-4366-a642-f2f8c6d63fac',
            subscribeKey:'sub-c-386922f6-6e17-11e6-91d9-02ee2ddab7fe',
            uuid: this.uuid,
            presenceTimeout: 30
        });
        this.pres = new PresenceService({
            pubnub:this.pubnub,
            channel:CHANNEL
        });
        this.pres.onChange(()=> this.setState({users:this.pres.getUsers()}));

/*        this.pubnub.addListener({
            status: function(status) {
                console.log("got status",status);
            },
            message: function(message) {
                console.log("got a message",message);
            },
            presence: function(pres) {
                console.log("got presence",pres);
            }
        });*/
        this.pubnub.setState({
            state:{
                username:'random-username'+randi(0,100),
                color:pick(COLORS)
            },
            channels:[CHANNEL]
        });

    }
    render() {
        var users = this.state.users.map((user)=>{
            return <li key={user.uuid}>user {user.uuid} : {user.username} : {user.color} {(user.uuid == this.uuid)?"ME":""}</li>
        });
        var me = this.pres.getUserInfo(this.uuid);
        console.log("me is",me);
        return <div className="fill hbox">
            <div className="debug">me: {me.uuid} : {me.username} : {me.color}</div>
            <ol className="debug grow">{users}</ol>
            <div className="debug">cursors go here</div>
        </div>
    }
}

export default App;



