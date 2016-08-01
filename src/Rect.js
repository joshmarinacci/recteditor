/**
 * Created by josh on 7/27/16.
 */

import React, { Component } from 'react';
import DocumentModel from "./DocumentModel"
//import {log} from "./util";

class Rect extends Component {
    constructor(props) {
        super(props);
        this.state = {
            pressed: false,
            prev: null
        };
        //make bound versions of some callbacks
        this.documentMouseMove_listener = this.documentMouseMove.bind(this);
        this.documentMouseUp_listener = this.documentMouseUp.bind(this);
        this.documentResizerMouseMove_listener = this.documentResizerMouseMove.bind(this);
        this.documentResizerMouseUp_listener   = this.documentResizerMouseUp.bind(this);
    }

    renderRect(mod, selected) {
        function g(key) {
            return DocumentModel.getProperty(mod,key);
        }
        return <rect ref='rect'
                     width={g('w')}
                     height={g('h')}
                     fill={g('fill')}
                     stroke={g('stroke')}
                     strokeWidth={g('strokeWidth')}
                     className={selected?"selected":"unselected"}
                     onMouseDown={this.mouseDown.bind(this)}
                     onMouseMove={this.mouseMove.bind(this)}
                     onMouseUp={this.mouseUp.bind(this)}

        />;
    }

    render() {
        var selected = DocumentModel.isSelected(this.props.model);
        var mod = this.props.model;

        function g(key) {
            return DocumentModel.getProperty(mod,key);
        }
        var trans = "translate("+g('x')+","+g('y')+")";
        var handle = "";
        if(selected) {
            handle = <circle r="8" cx={g('w')} cy={g('h')} onMouseDown={this.resizerMouseDown.bind(this)}/>
        }
        return <g transform={trans}>
            {this.renderRect(mod,selected)}
            {handle}
        </g>
    }

    mouseDown(e) {
        e.stopPropagation();
        var bounds = this.props.canvas.refs.canvas.getBoundingClientRect();
        var curr = {x: e.clientX - bounds.left, y: e.clientY - bounds.top};
        this.setState({
            pressed: true,
            prev: curr
        });
        if(e.shiftKey) {
            DocumentModel.addSelection(this.props.model);
        } else {
            DocumentModel.setSelection(this.props.model);
        }
        //attach to the document
        document.addEventListener("mousemove", this.documentMouseMove_listener);
        document.addEventListener("mouseup", this.documentMouseUp_listener);
    }

    resizerMouseDown(e) {
        e.stopPropagation();
        var bounds = this.props.canvas.refs.canvas.getBoundingClientRect();
        var curr = {x: e.clientX - bounds.left, y: e.clientY - bounds.top};
        this.setState({
            pressed: true,
            prev: curr
        });
        DocumentModel.setSelection(this.props.model);
        //attach to the document
        document.addEventListener("mousemove", this.documentResizerMouseMove_listener);
        document.addEventListener("mouseup", this.documentResizerMouseUp_listener);
    }

    mouseMove(e) {
    }

    mouseUp(e) {
    }

    documentMouseMove(e) {
        var bounds = this.props.canvas.refs.canvas.getBoundingClientRect();
        var curr = {x: e.clientX - bounds.left, y: e.clientY - bounds.top};
        var diff = {x: curr.x - this.state.prev.x, y: curr.y - this.state.prev.y};
        DocumentModel.moved(this.props.model, diff);
        this.setState({ prev: curr });
    }
    documentResizerMouseMove(e) {
        var bounds = this.props.canvas.refs.canvas.getBoundingClientRect();
        var curr = {x: e.clientX - bounds.left, y: e.clientY - bounds.top};
        var diff = {x: curr.x - this.state.prev.x, y: curr.y - this.state.prev.y};
        DocumentModel.resized(this.props.model, diff);
        this.setState({ prev: curr });
    }

    documentMouseUp(e) {
        document.removeEventListener('mousemove', this.documentMouseMove_listener);
        document.removeEventListener('mouseup', this.documentMouseUp_listener);
        this.setState({ pressed: false });
    }
    documentResizerMouseUp(e) {
        document.removeEventListener('mousemove', this.documentResizerMouseMove_listener);
        document.removeEventListener('mouseup', this.documentResizerMouseUp_listener);
        this.setState({ pressed: false });
    }
}

export default Rect;