/**
 * Created by josh on 10/5/16.
 */
/*
new PresenceService({
    pubnub:pubnub,
    channel:'my-doc-1'
});
*/


/*
connects to a channel, for presence events
stores list of all users and their state
sends change events when anything in the user's state changes

* match up current user with their state. indicate if user is current user in the list
* after joining, prepopulate with current list of people and their state


demo shows cursors, list of users with their user names, random color chosen
 */

class PresenceService {
    constructor(options) {
        this.users = {};
        this.listeners = [];
        //connect to pubnub
        options.pubnub.subscribe({
            channels:[options.channel],
            withPresence:true
        });
        var self = this;
        options.pubnub.addListener({
            status: function(status) {
                console.log("got status",status);
            },
            message: function(message) {
                console.log("got a message",message);
            },
            presence: function(pres) {
                console.log("presence event",pres);
                if(pres.action === 'join')         return self.userJoined(pres);
                if(pres.action === 'timeout')      return self.userLeft(pres);
                if(pres.action === 'state-change') return self.stateChanged(pres);
            }
        });

        options.pubnub.hereNow({
            channels:[options.channel],
            includeUUIDs:true,
            includeState:true
        },(status,resp) => {
            console.log("got status",status,resp);
            var room = resp.channels[options.channel];
            console.log("room = ", room);
            room.occupants.forEach((user) => this.checkinUser(user));
            this.listeners.forEach((l)=> l());
        });
    }

    checkinUser(evt) {
        //create if needed
        if(!this.users[evt.uuid]) this.users[evt.uuid] = { uuid:evt.uuid };
        var user = this.users[evt.uuid];
        if(evt.state) {
            Object.keys(evt.state).forEach((key)=>{
                user[key] = evt.state[key];
            });
        }
        return user;
    }

    getUserInfo(uuid) {
        if(this.users[uuid])  return this.users[uuid];
        return {}
    }

    onChange(l) {
        this.listeners.push(l);
    }

    fireUpdate() {
        this.listeners.forEach((l)=> l());
    }
    userJoined(pres) {
        console.log("got joined");
        this.checkinUser(pres);
        this.fireUpdate();
    }

    userLeft(pres) {
        console.log("timed out");
        delete this.users[pres.uuid];
        this.fireUpdate();
    }

    stateChanged(evt) {
        console.log("state changed");
        this.checkinUser(evt)
        this.fireUpdate();
    }

    getUsers() {
        return Object.keys(this.users).map((key)=>this.users[key]);
    }

}


//var pres = new PresenceService({pubnub:pubnub, channel:'my-doc-1'});
export default PresenceService;
