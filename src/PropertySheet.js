/**
 * Created by josh on 7/27/16.
 */

import React, { Component } from 'react';
import {log} from "./util";


class PropertySheet extends Component {
    changed(key) {
        var value = this.refs[key].value;
        console.log("the key was changed",key,value);
        this.props.onChange(this.props.target,key,value,this.props.format[key]);
    }
    render() {
        return <div id="property-sheet">
            <h3 className="header">properties</h3>
            <div className="vbox form">{this.renderProperties(this.props.target)}</div>
        </div>
    }

    renderProperties(target) {
        if(!target) return "";
        return Object.keys(target).sort().map((key)=>{
            return <div className="hbox" key={key}>
                <label>{key}</label>
                {this.renderEditor(target,key,this.props.format[key])}
                <label>{this.props.format[key]}</label>
            </div>
        });
    }

    renderEditor(target,key,format) {
        if(format === 'color') return this.renderColorEditor(target,key);
        return <input
            ref={key}
            type="text"
            value={target[key]}
            size="10"
            onChange={this.changed.bind(this,key)}/>
    }

    renderColorEditor(target, key) {
        return <ColorButton target={target} pkey={key} onChange={this.props.onChange}/>
    }

}

export default PropertySheet;


class ColorButton extends Component {

    render() {
        var colors = ["#ff0000","#00ff00","#0000ff","#ffffff","#000000"];
        var color = this.props.target[this.props.pkey];
        return <div className="dropdown">
            <button className="dropbtn"
                    style={{ backgroundColor:color}}
            >Dropdown</button>
            <div className="dropdown-content">
                {colors.map((c,i)=><a
                    key={i}
                    style={{backgroundColor:c}}
                    onClick={this.changeColor.bind(this,c)}
                >X</a>)}
            </div>
        </div>
    }

    changeColor(color) {
        this.props.onChange(this.props.target, this.props.pkey,color,'color')
    }
}
