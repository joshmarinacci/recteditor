let assert = require('assert');
/**
 * Created by josh on 10/4/16.
 */

    /*
     build a system which represents:
     the network
     user A and B
     each user has model, undo stack, outbox
     simulate sending and receiving messages
     simulate disconnection and waiting time


     map is set of key value pairs
     array is set of key value pairs where the keys are 0, 1, 2, etc.

     when connect, fetch the history from the start
     play the history from the start
     when action comes in from the network apply it if possible. process outbox.
     when user performs action, add to undo stack, add to outbox stack. process outbox.
     when user is disconnected, show status to user
     when user is disconnected and performs action, add to undo stack and outbox stack, don't process outbox
     when user reconnects, fetch history, apply locally, process outbox
     when user's own event comes from the network, pull out of the outbox. process outbox.


     */
class Network {
    constructor() {
        this.reset();
    }
    reset() {
        this.users = {};
        this.history = [];
    }
    createUser(id) {
        return (this.users[id] = new User(id,this));
    }
    broadcast(action, user) {
        action.user = user.id;
        action = clone(action);
        this.history.push(action);
        Object.keys(this.users).forEach((id)=>{
            this.users[id].networkActionHappened(action);
        })
    }
    fetchHistory() {
        return this.history;
    }
}

class User {
    constructor(id, network) {
        this.id = id;
        this.network = network;
        this.objects = {};
        this.undostack = [];
        this.undoindex = -1;
        this.outbox = [];
        this.connected = false;
        this.actionCount = 0;
    }
    connect() {
        this.log('connecting');
        this.connected = true;

        //replay history we missed
        var hist = this.network.fetchHistory();
        hist.forEach((action)=>{
            action = Actions.fromClone(action);
            //skip own actions
            if(action.user == this.id) return;
            //perform the action locally
            action.perform(this);
        });
        //send out pending actions from the outbox
        this.outbox.forEach((action) =>{
            // only send out valid actions
            if(action.valid(this)) this.network.broadcast(action,this);
        });
    }
    disconnect() {
        console.log(this.id,'disconnecting');
        this.connected = false;
    }
    broadcast(action) {
        this.actionCount++;
        action.id = 'action_'+this.actionCount;
        this.outbox.push(action);
        if(this.connected) this.network.broadcast(action,this);
    }
    createObject(id) {
        this.log('creating',id);
        var action = new CreateAction(id);
        this.undostack.push(action);
        this.undoindex = this.undostack.length-1;
        action.perform(this);
        this.broadcast(action);
        return this.objects[id];
    }
    propChanged(object,key,value,oldValue) {
        this.log('changing',object.id+'.'+key,'=>',value);
        var action = new ChangeAction(object.id, key, value, oldValue);
        this.undostack.push(action);
        this.undoindex = this.undostack.length-1;
        this.broadcast(action);
    }
    log() {
        console.log(this.id+":",Array.prototype.slice.call(arguments).join(" "));
    }
    deleteObject(id) {
        this.log('deleting',id);
        var action = new DeleteAction(id);
        this.undostack.push(action);
        this.undoindex = this.undostack.length-1;
        action.perform(this);
        this.broadcast(action);
    }
    hasUndo() {
        return (this.undoindex > 0);
    }
    hasRedo() {
        return this.undoindex < this.undostack.length -1;
    }
    undo() {
        var action = this.undostack[this.undoindex].invert();
        action.perform(this);
        this.broadcast(action);
        this.undoindex = this.undoindex-1;
    }
    redo() {
        var action = this.undostack[this.undoindex+1];
        action.perform(this);
        this.broadcast(action);
        this.undoindex = this.undoindex+1;
    }
    getObject(id) {
        return this.objects[id];
    }
    hasObject(id) {
        return typeof this.objects[id] !== 'undefined';
    }
    removeFromOutbox(action) {
        var n = this.outbox.findIndex((a)=>a.id == action.id);
        if(n >= -1) {
            this.outbox.splice(n,1);
        } else {
            throw new Error("couldn't find a match",action);
        }
    }
    networkActionHappened(action) {
        if(!this.connected) return;
        this.log("network action happened",action.id, action.user, this.outbox.length);
        //if my action, remove from outbox, else perform it
        if(this.id == action.user) {
            this.log("mine, removing");
            this.removeFromOutbox(action);
        } else {
            this.log("performing the action");
            Actions.fromClone(action).perform(this);
        }
    }
    hasPendingChanges() {
        return this.outbox.length > 0
    }
}

class DataObject {
    constructor(id, user) {
        this.id = id;
        this.props = {};
        this.user = user;
    }
    setProp(key,value) {
        var oldvalue = this.props[key];
        this.props[key] = value;
        this.user.propChanged(this,key,value,oldvalue);
        return this;
    }
    getProp(key) {
        return this.props[key];
    }
    setProps(props) {
        Object.keys(props).forEach((key)=>{
            this.setProp(key,props[key]);
        });
        return this;
    }
}

var Actions = {
    fromClone(json) {
        if(json.type == 'change') {
            var action = new ChangeAction(json.obj,json.key,json.value,json.oldValue);
            action.user = json.user;
            action.id = json.id;
            return action;
        }
        if(json.type == 'create') {
            var action = new CreateAction(json.obj);
            action.user = json.user;
            action.id = json.id;
            return action;
        }
        if(json.type == 'delete') {
            var action = new DeleteAction(json.obj);
            action.user = json.user;
            action.id = json.id;
            return action;
        }

        return json;
    }
};

