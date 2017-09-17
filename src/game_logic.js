function GameLogic() {
// TODO: Probably make the GameLogic class implement some interface that has the necessary functions that all GameLogic objects must have
    this.gameObjs = {};
	this.keyCtrlMap = {};   // keyboard key state handling (keeping it simple)
    this.messageQueue = null;
    this.timer = null;
    this.fixed_dt_s = 0.015;
    this.objectIDToAssign = -1;  // probably belongs in the base class.
}

GameLogic.prototype.initialize = function() {
    // Key control map is keyed on keypress event "code", e.g. "KeyW" (as opposed to "keyCode", which is a number, like 87)
    this.keyCtrlMap["thrust"] = { "code": "KeyW", "state": false };
    this.keyCtrlMap["turnLeft"] = { "code": "KeyA", "state": false };
    this.keyCtrlMap["turnRight"] = { "code": "KeyD", "state": false };
    this.keyCtrlMap["fireA"] = { "code": "ShiftLeft", "state": false };

    this.messageQueue = new MessageQueue();
    this.messageQueue.initialize(64);
    this.messageQueue.registerListener('UserInput', this, this.actOnUserInputMessage);  // TODO - clean this up; the "UserInput" topic appears to be unused. The original idea was to first handle keyboard input (topic = UserInput), and then in the registered input listener function, enqueue messages with "GameCommand" (on both keyup and keydown events). But I don't think the 2-layer approach is necessary. I think we can go directly from the separate handleKeyDown and handleKeyUp functions to enqueueing the appropriate game actions
    this.messageQueue.registerListener('GameCommand', this, this.sendCmdToGameObj);

    this.timer = new Timer();

    // ----- Initialize collision manager
    // NOTE: Collision Manager is initialized first, so that other items can access it and register their collision objects with it
    this.addGameObject("collisionMgr", new CollisionManager());
    this.gameObjs["collisionMgr"].initialize( {"x":0, "y":0, "width":512, "height":512} );     // width/height should match canvas width/height (maybe just use the canvas object?) .. Or.... should the quadtree size match the arena size (which is larger than the canvas)?

    // ----- Initialize thrust/rocket particle system
    this.addGameObject("thrustPS", new ParticleSystem());
    this.gameObjs["thrustPS"].initialize(1024);

    // ----- Initialize Bullet Manager system
    // Note: bullet mgr has to come before spaceship so that spaceship can register as a bullet emitter
    this.addGameObject("bulletMgr", new BulletManager());
    this.gameObjs["bulletMgr"].initialize(256);

    // ----- Initialize spaceship
    // TODO possibly make a Saceship Manager or something similar - for when we add spaceship bots; or move this into a ship.initialize() function.. something
    this.addGameObject("ship", new Spaceship());
    this.gameObjs["ship"].components["render"].setImgObj(game.imgMgr.imageMap["ship"].imgObj);    // <-- hmm.. not super clean-looking...
    this.gameObjs["ship"].components["collision"].update(0);    // Do an update to force the collision to compute its boundaries
    this.gameObjs["collisionMgr"].addCollider(this.gameObjs["ship"].components["collision"]);   // Have to do the collision manager registration out here, because the spaceship is fully formed at this point (we can't do it in the spaceship constructor (in its current form) -- the parent obj is not passed in)

    var spaceshipThrustPE = this.gameObjs["ship"].components["thrustPE"];       // Get the spaceship's thrust particle emitter
    spaceshipThrustPE.registerParticleSystem(this.gameObjs["thrustPS"]);

    var spaceshipGunPE = this.gameObjs["ship"].components["gunPE"];             // Get the spaceship's gun particle emitter
    spaceshipGunPE.registerParticleSystem(this.gameObjs["bulletMgr"].components["gunPS"]);

    // ----- Initialize Asteroid Manager
    this.addGameObject("astMgr", new AsteroidManager());
    this.gameObjs["astMgr"].initialize(1, 4);

    // ----- Initialize Arena
    // TODO -- make arena. Simplest is rectangle obj {x, y, width, height}; but can also make a class, with arbitrary arena shape, and the ability to test for containment of objs within itself.  Can use this test to determine when to expire bullet objects

};

