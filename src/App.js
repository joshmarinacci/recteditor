import React, { Component } from 'react';
import "./appy-style/layout.css";
import "./appy-style/look.css";
import "./index.css";
import PropertySheet from "./PropertySheet";
import SVGCanvas from "./SVGCanvas";
import DocumentModel from "./DocumentModel"
//import {log} from "./util";

class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            model: null
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

    render() {
        return (
            <div className="fill vbox">
                <h3 className="header">Shared Rect Editor</h3>
                <div className="hbox toolbar">
                    <button onClick={this.add.bind(this)}>add</button>
                    <button onClick={this.delete.bind(this)}>delete</button>
                    <button>undo</button>
                    <button>redo</button>
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
