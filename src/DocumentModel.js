/**
 * Created by josh on 7/27/16.
 */

import {log} from "./util";

var DocumentModel = {
    selected: null,
    listeners: [],
    model: [],
    onUpdate(cb) {
        this.listeners.push(cb);
    },
    isSelected(obj) {
        return obj === this.selected;
    },
    getSelected() {
        return this.selected;
    },
    setSelected(obj) {
        this.selected = obj;
        this.listeners.forEach((cb)=>{cb()})
    },
    getProperty(obj,key) {
        return obj[key];
    },
    setProperty(obj,key,val,format) {
        obj[key] = val;
        this.listeners.forEach((cb)=>{cb()})
    },
    moved(model, diff) {
        model.x += diff.x;
        model.y += diff.y;
        this.listeners.forEach((cb)=>{cb()})
    },
    getModel() {
        return this.model
    }
};

DocumentModel.model.push({
    name: 'unknown',
    x: 0,
    y: 20,
    w: 50,
    h: 30,
    fill: '#00ffff',
    stroke: '#000000',
    strokeWidth: 1
});

DocumentModel.model.push({
    name: 'unknown2',
    x: 100,
    y: 20,
    w: 50,
    h: 30,
    fill: '#ffff00',
    stroke: '#00ff00',
    strokeWidth: 3
});

export default DocumentModel;
