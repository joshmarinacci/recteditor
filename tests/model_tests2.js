let assert = require('assert');
let test = require('tape');
let { Network } = require('../src/services/DocumentService');


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

function wait(time) {
    return new Promise((res,rej)=>{
        setTimeout(()=>{
            res();
        },time);
    })
}

var DELAY = 2000;

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
        .then(()=>wait(DELAY))
        //B connects and gets history
        .then(()=>{
            B.connect();
        })
        .then(()=>wait(DELAY))
        // verify B got the history okay
        .then(()=> {
            t.ok(B.hasObject('obj1'), 'B got the matching object');
            t.equal(B.getObject('obj1').getProp('foo'), 'bar', "right property value");
        })
        // B does some work
        .then(()=>{
            //B does some work
            B.getObject('obj1').setProp('foo','baz');
            t.equal(B.getObject('obj1').getProp('foo'),'baz',"local change");

            //B does some more work
            B.createObject('obj2').setProps({b:99});

        })
        .then(()=>wait(DELAY))
        .then(()=>{
            //verify that A got the changes too
            t.equal(A.getObject('obj1').getProp('foo'),'baz',"remote change");
            t.equal(A.getObject('obj2').getProp('b'),99);
        })


        // B does some work offline
        .then(()=>{
            B.disconnect();
            t.ok(!B.hasPendingChanges(),'no pending changes');
            B.getObject('obj1').setProp('x',50);
            t.ok(B.hasPendingChanges(),'pending changes now');
        })
        .then(()=>wait(DELAY))
        //B reconnects
        .then(()=>{
            B.connect();
        })
        .then(()=>wait(DELAY))
        //verify that A got the changes
        .then(()=>{
            t.equal(A.getObject('obj1').getProp('x'),50,
                'A got remote delayed change from B');
        })



        // UNDO / REDO test
        .then(()=>{
            //make two changes
            A.getObject('obj1').setProp('z',1);
            A.getObject('obj1').setProp('z',5);
        })
        //wait to propagate
        .then(()=>wait(DELAY))
        //verify, then undo the last change
        .then(()=>{
            t.equal(A.getObject('obj1').getProp('z'),5);
            t.equal(B.getObject('obj1').getProp('z'),5);
            t.ok(!A.hasRedo());
            A.undo();
            t.ok(A.hasRedo());
        })
        .then(()=>wait(DELAY))  //wait to propagate
        //verify, A goes offline, then B changes it again
        .then(()=>{
            t.equal(A.getObject('obj1').getProp('z'),1);
            t.equal(B.getObject('obj1').getProp('z'),1);

            A.disconnect();
            B.getObject('obj1').setProp('z',10);
        })
        .then(()=>wait(DELAY))  //wait to propagate
        //verify, A doesn't see the change but B does
        .then(()=>{
            t.equal(A.getObject('obj1').getProp('z'),1);
            t.equal(B.getObject('obj1').getProp('z'),10);
        })
        //A redoes the change while offline
        .then(()=>{
            A.redo();
        })
        .then(()=>wait(DELAY))  //wait to propagate
        //A reconnects
        .then(()=>{
            A.connect();
        })
        .then(()=>wait(DELAY))  //wait to propagate
        //B gets the change now
        .then(()=>{
            t.equal(B.getObject('obj1').getProp('z'),5);
        })




        /*
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

         */


        .then(()=>{
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