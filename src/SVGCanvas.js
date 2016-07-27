/**
 * Created by josh on 7/27/16.
 */

import React, { Component } from 'react';
import Rect from "./Rect";

class SVGCanvas extends Component {
    mouseMoved() {
    }

    renderModel(model) {
        var m = {
            get: function (key) {
                return model[key]
            }
        };
        return <Rect model={m} canvas={this}/>
    }

    render() {
        return <svg ref='canvas'
                    className="main-canvas grow"
                    onMouseMove={this.mouseMoved.bind(this)}>
            {this.renderModel(this.props.model)}
        </svg>
    }
}


export default SVGCanvas;