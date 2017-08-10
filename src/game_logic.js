function GameLogic() {
    this.keyState = {};     // keyboard key state handling (keeping it simple)
    this.messageQueue = null;
    this.timer = null;
    this.fixed_dt_s = 0.015;
}

GameLogic.prototype.initialize = function() {
    // Key state dict is keyed on keypress event "code", e.g. "KeyW" (as opposed to "keyCode", which is a number, like 87)
    // Value is true if the key is down; false if the key is up
    this.keyState["KeyW"] = false;
    this.keyState["KeyA"] = false;
    this.keyState["KeyS"] = false;
    this.keyState["KeyD"] = false;

    this.messageQueue = new MessageQueue();
    this.messageQueue.initialize(64);
    this.messageQueue.registerListener('UserInput', this, this.actOnUserInputMessage);

    this.timer = new Timer();
}


GameLogic.prototype.setThrust = function(shipRef) {
    // TODO implement the command pattern for ship controls (thrust and turning). The command pattern will allow for AI
}

GameLogic.prototype.setAngularVel = function(shipRef, angVel) {
    // 
}


GameLogic.prototype.processMessages = function(dt_s) {
    // dt_s is not used specifically by processMessages, but is passed in in case functions called by processMessages need it
    //console.log('MessageQueue has ' + this.messageQueue.numItems() + ' items in it');
    for (var i = 0, l = this.messageQueue.numItems(); i < l; i++) {
        console.log('Processing message');
        // NOTE: If the queue is initialized with dummy values, then this loop will iterate over dummy values
        // It may be better to use a queue that is has an actual empty array when the queue is empty
        // That way, this loop will not run unless items actually exist in the queue
        let msg = this.messageQueue.dequeue();

        for (var the_topic in this.messageQueue._registeredListeners)
        {
            console.log('Iterating over topic: ' + the_topic);

            for (var j = 0, lj = this.messageQueue._registeredListeners[the_topic].length; j < lj; j++) {
                // Call the handler if the msg.topic matches the_topic
                if (msg.topic == the_topic) {
                    // TODO evaluate why we're storing the listeners as dicts {id: ref}; why not just use a list?
                    //fn_to_call = this.messageQueue._registeredListeners[the_topic][j];
                    //fn_to_call(msg);

                    let fn_to_call = this.messageQueue._registeredListeners[the_topic][j];
                    fn_to_call["func"].call(fn_to_call["obj"], msg)
                }
            }
        }
    }
};


GameLogic.prototype.handleKeyboardInput = function(evt) {
    // This function is the "quarterback" for handling user keyboard input
    console.log(evt);

    if (evt.type == "keydown") {
        this.handleKeyDownEvent(evt);
    }
    else if (evt.type == "keyup") {
        this.handleKeyUpEvent(evt);
    }
};

GameLogic.prototype.handleKeyDownEvent = function(evt) {
    console.log(this);
    // NOTE: We don't define these function on the prototype it inherited from; we define the function at the object level
    console.log('Key code ' + evt.keyCode + ' down');

    //if (evt.keyCode == 67) {
    if (evt.code == "KeyC") {
        // User pressed C key
        console.log('Enqueueing a command message');    // TODO enqueue a regular ol' dict object

        var cmdMsg = { "topic": "PlayerControl",
                       "command": "TODO pick something sensible"
                     };
        this.messageQueue.enqueue(cmdMsg);  // Remember: we inherited a message queue from the base game logic class

    }
    // TODO from here, set controller state variables that the ship will use to control direction, thrust, guns, etc.
};


GameLogic.prototype.handleKeyUpEvent = function(evt) {
    console.log('Key code ' + evt.keyCode + ' up');
};

GameLogic.prototype.actOnUserInputMessage = function(msg) {
    console.log('actOnUserInputMessage: "this" =');
    console.log(this);
    if (msg["topic"] == "PlayerControl") {
        console.log('Command: Topic=' + msg["topic"] + ', Command=' + msg["command"]);

        // TODO issue ship control commands from here (i.e. use command pattern)
        if (msg["command"] == 'ChangeCamera') {
            console.log('Taking some action (TODO finish this)');
        }
    }
}

GameLogic.prototype.update = function(dt_s) {
    // TODO perform integration, collision detection, etc. See Falldown WebGL for a good mainloop example
}