GameLogic.prototype.addGameObject = function(objName, obj) {
    // TODO assign the current GameLogic.objectIDToAssign to the object (probably add to the GameObject prototype); increment the GameLogic object's objectIDToAssign
    this.objectIDToAssign += 1;

    this.gameObjs[objName] = obj;
    this.gameObjs[objName].objectID = this.objectIDToAssign;
    this.gameObjs[objName].parentObj = this;
};


GameLogic.prototype.setThrust = function(shipRef) {
    // TODO implement the command pattern for ship controls (thrust and turning). The command pattern will allow for AI
};

GameLogic.prototype.setAngularVel = function(shipRef, angVel) {
    // 
};

GameLogic.prototype.draw = function() {
    // Clear the canvas (note that the game application object is global)
    game.context.fillStyle = 'black';
    game.context.fillRect(0,0, game.canvas.width, game.canvas.height);

    // the game application obj is global
    for (var goKey in this.gameObjs) {
        if (this.gameObjs.hasOwnProperty(goKey)) {
            if ("render" in this.gameObjs[goKey].components || this.gameObjs[goKey].draw) {  // Make sure the component has a render component, or otherwise has a draw method
                this.gameObjs[goKey].draw(game.context);        // Assume that the draw() function for a GameObject calls into the draw() function for its render component
            }
        }
    }
};


