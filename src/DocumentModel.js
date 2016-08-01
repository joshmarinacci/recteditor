/**
 * Created by josh on 7/27/16.
 */

import {log} from "./util";

class SelectionProxy {
    constructor(nodes,model) {
        this.nodes = nodes;
        console.log('the nodes are',nodes);
        this.format =  {
            x: 'number',
            y: 'number',
            w: 'number',
            h: 'number',
            fill: 'color',
            stroke: 'color',
            strokeWidth: 'number',
            name: 'string'
        };
        this.model = model;
    }
    getCommonProps() {
        var props = {};
        this.nodes.forEach((node)=> {
            Object.keys(node).map((key)=> {
                if(!props[key]) props[key]=0;
                props[key]++;
            });
        });
        var p2 = [];
        for(var name in props) {
            p2.push(name);
        }
        return p2;
    }
    getPropertyValue(key) {
        return this.nodes[0][key];
    }
    setPropertyValue(key,value) {
        var format = this.getFormat(key);
        if (format === 'number') {
            var realValue = Number.parseFloat(value);
            this.distributeValue(key,realValue);
        } else {
            this.distributeValue(key,value);
        }
    }
    getFormat(key) {
        return this.format[key];
    }
    distributeValue(key,val) {
        this.nodes.forEach((node)=>{
            node[key] = val;
        });
        this.model.fireUpdate();
    }
}


var DocumentModel = {
    selected: [],
    listeners: [],
    model: [],
    onUpdate(cb) {
        this.listeners.push(cb);
    },
    fireUpdate() {
        this.listeners.forEach((cb)=>{cb()})
    },
    isSelected(obj) {
        return this.selected.indexOf(obj) >= 0;
    },
    addSelection(obj) {
        this.selected.push(obj);
        this.listeners.forEach((cb)=>{cb()})
    },
    setSelection(obj) {
        this.selected = [obj];
        this.listeners.forEach((cb)=>{cb()})
    },
    clearSelection() {
        this.selected = [];
        this.listeners.forEach((cb)=>{cb()})
    },
    getSelectionProxy() {
        return new SelectionProxy(this.selected,this);
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
    resized(model, diff) {
        model.w += diff.x;
        model.h += diff.y;
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
