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

function createUser(name) {
    var user = {
        id:name,
        objects:{},
        ops:[],
        create:function(id,props,stop) {
            p("creating object",id,'with props',props);
            var obj = {
                id:id,
                owner:this,
                props:props||{},
                setProps: function(props,stop) {
                    var rprops = {};
                    Object.keys(props).forEach((name)=>{
                        //p("setting",name,props[name]);
                        rprops[name] = this.props[name];
                        this.props[name] = props[name];
                    });
                    var op = {
                        user:this.owner.id,
                        op:'set',
                        id:this.id,
                        props:props,
                        rprops:rprops,
                    };
                    this.owner.ops.push(op);
                    if(!stop) send(op);
                },
                getProp: function(id) {
                    return this.props[id];
                }
            };
            this.objects[id] = obj;
            var op = {
                user:this.id,
                op:'create',
                id:id,
                props:props
            };
            this.ops.push(op);
            if(!stop) send(op);
            return obj;
        },
        getObject(id) {
            if(!this.objects[id]) throw Error("No such object: " + id);
            return this.objects[id];
        },
        undo:function() {
            p("the undo stack is",this.ops);
            var last = this.ops[this.ops.length-1];
            p("last op is",last);
            if(last.op == 'set') {

                this.getObject(last.id).setProps(last.rprops);
            }
        }
    };
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
        rect.setProps({x:50});
        rect.setProps({x:100});
        assert.equal(b.getObject('foo').getProp('x'),100);
        a.undo();
        assert.equal(rect.getProp('x'),50);
        return;
        a.redo();
        assert(rect.getProp('x'),100);
        a.undo();
        assert(rect.getProp('x'),50);
        assert(a.hasRedo(),true);
        rect.setProps({x:200});
        assert(rect.getProp('x'),200);
        assert(a.hasRedo(),false);
        assert(b.hasRedo(),false);
        assert(b.getObject('foo').getProp('x'),200);
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
tests.test_create_rect_api();
tests.test_undo_rect_move_api();


function runTests(tests) {
    Object.keys(tests).forEach((name)=>{
        console.log("running",name);
        tests[name]();
    })
}