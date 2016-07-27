/*
 import appy-style

 create a dummy model store
 create a model store using immutable js

 render SVG w/ a few rects in it
 buttons for undo/redo/new/delete

 selection class, is it versioned with undos?

 when selecting rects, show union or intersection of properties in a generic property editor

 std properties:

 rect {
 x:
 y:
 w:
 h:
 color:
 strokeWidth:
 strokeColor:
 }

 list view, shows list of rects, and which are selected

 panels can be collapsed


 */
import React, { Component } from 'react';
import "./appy-style/layout.css";
import "./appy-style/look.css";
import "./index.css";
import PropertySheet from "./PropertySheet";
import SVGCanvas from "./SVGCanvas";
import DocumentModel from "./DocumentModel"
import {log} from "./util";





class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            format: {
                x: 'number',
                y: 'number',
                w: 'number',
                h: 'number',
                fill: 'color',
                stroke: 'color',
                strokeWidth: 'number',
                name: 'string'
            }
        };
        DocumentModel.onUpdate(()=> {
            this.setState({format:this.state.format});
        });
    }

    propertyChanged(target, key, val, format) {
        console.log("got", key, val, format);
        if (format === 'number') {
            var value = Number.parseFloat(val);
            DocumentModel.setProperty(target,key,value,format);
            //this.state.target[key] = value;
        } else {
            //this.state.target[key] = val;
            DocumentModel.setProperty(target,key,val,format);
        }
        //console.log("final value =", this.state.target[key]);
        //this.setState({target: this.state.target})
    }

    add() {
        log("adding")
        DocumentModel.moved(0,{x:20,y:0});
    }

    render() {
        return (
            <div className="fill vbox">
                <h3 className="header">Shared Rect Editor</h3>
                <div className="hbox toolbar">
                    <button onClick={this.add.bind(this)}>add</button>
                    <button>delete</button>
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
                                target={DocumentModel.getModel()}
                                format={this.state.format}
                                onChange={this.propertyChanged.bind(this)}
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