GameLogic.prototype.processMessages = function(dt_s) {
    // dt_s is not used specifically by processMessages, but is passed in in case functions called by processMessages need it
    //console.log('MessageQueue has ' + this.messageQueue.numItems() + ' items in it');
    for (var i = 0, l = this.messageQueue.numItems(); i < l; i++) {
        console.log('Processing message');
        // NOTE: If the queue is initialized with dummy values, then this loop will iterate over dummy values
        // It may be better to use a queue that is has an actual empty array when the queue is empty
        // That way, this loop will not run unless items actually exist in the queue
        var msg = this.messageQueue.dequeue();

        for (var the_topic in this.messageQueue._registeredListeners)
        {
            console.log('Iterating over topic: ' + the_topic);

            for (var j = 0, lj = this.messageQueue._registeredListeners[the_topic].length; j < lj; j++) {
                // Call the handler if the msg.topic matches the_topic
                if (msg.topic == the_topic) {
                    // TODO evaluate why we're storing the listeners as dicts {id: ref}; why not just use a list?
                    //fn_to_call = this.messageQueue._registeredListeners[the_topic][j];
                    //fn_to_call(msg);

                    var fn_to_call = this.messageQueue._registeredListeners[the_topic][j];
                    fn_to_call["func"].call(fn_to_call["obj"], msg);
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
    // Also note: Not relevant for this game, but this event-based approach can be used for many input schemes. e.g., for a fighting game, instead of directly enqueuing game commands, we could enqueue key presses with time stamps, to determine if a "special move combo" was entered
    console.log('Key code ' + evt.keyCode + ' down');

    // NOTE: apparently, it is not possible to disable key repeat in HTML5/Canvas/JS..
    var cmdMsg = {};
    if (evt.code == this.keyCtrlMap["thrust"]["code"]) {
        // User pressed thrust key
        this.keyCtrlMap["thrust"]["state"] = true;  // TODO figure out if we're using state here, and possibly get rid of it. We seem to not be processing the key states anywhere; instead, we enqueue commands immediately on state change

        // Note that the payload of messages in the queue can vary depending on context. At a minimum, the message MUST have a topic
        // TODO keep a reference to the player-controlled obj, instead of hard-coding?
        cmdMsg = { "topic": "GameCommand",
                   "command": "setThrustOn",
                   "objRef": this.gameObjs["ship"],
                   "params": null
                 };
        this.messageQueue.enqueue(cmdMsg);
    }

    if (evt.code == this.keyCtrlMap["fireA"]["code"]) {
        // User pressed the fire A key (e.g. primary weapon)
        cmdMsg = { "topic": "GameCommand",
                   "command": "setFireAOn",
                   "objRef": this.gameObjs["ship"],
                   "params": null
                 };
        this.messageQueue.enqueue(cmdMsg);
    }

    if (evt.code == this.keyCtrlMap["turnLeft"]["code"]) {
        // User pressed turnLeft key
        this.keyCtrlMap["turnLeft"]["state"] = true;
        cmdMsg = { "topic": "GameCommand",
                   "command": "setTurnLeftOn",
                   "objRef": this.gameObjs["ship"],
                   "params": null
                 };
        this.messageQueue.enqueue(cmdMsg);
    }
    else if (evt.code == this.keyCtrlMap["turnRight"]["code"]) {
        // User pressed turnRight key
        this.keyCtrlMap["turnRight"]["state"] = true;
        cmdMsg = { "topic": "GameCommand",
                   "command": "setTurnRightOn",
                   "objRef": this.gameObjs["ship"],
                   "params": null
                 };
        this.messageQueue.enqueue(cmdMsg);
    }
};


GameLogic.prototype.handleKeyUpEvent = function(evt) {
    console.log('Key code ' + evt.keyCode + ' up');

    if (evt.code == this.keyCtrlMap["thrust"]["code"]) {
        // User released thrust key
        this.keyCtrlMap["thrust"]["state"] = false;

        cmdMsg = { "topic": "GameCommand",
                   "command": "setThrustOff",
                   "objRef": this.gameObjs["ship"],
                   "params": null
                 };
        this.messageQueue.enqueue(cmdMsg);
    }

    if (evt.code == this.keyCtrlMap["fireA"]["code"]) {
        // User pressed the fire A key (e.g. primary weapon)
        cmdMsg = { "topic": "GameCommand",
                   "command": "setFireAOff",
                   "objRef": this.gameObjs["ship"],
                   "params": null
                 };
        this.messageQueue.enqueue(cmdMsg);
    }

    if (evt.code == this.keyCtrlMap["turnLeft"]["code"]) {
        // User pressed turnLeft key
        this.keyCtrlMap["turnLeft"]["state"] = false;
        cmdMsg = { "topic": "GameCommand",
                   "command": "setTurnOff",
                   "objRef": this.gameObjs["ship"],
                   "params": null
                 };
        this.messageQueue.enqueue(cmdMsg);
    }

    else if (evt.code == this.keyCtrlMap["turnRight"]["code"]) {
        // User pressed turnRight key
        this.keyCtrlMap["turnRight"]["state"] = false;
        cmdMsg = { "topic": "GameCommand",
                   "command": "setTurnOff",
                   "objRef": this.gameObjs["ship"],
                   "params": null
                 };
        this.messageQueue.enqueue(cmdMsg);
    }

};

GameLogic.prototype.update = function(dt_s, config = null) {
    // TODO perform integration, collision detection, etc. See Falldown WebGL for a good mainloop example
    for (var goKey in this.gameObjs) {
        if (this.gameObjs.hasOwnProperty(goKey)) {
            this.gameObjs[goKey].update(dt_s);
        }
    }
};

GameLogic.prototype.actOnUserInputMessage = function(msg) {
    console.log('actOnUserInputMessage: "this" =');
    console.log(this);
    if (msg["topic"] == "UserInput") {
        console.log('Command: Topic=' + msg["topic"] + ', Command=' + msg["command"]);

        // TODO issue ship control commands from here (i.e. use command pattern)
        if (msg["command"] == 'ChangeCamera') {
            console.log('Taking some action (TODO finish this)');
            // TODO probably enqueue a new message, with topic "GameCommand". The AI will also use this
        }
    }
};

GameLogic.prototype.sendCmdToGameObj = function(msg) {
    // NOTE: because we have only 1 parameter to this function (really, to all registered listeners of a message queue), a ref to the object to which to send the cmd is included as part of the msg
    console.log("sendCmdToGameObj: ");
    console.log(msg);

    // Call the executeCommand() function with the given command (all GameObjs will have an executeCommand() function)
    msg["objRef"].executeCommand(msg["command"], msg["params"]);
};

