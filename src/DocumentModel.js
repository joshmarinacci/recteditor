/**
 * Created by josh on 7/27/16.
 */

var DocumentModel = {
    selected: null,
    listeners: [],
    model: null,
    onUpdate(cb) {
        this.listeners.push(cb);
    },
    isSelected(obj) {
        return obj === this.selected;
    },
    setSelected(obj) {
        this.selected = obj;
    },
    moved(index, diff) {
        this.model.x += diff.x;
        this.model.y += diff.y;
        this.listeners.forEach((cb)=>{cb()})
    },
    getModel() {
        return this.model
    }
};

DocumentModel.model = {
    name: 'unknown',
    x: 0,
    y: 20,
    w: 50,
    h: 30,
    fill: '#00ffff',
    stroke: '#000000',
    strokeWidth: 1
};


export default DocumentModel;
