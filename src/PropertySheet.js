/**
 * Created by josh on 7/27/16.
 */

import React, { Component } from 'react';
import {renderClass} from "./util";


class IndeterminateInput extends Component {
    constructor(props) {
        super(props);
        this.state = {
            value:props.target.getPropertyValue(props.name)
        }
    }
    componentWillReceiveProps(nextProps) {
        var v2 = nextProps.target.getPropertyValue(nextProps.name);
        if(v2 !== this.state.value) {
            this.setState({value:v2});
        }
    }
    changed() {
        var key = this.props.name;
        var value = this.refs.input.value;
        this.setState({
            value:value
        });
        var format = this.props.target.getFormat(key);
        if(format === 'number') {
            var realValue = Number.parseFloat(value);
            if(Number.isNaN(realValue)) {
                return;
            }
            this.props.target.setPropertyValue(key,realValue);
            return;
        }
        this.props.target.setPropertyValue(key,value);
    }
    render() {
        var key = this.props.name;
        var ind = this.props.target.isIndeterminate(key);
        var clss = { };
        if(ind) clss.indeterminate = true;
        return <input
            ref='input'
            className={renderClass(clss)}
            type="text"
            value={this.state.value}
            size="10"
            onChange={this.changed.bind(this)}/>
    }
}


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
        return <IndeterminateInput
            target={target}
            name={key}
            value={target.getPropertyValue(key)}
            key={key}
        />;
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
