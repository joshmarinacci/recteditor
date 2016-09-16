import PubNub from "pubnub";
/**
 * Created by josh on 7/27/16.
 */

const COLORS = ['red','blue','green','orange','yellow','purple','brown','lightBlue'];

class SelectionProxy {
    constructor(nodes,model) {
        this.nodes = nodes;
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
                if(key === 'id') return "";
                if(!props[key]) props[key]=0;
                props[key]++;
                return "";
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
    isIndeterminate(key) {
        if(this.nodes.length <= 1) return false;

        var val = this.nodes[0][key];
        var diff = false;
        this.nodes.forEach((node) => {
            var v2 = node[key];
            if(val !== v2) {
                diff = true;
            }
        });
        return diff;
    }
}


function pick(arr) {
    return arr[Math.floor(Math.random()*arr.length)];
}

var DocumentModel = {
    selected: [],
    listeners: [],
    model: [],
    users:{},
    fire: function() {
        this.listeners.forEach((cb)=>{cb()})
    },
    connect() {
        console.log("connecting to pubnub", PubNub);
        this.pubnub = new PubNub({
            publishKey:'pub-c-84cc1e5d-138c-4366-a642-f2f8c6d63fac',
            subscribeKey:'sub-c-386922f6-6e17-11e6-91d9-02ee2ddab7fe',
            uuid: 'my_uuid'+Math.floor(Math.random()*1000),
        });
        var self = this;
        this.pubnub.addListener({
            status: function(status) {
                console.log("got status",status);
            },
            message: function(message) {
                if(message.message.uuid === self.pubnub.getUUID()) return;
                if(message.message.type === 'add') {
                    self.processRemoteAdd(message.message);
                }
                if(message.message.type === 'delete') {
                    self.processRemoteDelete(message.message);
                }
                if(message.message.type === 'change') {
                    self.processRemoteChange(message.message);
                }
            },
            presence: function(pres) {
                console.log("got presence",pres);
                if(pres.action == 'state-change') {
                    console.log("it's state changing");
                    self.users[pres.uuid] = {
                        username:pres.state.username,
                        color: pres.state.color
                    };
                    self.fire();
                }
                console.log("users are", self.users);
            }
        });
        this.pubnub.subscribe({
            channels:['document'],
            withPresence:true
        });
        this.users[this.pubnub.getUUID()] = {
            username:'unnamed-user',
            color: pick(COLORS),
        };


        setTimeout(()=> {
            this.pubnub.hereNow({
                channels:['document'],
                includeUUIDs:true,
                includeState:true
            },function(status,resp){
                console.log("herenow",status,resp);
                var oc = resp.channels.document.occupants;
                console.log("oc = ", oc);
                oc.forEach((state)=>{
                    console.log(state);
                    if(state.state) {
                        self.users[state.uuid] = state.state;
                    }
                })
                self.fire();
            });
        },1000);
    },

    getUsers() {
        return this.users;
    },

    setUsername(username) {
        this.pubnub.setState({
            state:{
                username:username,
                color:this.users[this.pubnub.getUUID()].color
            },
            channels:['document']
        })
    },

    processRemoteAdd(msg) {
        this.model.push(msg.node);
        this.listeners.forEach((cb)=>{cb()})
    },
    findLocalRect(node) {
        return this.model.find((rect)=>rect.id===node.id);
    },
    removeLocalRect(node) {
        var n = this.model.indexOf(node);
        if(n >= 0) {
            this.model.splice(n,1);
        } else {
            console.log("warning! node not found",node);
        }
    },
    processRemoteDelete(msg) {
        var rect = this.findLocalRect(msg.node);
        this.removeLocalRect(rect);
        this.listeners.forEach((cb)=>{cb()})
    },
    processRemoteChange(msg) {
        var node = this.findLocalRect(msg.node);
        ['x','y','w','h'].forEach((prop)=>{
            if(msg.node[prop]) {
                node[prop] = msg.node[prop];
            }
        });
        this.listeners.forEach((cb)=>{cb()})
    },
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
    deleteSelection() {
        this.selected.forEach((rect)=>{
            var n = this.model.indexOf(rect);
            if(n >= 0) {
                this.model.splice(n,1);
            } else {
                console.log("warning! node not found",rect);
            }
            this.pubnub.publish({
                channel:'document',
                message: {
                    uuid: this.pubnub.getUUID(),
                    type:'delete',
                    node: rect
                }
            });
        });
        this.selected = [];
        this.listeners.forEach((cb)=>{cb()})
    },
    getSelectionProxy() {
        return new SelectionProxy(this.selected,this);
    },
    getProperty(obj,key) {
        return obj[key];
    },
    //setProperty(obj,key,val,format) {
    //    obj[key] = val;
    //    this.listeners.forEach((cb)=>{cb()})
    //},
    publishNodeChange(model, props){
        var payload = {};
        props.forEach((prop)=>{
            payload[prop] = model[prop]
        });
        payload.id = model.id;
        this.pubnub.publish({
            channel:'document',
            message: {
                uuid: this.pubnub.getUUID(),
                type:'change',
                node: payload
            }
        });
        this.listeners.forEach((cb)=>{cb()})
    },
    moved(node, diff) {
        node.x += diff.x;
        node.y += diff.y;
        this.publishNodeChange(node,['x','y']);
    },
    resized(node, diff) {
        node.w += diff.x;
        node.h += diff.y;
        this.publishNodeChange(node,['w','h']);
    },
    getModel() {
        return this.model
    },
    createRect() {
        return {
            id: Math.floor(Math.random()*1*1000*1000),
            name:'unamed rect',
            x: 100,
            y: 100,
            w: 100,
            h: 100,
            fill: '#ff0000',
            stroke:"#000000",
            strokeWidth:1
        }
    },
    addRect(rect) {
        this.model.push(rect);
        this.pubnub.publish({
            channel:'document',
            message: {
                uuid: this.pubnub.getUUID(),
                type:'add',
                node: rect
            }
        });

        this.listeners.forEach((cb)=>{cb()})
    }
};


DocumentModel.connect();

export default DocumentModel;
