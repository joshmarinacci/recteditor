import React, { Component } from 'react';
import "./appy-style/layout.css";
import "./appy-style/look.css";
import "./index.css";
import PropertySheet from "./PropertySheet";
import SVGCanvas from "./SVGCanvas";
import DocumentModel from "./DocumentModel"
//import {log} from "./util";

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
            username: 'someuser'
        };
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
        })
    }

    editUsernameEnter(e) {
        if(e.keyCode === 13) {
            console.log("changing name to ", this.state.username);
            DocumentModel.setUsername(this.state.username);
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
                    <UserList users={DocumentModel.getUsers()}/>
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
