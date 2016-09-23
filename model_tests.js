var assert = require('assert');

/*

possible conflicts

* alice and bob set x to 50 & 100 at the same time. who wins. how to make sure
they both end up the same. each gets response from the other side after their own change made.


alice sets x=50
bob sets x=100
alice sends x=50
bob sends x=100
bob receives x=50
alice receives x=100
if time less than 1000 since last change of the prop, print conflict detected


* alice deletes object before bob sets x=50 on it. either reorder or ignore the prop set

* alice sets x, bob sets x, alice undoes x.  bob should have the original x now.

* alice sets x, bob set x & y, alice undoes x. bob should have new y but original x now.







 */
//test cases

class Hub {
    constructor() {
        this.users = {};
        this.history = [];
        this.running = true;
        this.timeAdvance = 0;
        this.buffer = [];
    }
    reset() {
        this.users = {};
        this.history = [];
        this.running = true;
        this.buffer = [];
    }
    createUser(name) {
        var user = new User(name,this);
        this.users[name] = user;
        return user;
    }
    send(op) {
        if(!this.running) {
            this.buffer.push(op);
            return;
        }
        this.history.push(op);
        var time = new Date().getTime() + this.timeAdvance;
        op.timestamp = time;
        this.real_send(op);
    }
    real_send(op) {
        Object.keys(this.users).forEach((id)=>{
            if(op.user == id) return;
            var user = this.users[id];
            user.handleRemoteOp(op);
        })
    }
    replayHistory(user) {
        this.history.forEach((op)=>{
            if(op.op == 'create') {
                p("replay creating",user.id, op.id);
                user.create(op.id,op.props,true);
            }
            if(op.op == 'set') {
                p('replay setting',user.id, op.id, op.props);
                user.setProps(op.id,op.props,true);
            }
            if(op.op == 'delete') {
                p('replay deleting',user.id, op.id);
                user.delete(op.id,true);
            }
        })
    }
    pause() {
        this.running = false;
        p("pausing");
    }
    timeForward(amt) {
        this.timeAdvance += amt;
        p("move time forward " + amt);
    }
    resume() {
        p("resuming");
        this.running = true;
        this.buffer.forEach((op)=>{
            op.timestamp = new Date().getTime() + this.timeAdvance;
            this.real_send(op);
        });
    }
}

var hub = new Hub();


function p() {
    console.log.apply(console,arguments);
}

function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

class DataObject {
    constructor(id, props, owner) {
        this.id = id;
        this.props = clone(props) || {};
        this.owner = owner;
        this.times = {};
    }
    setProps(props) {
        this.owner.setProps(this.id,props);
    }
    getProp(id) {
        return this.props[id];
    }
}

