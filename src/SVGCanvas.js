/**
 * Created by josh on 7/27/16.
 */

import React, { Component } from 'react';
import Rect from "./Rect";
import DocumentModel from "./DocumentModel"

class SVGCanvas extends Component {
    mouseMoved() {
    }
    mouseDown() {
        DocumentModel.clearSelection();
    }

    renderModel(model) {
        return model.map((mod,i)=>{
            return <Rect key={i} model={mod} canvas={this}/>
        })
    }

    render() {
        return <svg ref='canvas'
                    className="main-canvas grow"
                    onMouseMove={this.mouseMoved.bind(this)}
                    onMouseDown={this.mouseDown.bind(this)}
        >
            <defs>
                <filter id="white-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feFlood result="flood" floodColor="#ff3300" floodOpacity="1" />
                    <feComposite in="flood" result="mask" in2="SourceGraphic" operator="in"/>
                    <feMorphology in="mask" result="dilated" operator="dilate" radius="2"/>
                    <feGaussianBlur in="dilated" result="blurred" stdDeviation="1"/>
                    <feMerge>
                        <feMergeNode in="blurred"></feMergeNode>
                        <feMergeNode in="SourceGraphic"></feMergeNode>
                    </feMerge>
                </filter>
            </defs>
            {this.renderModel(this.props.model)}
        </svg>
    }
}


export default SVGCanvas;