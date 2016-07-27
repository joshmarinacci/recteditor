/**
 * Created by josh on 7/27/16.
 */

import React, { Component } from 'react';

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
                <input ref={key} type="text" value={target[key]}
                       size="10"
                       onChange={this.changed.bind(this,key)}/>
                <label>{this.props.format[key]}</label>
            </div>
        });
    }
}

export default PropertySheet;