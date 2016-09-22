var assert = require('assert');

//test cases

var users = {};
function reset() {
    users = {};
}

function send(op) {
    //p("doing",op);
    Object.keys(users).forEach((id)=>{
        if(op.user == id) return;
        var user = users[id];
        //p("sending to " , user.id);
        if(op.op == 'create') {
            p("creating");
            user.create(op.id,op.props,true);
        }
        if(op.op == 'set') {
            p('setting',op.id, op.props);
            user.getObject(op.id).setProps(op.props,true);
        }
    })
}

function p() {
    console.log.apply(console,arguments);
}

class DataObject {
    constructor(id, props, owner) {
        this.id = id;
        this.props = props || {};
        this.owner = owner;
    }
    setProps(props,remote,undone) {
        var rprops = {};
        Object.keys(props).forEach((name)=>{
            rprops[name] = this.props[name];
            this.props[name] = props[name];
        });
        var op = {
            user:this.owner.id,
            op:'set',
            id:this.id,
            props:props,
            rprops:rprops
        };
        if(!undone) this.owner.addOp(op);
    }
    getProp(id) {
        return this.props[id];
    }
}

class User {
    constructor(id) {
        this.id = id;
        this.objects = {};
        this.ops = [];
        this.pos = -1;
    }
    addOp(op) {
        p("user",this.id,'adding op',op.props);
        this.ops.push(op);
        this.pos = this.ops.length-1;
        console.log("ops length = ", this.ops.length)
    }
    create(id,props, remote) {
        p("creating object",id,'with props',props);
        var obj = new DataObject(id,props,this);
        this.objects[id] = obj;
        var op = {
            user:this.id,
            op:'create',
            id:id,
            props:props
        };
        this.addOp(op);
        if(!remote) send(op);
        return obj;
    }
    getObject(id) {
        if(!this.objects[id]) throw Error("No such object: " + id);
        return this.objects[id];
    }
    undo() {
        var op = this.ops[this.pos];
        p("undoing op",op);
        if(op.op == 'set') {
            this.getObject(op.id).setProps(op.rprops,false,true);
        }
        this.pos--;
    }
    redo() {
        this.pos++;
        var op = this.ops[this.pos];
        p("redoing op",op);
        if(op.op == 'set') {
            this.getObject(op.id).setProps(op.props,false,true);
        }
    }
    hasRedo() {
        p("len = ", this.ops.length, "pos",this.pos);
        return (this.ops.length-1 > this.pos);
        //return false;
    }
}

function createUser(name) {

    var user = new User(name);
    /*
        undo:function() {
            //p("the undo stack is",this.ops);
            //p("index = ", this.undopos, this.ops.length);
            var last = this.ops[this.undopos];
            console.log("undoing",last);
            if(last.op == 'set') {
                this.getObject(last.id).setProps(last.rprops);
            }
            this.undopos -= 2;
        },
        redo:function() {
            p("the undo stack is",this.ops);
            p("redoing index = ", this.undopos, this.ops.length);
            //this.undopos += 1;
            var last = this.ops[this.undopos];
            //console.log("redoing",last);
            if(last.op == 'set') {
                this.getObject(last.id).setProps(last.props);
            }
            //this.undopos -= 2;
        }
    };*/

    users[name] = user;
    return user;
}
var tests = {
    test_create_object_raw: function() {
        reset();
        send({user:'a', op:'create',id:'foo', props:{ x:0, y:0, w:100, h:100, fill:'red', type:'rect'}});
        send({user:'a', op:'set',id:'foo', props:{ x:100}});
        send({user:'a', op:'set',id:'foo', props:{ y:100}});
        assert(get('foo','x'),100);
        assert(get('foo','y'),100);
    },
    test_create_rect_raw: function() {
        //test2 create rect in list of doc
        send({op:'create', id:'doc', props:{}});
        send({op:'create', id:'foo', props:{x:50, y:50}});
        send({op:'set',    id:'doc', props:{0:'foo'}});
        assert(get('doc','0'),'foo');
        assert(get('foo','x'),50);
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
    test_undo_raw: function() {
        send({op:'create', id:'doc', props:{}});
        send({op:'create', id:'foo', props:{x:50, y:50}});
        send({op:'set',    id:'doc', props:{0:'foo'}});
        send({op:'set',    id:'foo', props:{x:100}});
        send({op:'set',    id:'foo', props:{x:150}});
        send({op:'set',    id:'foo', props:{x:100}}); //undo
        resolve();
        assert(get('foo','x'),100);
    },
    test_undo_redo_raw: function() {
        send({op:'create', id:'doc', props:{}});
        send({op:'create', id:'foo', props:{x:50, y:50}});
        send({op:'set',    id:'doc', props:{0:'foo'}});
        send({op:'set',    id:'foo', props:{x:100}});
        send({op:'set',    id:'foo', props:{x:150}});
        send({op:'set',    id:'foo', props:{x:100}}); //undo
        send({op:'set',    id:'foo', props:{x:150}}); //redo
        resolve();
        assert(get('foo','x'),150);
    },
    test_delete_set_conflict_raw: function() {
        send({op:'create', id:'doc', props:{}});
        send({op:'create', id:'foo', props:{x:50, y:50}});
        send({op:'set',    id:'doc', props:{0:'foo'}});
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

    test_create_rect_api: function() {
        reset();
        var a = createUser('a');
        var b = createUser('b');
        var doc  = a.create('doc', {type:'model'});
        var rect = a.create('foo', {type:'rect',x:50, y:0});
        doc.setProps({0:rect.id});
        assert.equal(a.getObject('doc').getProp('type'),'model');
        assert.equal(a.getObject('foo').getProp('x'),50);
        assert.equal(a.getObject('foo').getProp('y'),0);
        assert.equal(b.getObject('doc').getProp('type'),'model');
    },

    test_undo_rect_move_api: function() {
        reset();
        var a = createUser('a');
        var b = createUser('b');
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


//runTests(tests);
//tests.test_create_rect_api();
tests.test_undo_rect_move_api();


function runTests(tests) {
    Object.keys(tests).forEach((name)=>{
        console.log("running",name);
        tests[name]();
    })
}