class Action {
    valid() { return true; }
}

class ChangeAction extends Action {
    constructor(objid, key, value, oldValue) {
        super();
        this.type = 'change';
        this.obj = objid;
        this.key = key;
        this.value = value;
        this.oldValue = oldValue;
    }
    valid(user) {
        if(!user.hasObject(this.obj)) {
            console.log("changing a deleted object. drop it");
            return false;
        }
        return true;
    }
    invert() {
        var act = new ChangeAction(this.obj, this.key, this.oldValue, this.value);
        act.id = this.id+'_undone';
        return act;
    }
    perform(user) {
        var obj = user.objects[this.obj];
        if(!user.hasObject(this.obj))
            throw new Error("can't set property on unknown object");
        obj.props[this.key] = this.value;
    }
}

class CreateAction extends Action {
    constructor(objid) {
        super();
        this.type = 'create';
        this.obj = objid;
    }
    invert() {
        var act = new DeleteAction(this.obj);
        act.id = this.id+'_undone';
        return act;
    }
    perform(user) {
        user.objects[this.obj] = new DataObject(this.obj, user);
    }
}

class DeleteAction extends Action {
    constructor(objid) {
        super();
        this.type = 'delete';
        this.obj = objid;
    }
    invert() {
        var act = new CreateAction(this.obj);
        act.id = this.id+'_undone';
        return act;
    }
    perform(user) {
        delete user.objects[this.obj];
    }
}

var hub = new Network();
var tests = {
    complex_interaction: function() {
        hub.reset();

        // A connects, creates,
        let A = hub.createUser('a');
        A.connect();
        assert(!A.hasPendingChanges());
        assert(!A.hasUndo());
        A.createObject('obj1').setProps({foo:'bar',a:0}).setProp('a',9);
        assert(!A.hasPendingChanges());
        assert(A.hasUndo());
        assert.equal(A.getObject('obj1').getProp('a'),9);

        // B connects, gets history, does more work, disconnect
        let B = hub.createUser('b');
        //B connects and gets history
        B.connect();
        assert(B.hasObject('obj1'));
        assert.equal(B.getObject('obj1').getProp('foo'),'bar');
        var obj_b = B.getObject('obj1');
        assert.equal(obj_b.getProp('foo'),'bar');

        //B does some work
        obj_b.setProp('foo','baz');
        assert.equal(obj_b.getProp('foo'),'baz');
        assert.equal(A.getObject('obj1').getProp('foo'),'baz');

        //B does some more work
        B.createObject('obj2').setProps({b:99});
        assert(A.getObject('obj2').getProp('b'),99);

        // B does work offline
        B.disconnect();
        assert(!B.hasPendingChanges());
        B.getObject('obj1').setProp('x',50);
        assert(B.hasPendingChanges());

        // A connects, undoes some work, disconnect
        A.connect();
        assert(!A.hasRedo());
        A.undo();
        assert(A.hasRedo());
        assert.equal(A.getObject('obj1').getProp('a'),0);
        assert.equal(B.getObject('obj1').getProp('a'),9);
        A.disconnect();

        //B connects, sees the undo
        B.connect();
        assert.equal(B.getObject('obj1').getProp('a'),0);

        //B changes it again
        B.getObject('obj1').setProp('a',66);
        assert.equal(A.getObject('obj1').getProp('a'),0);
        assert.equal(B.getObject('obj1').getProp('a'),66);

        //A redoes the change
        assert(A.hasRedo());
        A.redo();
        assert.equal(A.getObject('obj1').getProp('a'),9);
        assert(!A.hasRedo());
        //B doesn't see the redo
        assert.equal(B.getObject('obj1').getProp('a'),66);
        //A connects
        assert(A.hasPendingChanges());
        A.connect();
        assert(!A.hasPendingChanges());
        //B sees the redo now
        assert.equal(B.getObject('obj1').getProp('a'),9);

        //B disconnects
        B.disconnect();
        //B makes an edit to the object
        B.getObject('obj1').setProp('a',44);
        //A deletes the object
        A.deleteObject('obj1');
        assert(!A.hasObject('obj1'));
        assert(B.hasObject('obj1'));
        //B reconnects
        B.connect();
        //B handles the conflict by dropping it's own change
        assert(!B.hasObject('obj1'));

        //A undoes the delete
        assert(!A.hasObject('obj1'));
        assert(!B.hasObject('obj1'));
        A.undo();
        //B has the object back, but the change to 'a' was lost
        assert(A.hasObject('obj1'));
        assert(B.hasObject('obj1'));
        assert.equal(B.getObject('obj1').getProp('a',0));


        //assert(!A.hasPendingChanges());
        //assert(!B.hasPendingChanges());
        //A and B are consistent now
        //assert.deepEqual(A.getObject('obj1'), B.getObject('obj1'));

    }


};

function runTests(tests) {
    Object.keys(tests).forEach((name)=>{
        //if(name.indexOf('_')==0) {
            console.log("running", name);
            tests[name]();
        //}
    })
}
runTests(tests);

function clone(obj) {
    if(!obj) return {};
    return JSON.parse(JSON.stringify(obj));
}
