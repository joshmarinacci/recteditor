/**
 * Created by josh on 7/27/16.
 */

import React, { Component } from 'react';
import DocumentModel from "./DocumentModel"
import {log} from "./util";

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
    }

    render() {
        var selected = DocumentModel.isSelected(this.props.model);
        var mod = this.props.model;
        function g(key) {
            return DocumentModel.getProperty(mod,key);
        }
        var rect = <rect ref='rect'
                         width={g('w')}
                         height={g('h')}
                         x={g('x')}
                         y={g('y')}
                         fill={g('fill')}
                         stroke={g('stroke')}
                         strokeWidth={g('strokeWidth')}
                         className={selected?"selected":"unselected"}
                         onMouseDown={this.mouseDown.bind(this)}
                         onMouseMove={this.mouseMove.bind(this)}
                         onMouseUp={this.mouseUp.bind(this)}
        />;
        return rect
    }

    mouseDown(e) {
        var bounds = this.props.canvas.refs.canvas.getBoundingClientRect();
        var curr = {x: e.clientX - bounds.left, y: e.clientY - bounds.top};
        this.setState({
            pressed: true,
            prev: curr
        });
        DocumentModel.setSelected(this.props.model);
        //attach to the document
        document.addEventListener("mousemove", this.documentMouseMove_listener);
        document.addEventListener("mouseup", this.documentMouseUp_listener);
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
        this.setState({
            prev: curr
        });
    }

    documentMouseUp(e) {
        document.removeEventListener('mousemove', this.documentMouseMove_listener);
        document.removeEventListener('mouseup', this.documentMouseUp_listener);
        this.setState({
            pressed: false
        })
    }
}

export default Rect;