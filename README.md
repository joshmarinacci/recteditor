shared rectangle editor with pubnub


The tricky part of shared editors is syncing state when changes
could happen out of order, as well as handling undo/redo in a
sensible manner.

to make this easier to reason about, rect editor uses
a simple flat model.  an object is a unique set of named properties.
setting a property is an atomic operation. a list is represented
by an object with keys 0, 1, 2, 3, 4, etc. a complex property
value is represented by a unique ID which points to an object.
every object has a unique ID.  

example:  a document containing two rectangles, one red and one blue.

doc:
  type:'list'
  0: 'rect1'
  1: 'rect2'

rect1:
  type:'rect'
  x:50
  y:50
  w:100
  h:100
  fill:'red'
rect2:
  type: 'rect'
  x: 200
  y:50
  w:100
  h:100
  fill:'blue'

operations:

the only possibly operations are to create an object, delete an object, and set
the property of an object to a new value.

create new yellow rect
op:create id:rect3 x:0 y:0 w:100 h:100 fill:'yellow'
op:set    id:doc prop:2 value:rect3

move the yellow rect horizontally to x=768
op:set    id:rect3 prop:x value:768

delete the yellow rect
op:set    id:doc  prop:2 value:null
op:delete id:rect3

notes:
* setting the value of a property to null is the equivalent of deleting the property
* object IDs must be randomly generated UUIDs to avoid conflicts.



improvements:
creating and deleting usually involve multiple operations that must be performed
in order. combining these into single atomic operations would make it easier to reason
about. however, it is possible you might want to create a rect without actually
adding it to the doc yet, so the standalone create should still be possible.


total state of the document

the state of the document is defined as a sequence of operations. this sequence
can be added to but never modified. it is the history of the document. to completely
recreate the document you can replay the sequence.  this means that undo/redo must
be additive as well.

improvements:

create snapshots so someone who joins the document doesn't have to replay
the entire history. does this really matter? only for long lived documents?
how big of a problem is this in practice?


undo/redo

a user cannot undo the direct actions of another user. this implies there is one
undo stack per user, not a shared undo stack. furthermore, it implies that revision
control, going backward in time to find an earlier version of the document, must
either fork the document history or append to it to bring an earlier version forward

conflict resolution
in the event changes are received out of order or for some other reason cannot cleanly
applied, the conflict is resolved by the following algorithm

* all user changes are appended to a queue
* all changes are submitted to the document change channel
* receive an event
* attempt to apply effect
* if apply succeeds
* remove matching event from the queue (it has now successfully entered the permanent
   document history)
* if apply fails
* hold in queue
* after next event, attempt to resolve the event in the queue
* if applying fails N times, then purge the document and restore from history
* if applying fails again, then purge the queue and proceed with just the document history

this method can potentially result in loss of recently created changes, but it ensures
that everyone eventually has a consistent document that matches the history stream from the server

how to apply a change
op:create, create the object unless it already exists. if so, drop the change
op:delete, delete the object unless if doesn't exist. if so, drop the change
op:set,  set the value of the object unless it doesn't exist. if so, queue the change for later resolution.

# examples:

# create objects at same time
* alice creates object id:foo
* bob creates object id:bar
* alice receives create op, now has objects foo, bar
* bob receives create op, now has objects bar, foo

this scenario is resolved because the UUIDs are different

# user loss
* alice creates object id:foo, sets doc.1 = foo
* bob creates object id:bar, sets doc.1 = bar
* alice receives op:create id:bar, has objects doc, foo, bar
* alice receives set doc.1 = bar,  this erases alice's own object foo. it still exists, but is not in the doc.

this scenario is resolved, but loses user data

# simultaneous object edit, different properties
* alice sets id:foo name:x value:200
* bob sets id:foo name:y value: 100
* alice receives copy of id:foo name:x value:200
* alice removes the op from the buffer
* alice receives bob's change
* alice applies bob's change

everything is resolved correctly

# two users move object at once
* alice sets id:foo name:x value:200
* bob sets id:foo name:x value:100
* alice receives copy of her change
* alice removes her op from the buffer
* alice receives bob's change
* alice applies bob's change
* alice sees value:100
* bob receives his copy of his change
* bob removes his op from the buffer
* bob receives alice's change
* bob applies alice's change
* bob sees value:200

bob and alice see different data. their copies have diverged. to fix it?

# use relative property changes
* foo.x == 500
* alice moves to 600: A: op:add id:foo name:x value: 100
* bob moves to 300:   B: op:add id:foo name:x value: -200
* alice receives A,B  500+100-200 = 400
* alice receives B,A  500-200+100 = 400

both alice and bob get consistent values. this only works for numeric properties, not strings or IDs

detecting a possible conflict.  if property is changed less than N msec after the previous change, then
possible conflict. in this case, replay history and re-apply changes

if change closer than N msec to the same object and property, then reload from
history. history is always authoritative.

# user sets object deleted by other user
* alice deletes id:foo
* bob sets id:foo


# user un-does a change that another user has done
* foo.x == 100
* alice sets foo.x = 150
* bob sets foo.x = 200
* alice undoes foo.x, sets foo.x = 100
* bob receives op:set foo.x = 100

bob sees his change undone as well. how does he know this was done by alice?
is this a problem?

# user undoes then redoes two changes
* foo.x == 100
* alice sets foo.x = 200
* alice sets foo.y = 200
* bob sets



In general conflicts aren't a problem as long as both users get to a consistent
state quickly. then the user can quickly fix anything which is surprising.



# new resolution system

* user performs operation
//* operation added to op buffer
* operation added to undo buffer
* change arrives from network
* if change from self, ignore (already applied)
* if change can be applied correctly, apply to data model
//* if change found in op buffer, remove from op buffer
//* if change cannot be applied correctly, add to the op buffer
* if cannot apply change, then reload
* if change too close to last change, then reload


* user performs operation
* apply change locally
* add to undo buffer
* send change to network

* change arrives from network
* if change from self, ignore
* if change too close to last change, and different users
  * reload history
  * apply change, ignore if already in history

* user does undo
* modify undo stack
* submit new operation
* same as any other event
