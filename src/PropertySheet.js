/**
 * Created by josh on 7/27/16.
 */

import React, { Component } from 'react';
import {log} from "./util";


class PropertySheet extends Component {
    changed(key) {
        var value = this.refs[key].value;
        this.props.target.setPropertyValue(key,value);
    }
    render() {
        return <div id="property-sheet">
            <h3 className="header">properties</h3>
            <div className="vbox form">{this.renderProperties(this.props.target)}</div>
        </div>
    }

    renderProperties(target) {
        if(!target) return "";
        return target.getCommonProps().sort().map((key) => {
            return <div className="hbox" key={key}>
                <label>{key}</label>
                {this.renderEditor(target,key,target.getFormat(key))}
                <label>{target.getFormat(key)}</label>
            </div>
        });

    }

    renderEditor(target,key,format) {
        if(format === 'color') return this.renderColorEditor(target,key);
        return <input
            ref={key}
            type="text"
            value={target.getPropertyValue(key)}
            size="10"
            onChange={this.changed.bind(this,key)}/>
    }

    renderColorEditor(target, key) {
        return <ColorButton target={target} pkey={key}/>
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
        this.props.target.setPropertyValue(this.props.pkey,color);
    }
}
