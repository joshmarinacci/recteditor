/**
 * Created by josh on 7/27/16.
 */

import React, { Component } from 'react';
import Rect from "./Rect";

class SVGCanvas extends Component {
    mouseMoved() {
    }

    renderModel(model) {
        return model.map((mod,i)=>{
            return <Rect key={i} model={mod} canvas={this}/>
        })
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