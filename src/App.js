import React, { Component } from 'react';
import PubNub from "pubnub";
import "./appy-style/layout.css";
import "./appy-style/look.css";
import "./index.css";
import PropertySheet from "./PropertySheet";
import SVGCanvas from "./SVGCanvas";
import DocumentModel from "./DocumentModel"
import PresenceService from './services/PresenceService';

import {log, randi, pick, COLORS} from "./util";
const CHANNEL = "my-doc-1";

class UserList extends Component {
    render() {
        return <b>{Object.keys(this.props.users).map((name,i) => {
            var user = this.props.users[name];
            return <a key={i} style={{
                backgroundColor:user.color,
                border: '1px solid white'
            }}>{user.username} </a>
        })}</b>
    }
}

class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            model: null,
            username: 'someuser',
            users:[]
        };
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
        this.pres.setUserState({
            username:'random-username'+randi(0,100),
            color:pick(COLORS)
        });

        DocumentModel.onUpdate(()=> {
            this.setState({model:DocumentModel.getModel()});
        });
    }

    add() {
        DocumentModel.addRect(DocumentModel.createRect());
    }
    delete() {
        DocumentModel.deleteSelection();
    }

    editUsername() {
        this.setState({
            username: this.refs.username.value
        });
    }

    editUsernameEnter(e) {
        if(e.keyCode === 13) {
            console.log("changing name to ", this.state.username);
            this.pres.setUserState({
                username: this.state.username
            });
        }
    }

    render() {
        return (
            <div className="fill vbox">
                <h3 className="header">Shared Rect Editor</h3>
                <div className="hbox toolbar">
                    <button onClick={this.add.bind(this)}>add</button>
                    <button onClick={this.delete.bind(this)}>delete</button>
                    <button>undo</button>
                    <button>redo</button>
                    <span className="grow"></span>
                    <UserList users={this.state.users}/>
                    <span className="grow"></span>
                    <input type="text" ref='username' value={this.state.username} onChange={this.editUsername.bind(this)} onKeyDown={this.editUsernameEnter.bind(this)}/>
                </div>
                <div className="hbox grow">
                    <div className="grow">
                        <SVGCanvas model={DocumentModel.getModel()}/>
                    </div>
                    <div className="vbox">
                        <div className="grow scroll pane right-pane">
                            <PropertySheet
                                target={DocumentModel.getSelectionProxy()}
                            />
                        </div>
                        <div className="">list</div>
                    </div>
                </div>
                <div className="statusbar">status bar</div>
            </div>
        );
    }
}

export default App;
