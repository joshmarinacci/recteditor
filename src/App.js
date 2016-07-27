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


class SVGCanvas extends Component {
    mouseMoved() {
    }
    renderModel() {
        var pos = {x:20, y:20};
        return <rect fill="cyan" stroke="#000000"
                     width="100" height="100"
                     x={pos.x} y={pos.y}
                     className="cursor"/>
    }
    render() {
        return <svg ref='canvas'
                    className="main-canvas"
                    onMouseMove={this.mouseMoved.bind(this)}>
            {this.renderModel()}
            </svg>
    }
}

class App extends Component {
    constructor(props) {
        super(props);
        var obj = {
            name:'unknown',
            x:0,
            y:20,
            w:50,
            h:30,
            fill:'#00ffff',
            stroke:'#000000',
            strokeWidth:1
        };
        this.state = {
            target:obj,
            format:{
                x:'number',
                y:'number',
                w:'number',
                h:'number',
                fill:'color',
                stroke:'color',
                strokeWidth:'number',
                name:'string'
            }
        }
    }
    propertyChanged(target,key,val,format) {
        console.log("got",key,val,format);
        if(format === 'number') {
            var value = Number.parseFloat(val);
            this.state.target[key] = value;
        } else {
            this.state.target[key] = val;
        }
        console.log("final value =", this.state.target[key]);
        this.setState({target:this.state.target})
    }
  render() {
    return (
      <div className="fill vbox">
          <h3 className="header">Shared Rect Editor</h3>
          <div className="hbox toolbar">
              <button>add</button>
              <button>delete</button>
              <button>undo</button>
              <button>redo</button>
          </div>
          <div className="hbox grow">
              <div className="grow">
                  <SVGCanvas model={this.state.target}/>
              </div>
              <div className="vbox">
                  <div className="grow scroll pane right-pane">
                      <PropertySheet
                          target={this.state.target}
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
