let assert = require('assert');
let PubNub = require('pubnub');
let test = require('tape');


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


     how to handle missing message


     */


var pub_key = "pub-c-84cc1e5d-138c-4366-a642-f2f8c6d63fac";
var sub_key = "sub-c-386922f6-6e17-11e6-91d9-02ee2ddab7fe";
const CHANNEL_NAME = "my-cool-document";


class Network {
    constructor() {
        this.reset();
        this.pubnub = new PubNub({
            publishKey:pub_key,
            subscribeKey:sub_key,
        });
        this.pubnub.addListener({
            status:(e) => {
                console.log("status changed",e);
            },
            message:(e) => {
                console.log("message", e.message.type, e.message.count, e.message.networkcount);
                var action = e.message;
                Object.keys(this.users).forEach((id) => this.users[id].networkActionHappened(action));
            },
            presence:(e) => {
                console.log("presence",e);
            }
        });

        this.pubnub.subscribe({channels:[CHANNEL_NAME]});
    }
    shutdown() {
        this.pubnub.unsubscribe({channels:[CHANNEL_NAME]});
        return Promise.resolve();
    }
    reset() {
        this.count = 0;
        this.users = {};
    }
    createUser(id) {
        return (this.users[id] = new User(id,this));
    }
    broadcast(action, user) {
        action.user = user.id;
        action = clone(action);
        this.count++;
        action.networkcount = this.count;
        console.log("-- published ", action.type, action.count, action.networkcount);
        this.pubnub.publish({
            channel:CHANNEL_NAME,
            message:action,
        })
    }
    fetchHistory() {
        return new Promise((res,rej)=>{
            this.pubnub.history({
                channel: CHANNEL_NAME,
                reverse: false,
                count: 10,
                includeTimetoken: true
            },
             (status,results)=>{
                 res(results);
             }
            );
        });
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
        this.users = {};
    }
    log() {
        console.log("## " + this.id+":",
            Array.prototype.slice.call(arguments).join(" "));
    }
    connect() {
        this.log('connecting');
        this.connected = true;

        //replay history we missed
        this.network.fetchHistory().then((hist)=>{
            //console.log("got the history",hist.messages.slice(-5));
            hist.messages.forEach((json)=>{
                //console.log(json);
                var action = Actions.fromClone(json.entry);
                if(json.entry.user == this.id) {
                    //console.log("my own action response. skip");
                    return;
                }
                console.log("import",action.type, action.user, action.count);
                //do the action if it is valid
                if(action.valid(this))  action.perform(this);
            });
        }).catch((e)=>console.log(e));
    }
    disconnect() {
        this.log('disconnecting');
        this.connected = false;
    }
    sendOutbox() {
        if(!this.connected) return;
        if(this.outbox.length <= 0) return;
        var action = this.outbox[0];
        if(action.sent === true) return;
        action.sent = true;
        // only send out valid actions
        if(action.valid(this)) this.network.broadcast(action,this);
    }
    broadcast(action) {
        this.actionCount++;
        action.id = 'action_'+this.actionCount;
        action.count = this.actionCount;
        this.outbox.push(action);
        this.sendOutbox();
    }

    performLocalAction(action) {
        this.log("performing",action);
        var retval = action.perform(this);
        this.undostack.push(action);
        this.undoindex = this.undostack.length-1;
        this.broadcast(action);
        return retval;
    }
    createObject(id) {
        return this.performLocalAction(new CreateAction(id));
    }
    propChanged(obj,key,val,old) {
        return this.performLocalAction(new ChangeAction(obj.id, key, val, old));
    }
    deleteObject(id) {
        return this.performLocalAction(new DeleteAction(id));
    }
    hasUndo() {
        return (this.undoindex >= 0);
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

    getRemoteUserInfo(action) {
        if(!this.users[action.user]) {
            this.users[action.user] = {
                id:action.user,
                count:0
            }
        }
        return this.users[action.user];
    }

    networkActionHappened(action) {
        if(!this.connected) return;
        this.log("network action happened",action.type, action.user +'.'+ action.count, action.networkcount);
        //if my action, remove from outbox, else perform it
        if(this.id == action.user) {
            this.log("mine, removing");
            this.removeFromOutbox(action);
            this.sendOutbox();
        } else {
            this.log("performing the action");
            var user = this.getRemoteUserInfo(action);
            console.log("remote user is",user);
            if(action.count < user.count) {
                console.log("OUT OF ORDER");
            }
            user.count = action.count;
            action = Actions.fromClone(action);
            if(action.valid(this)) action.perform(this);
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
    setProp(key,val) {
        var old = this.props[key];
        this.user.propChanged(this,key,val,old);
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
        var action = null;
        if(json.type == 'change') action = new ChangeAction(json.obj,json.key,json.value,json.oldValue);
        if(json.type == 'create') action = new CreateAction(json.obj);
        if(json.type == 'delete') action = new DeleteAction(json.obj);
        action.user = json.user;
        action.id = json.id;
        action.count = json.count;
        action.networkcount = json.networkcount;
        return action;
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
    toString() {
        return "change " + this.obj+"."+this.key + " => " + this.value;
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
    toString() {
        return "create " + this.obj;
    }
    invert() {
        var act = new DeleteAction(this.obj);
        act.id = this.id+'_undone';
        return act;
    }
    perform(user) {
        user.objects[this.obj] = new DataObject(this.obj, user);
        return user.objects[this.obj];
    }
}

class DeleteAction extends Action {
    constructor(objid) {
        super();
        this.type = 'delete';
        this.obj = objid;
    }
    toString() {
        return "delete " + this.obj;
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

function clone(obj) {
    if(!obj) return {};
    return JSON.parse(JSON.stringify(obj));
}

function wait(time) {
    return new Promise((res,rej)=>{
        setTimeout(()=>{
            res();
        },time);
    })
}


test('simple test', (t)=>{
    hub.reset();
    let A = hub.createUser('a');
    let B = hub.createUser('b');
    wait(1000)
        .then(()=>{
            A.connect();
            t.ok(!A.hasPendingChanges());
            t.ok(!A.hasUndo());
            A.createObject('obj1').setProps({foo:'bar',a:0}).setProp('a',9);
            t.ok(A.hasUndo());
            t.equal(A.getObject('obj1').getProp('a'),9);
        })
        .then(()=>wait(2000))
        .then(()=>{
            B.connect();
        })
        .then(()=>wait(2000))
        .then(()=>{
            t.ok(B.hasObject('obj1'),'B got the matching object');
            t.end();
            A.disconnect();
            B.disconnect();
            hub.shutdown().then(()=> process.exit(0));
        })
        .catch((e)=>{
            console.log("error",e);
        });
    ;
});