class User {
    constructor(id, hub) {
        this.id = id;
        this.hub = hub;
        this.objects = {};
        this.ops = [];
        this.pos = -1;
        this.reloaded = false;
        this.conflicted = false;
    }
    addOp(op) {
        this.ops.push(op);
        this.pos = this.ops.length-1;
    }
    create(id,props, remote) {
        var obj = new DataObject(id,props,this);
        this.objects[id] = obj;
        var op = {
            user:this.id,
            op:'create',
            id:id,
            props:clone(props)
        };
        this.addOp(op);
        if(!remote) this.hub.send(op);
        return obj;
    }
    setProps(id, props, remote, undone) {
        var rprops = {};
        var obj = this.getObject(id);
        Object.keys(props).forEach((name)=>{
            rprops[name] = obj.props[name];
            obj.props[name] = props[name];
            obj.times[name] = new Date().getTime();
        });
        var op = {
            user:this.id,
            op:'set',
            id:id,
            props:clone(props),
            rprops:clone(rprops)
        };
        if(!remote) {
            if(!undone) this.addOp(op);
            this.hub.send(op);
        }
    }
    handleRemoteOp(op) {
        if(op.op == 'create') {
            p("remote creating",this.id, op.id);
            this.create(op.id,op.props,true);
        }
        if(op.op == 'set') {
            p('remote setting',this.id, op.id, op.props);
            var obj = this.getObject(op.id);
            Object.keys(op.props).forEach((name)=>{
                var diff = op.timestamp - obj.times[name];
                //if less than 1000 ms, possible conflict
                if(diff < 1000) {
                    p("possible conflict on prop",name,"in object",op.id,"with user",this.id);
                    this.conflicted = true;
                }
            });
            this.setProps(op.id,op.props,true);
        }
        if(op.op == 'delete') {
            p('remote deleting',this.id, op.id);
            this.delete(op.id,true);
        }

    }
    hasObject(id) {
        if(typeof this.objects[id] == 'undefined') return false;
        if(this.objects[id] == null) return false;
        return true;
    }
    getObject(id) {
        if(!this.objects[id]) throw Error("No such object: " + id);
        return this.objects[id];
    }
    delete(id,remote) {
        var obj = this.getObject(id);
        delete this.objects[id];
        var op = {
            user:this.id,
            op:'delete',
            id:id
        };
        if(!remote) this.hub.send(op);
    }
    undo() {
        var op = this.ops[this.pos];
        if(op.op == 'set') {
            this.setProps(op.id,op.rprops,false,true);
        }
        this.pos--;
    }
    redo() {
        this.pos++;
        var op = this.ops[this.pos];
        if(op.op == 'set') {
            this.setProps(op.id,op.props,false,true);
        }
    }
    hasRedo() {
        return (this.ops.length-1 > this.pos);
    }
    didReload() {
        return this.reloaded;
    }
    reloadFull() {
        this.objects = {};
        this.ops = [];
        this.pos = -1;
        this.hub.replayHistory(this);
        this.reloaded = true;
    }
    hasConflict() {
        return this.conflicted;
    }
}

var tests = {
    _test_create_object_raw: function() {
        hub.reset();
        var a = hub.createUser('a');
        a.create('foo', {x:0, y:0, w: 100, h: 100, fill:'red', type:'rect'});
        a.getObject('foo').setProps({x:100});
        a.getObject('foo').setProps({y:100});
        assert.equal(a.getObject('foo').getProp('x'),100);
        assert.equal(a.getObject('foo').getProp('y'),100);
    },
    _test_create_rect_raw: function() {
        hub.reset();
        var a = hub.createUser('a');
        a.create('doc', {});
        a.create('foo', {x:50, y:50});
        a.getObject('doc').setProps({0:'foo'});
        assert.equal(a.getObject('doc').getProp(0),'foo');
        assert.equal(a.getObject('foo').getProp('x'),50);
    },
    _test_delete_rect: function() {
        hub.reset();
        var a = hub.createUser('a');
        var foo = a.create('foo',{x:50, y:50});
        foo.setProps({x:100});
        a.delete('foo');
        assert.equal(a.hasObject('foo'),false);
    },
    _test_sync_objects:function() {
        hub.reset();
        var a = hub.createUser('a');
        var b = hub.createUser('b');
        a.create('foo',{x:50,y:50});
        assert.equal(b.hasObject('foo'),true);
        assert.equal(b.getObject('foo').getProp('x'),50);
        a.getObject('foo').setProps({x:100});
        assert.equal(b.getObject('foo').getProp('x'),100);
        assert.equal(b.hasObject('foo'),true);
        a.delete('foo');
        assert.equal(b.hasObject('foo'),false);
    },
    _test_undo_raw: function() {
        hub.reset();
        var a = hub.createUser('a');
        var foo = a.create('foo',{x:50,y:50});
        foo.setProps({x:100});
        foo.setProps({x:150});
        assert.equal(a.getObject('foo').getProp('x'),150);
        a.undo();
        assert.equal(a.getObject('foo').getProp('x'),100);
    },
    _test_undo_redo_raw: function() {
        hub.reset();
        var a = hub.createUser('a');
        var doc = a.create('doc',{});
        var foo = a.create('foo',{x:50,y:50});
        doc.setProps({0:'foo'});
        foo.setProps({x:100});
        foo.setProps({x:150});
        a.undo();
        assert.equal(a.getObject('foo').getProp('x'),100);
        a.redo();
        assert.equal(a.getObject('foo').getProp('x'),150);
    },
    _test_create_rect_api: function() {
        hub.reset();
        var a = hub.createUser('a');
        var b = hub.createUser('b');
        var doc  = a.create('doc', {type:'model'});
        var rect = a.create('foo', {type:'rect',x:50, y:0});
        doc.setProps({0:rect.id});
        assert.equal(a.getObject('doc').getProp('type'),'model');
        assert.equal(a.getObject('foo').getProp('x'),50);
        assert.equal(a.getObject('foo').getProp('y'),0);
        assert.equal(b.getObject('doc').getProp('type'),'model');
    },
    _test_undo_rect_move_api: function() {
        hub.reset();
        var a = hub.createUser('a');
        var b = hub.createUser('b');
        var doc  = a.create('doc', {type:'model'});
        var rect = a.create('foo', {type:'rect',x:0, y:0});
        doc.setProps({0:'foo'});
        rect.setProps({x:25});
        rect.setProps({x:50});
        rect.setProps({x:100});
        assert.equal(a.hasRedo(),false);
        assert.equal(b.getObject('foo').getProp('x'),100);
        a.undo();
        assert.equal(b.getObject('foo').getProp('x'),50);
        assert.equal(a.hasRedo(),true);
        a.undo();
        assert.equal(b.getObject('foo').getProp('x'),25);
        a.redo();
        assert.equal(b.getObject('foo').getProp('x'),50);
        a.redo();
        assert.equal(b.getObject('foo').getProp('x'),100);
        assert.equal(a.getObject('foo').getProp('x'),100);
        a.undo();
        assert.equal(a.getObject('foo').getProp('x'),50);
        assert.equal(a.hasRedo(),true);
        rect.setProps({x:200});
        assert.equal(rect.getProp('x'),200);
        assert.equal(a.hasRedo(),false);
        assert.equal(b.hasRedo(),false);
        assert.equal(b.getObject('foo').getProp('x'),200);
    },
    _test_reload_history_api: function() {
        hub.reset();
        var a = hub.createUser('a');
        var b = hub.createUser('b');
        var doc  = a.create('doc', {type:'model'});
        var rect = a.create('foo', {type:'rect',x:0, y:0});
        doc.setProps({0:'foo'});
        rect.setProps({x:25});
        rect.setProps({x:50});
        rect.setProps({x:100});
        assert.equal(a.getObject("foo").getProp('x'),100);
        assert.equal(a.didReload(),false);
        a.reloadFull();
        assert.equal(a.getObject("foo").getProp('x'),100);
        assert.equal(a.didReload(),true);
    },


    _test_detect_property_set_conflict: function() {
        hub.reset();
        var a = hub.createUser('a');
        var b = hub.createUser('b');
        a.create('foo',{x:25});
        hub.pause();
        //a updates
        a.getObject('foo').setProps({x:50});
        //verify a is updated but b is not
        assert.equal(a.getObject('foo').getProp('x'),50);
        assert.equal(b.getObject('foo').getProp('x'),25);
        //b updates
        b.getObject('foo').setProps({x:100});
        //verify b is updated but a is not
        assert.equal(b.getObject('foo').getProp('x'),100);
        assert.equal(a.getObject('foo').getProp('x'),50);
        //no conflict yet
        assert.equal(a.hasConflict(),false);
        //go forward 100 msec
        hub.timeForward(333);
        hub.resume();
        //now conflict should happen
        assert.equal(a.hasConflict(),true);
    },

    _test_detect_property_set_no_conflict: function() {
        hub.reset();
        var a = hub.createUser('a');
        var b = hub.createUser('b');
        a.create('foo',{x:0});
        hub.pause();
        a.getObject('foo').setProps({x:50});
        hub.timeForward(1000);
        b.getObject('foo').setProps({x:100});
        assert.equal(a.hasConflict(),false);
        hub.resume();
        assert.equal(a.hasConflict(),false);
    },

    test_resolve_conflict_raw: function() {
        //alice's actions arrive out of order
        send({op:'create', id:'doc', props:{}});
        send({op:'create', id:'foo', props:{x:50, y:50}});
        send({op:'set',    id:'doc', props:{0:'foo'}});
        send({op:'set',    id:'foo', props:{x:100}});
        send({op:'set',    id:'foo', props:{x:75}});
        resolve();
        assert(get('foo','x'),100); //this won't work yet. need a conflict resolution
    },
    test_set_after_delete: function() {
        hub.reset();
        var a = hub.createUser('a');
        a.create('foo',{x:50,y:50});
        a.delete('foo');
        //send({op:'create', id:'doc', props:{}});
        //send({op:'create', id:'foo', props:{x:50, y:50}});
        //send({op:'set',    id:'doc', props:{0:'foo'}});
        send({op:'delete', id:'foo'});
        send({op:'set',    id:'foo', props:{x:100}});
        resolve();
        assert(get('foo','x'),null);
    },
    test_double_create_conflict_raw: function() {
        send({user:'a', op:'create', id:'doc', props:{}});
        send({user:'a', op:'create', id:'foo', props:{x:50, y:50}});
        send({user:'b', op:'create', id:'bar', props:{x:50, y:50}});
        send({user:'a', op:'set',    id:'doc', props:{0:'foo'}});
        send({user:'b', op:'set',    id:'doc', props:{0:'bar'}});
        resolve();
        assert(get('doc','0'),'foo');
        assert(get('doc','1'),'bar');
    },

    test_conflict_force_reload_api: function() {
        reset();
        var a = createUser('a');
        var b = createUser('b');
        var rect = a.create('foo', {type:'rect',x:0, y:0});
        assert(a.didReload(),false);
        delay(1000);
        b.getObject('foo').setProps({x:100});
        delay(100);
        a.getObject('foo').setProps({x:50});
        a.resolve();
        b.resolve();
        assert(a.didReload(),true);
        assert(a.getObject('foo').getProp('x'),50);
        //a sets x to 50
        //b sets y to 100
        //last one wins, by forcing a reload
    },

    /*
     alice and bob are logged in
     eve logs in and immediately gets the history
     */
    test_load_from_history_api: function() {
        reset();
        var a = createUser('a');
        var b = createUser('b');
        a.create('foo', {type:'type',x:0, y:0});
        a.create('bar', {type:'type',x:100, y:100});
        a.getObject('foo').setProps({x:200});
        delay(1000);
        b.getObject('foo').setProps({x:300});

        var e = createUser('e');
        assert(e.getObjecct('foo').getProp('x'),300);
        assert(e.getObjecct('bar').getProp('x'),100);
    },

    /*
     alice and bob are logged in
     bob sets x to 100
     alice sets x to 200 at the same time
     messages cross in the network (both send before they receive from the other)
     both reload from history, and ignore the duplicate. trust history
     */
    test_cross_traffic_conflict_api: function() {
        reset();
        var a = createUser('a');
        var b = createUser('b');
        a.create('foo',{x:0});
        delay(1000);
        assert(a.didReload(),false);
        assert(b.didReload(),false);
        b.getObject('foo').setProps({x:100});
        a.getObject('foo').setProps({x:200});
        //conflict should occur, history should be reloaded
        assert(a.didReload(),true);
        assert(b.didReload(),true);
        //in this case, last one wins.
        assert(a.getObject('foo').getProp({x:200}));
        assert(b.getObject('foo').getProp({x:200}));
    },

    /*
     alice and bob are logged in
     alice sets foo.x to 100 at same time as bob deletes foo
     messages cross in the network
     both reload from history, and ignore the duplicate. trust history
     history shows foo.x happened after foo.delete. history is invalid.
     foo.x is forever ignored when replaying history
     */
    test_set_delete_conflict_api: function() {
        var a = createUser('a');
        var b = createUser('b');
        a.create('foo',{x:0});
        delay(1000);
        assert(a.didReload(),false);
        assert(b.didReload(),false);
        b.deleteObject('foo');
        a.getObject('foo').setProps({x:200});
        //conflict should occur, history should be reloaded
        assert(a.didReload(),true);
        assert(b.didReload(),true);
        //in this case history is invalid, so the set should be ignored. object is gone.
        //also the action is wipe from A's undo
        assert(a.getObject('foo'),null);
        assert(a.undoLength(),1);
    }
}


runTests(tests);
//tests._test_sync_objects();


function runTests(tests) {
    Object.keys(tests).forEach((name)=>{
        if(name.indexOf('_')==0) {
            console.log("running", name);
            tests[name]();
        }
    })
}