function GameStateShipSelect() {
    // TODO 2018-09-09 - pass ship selection in to game
    GameStateBase.call(this);

    this.uiItems = [];

    this.messageQueue = null;

    this.shipSelectMap = {};    // A dict of ships to choose from
    this.shipSelectIdx = 0;
    this.numSelectableShips = 0;
}

GameStateShipSelect.prototype = Object.create(GameStateBase.prototype);
GameStateShipSelect.prototype.constructor = GameStateShipSelect;


GameStateShipSelect.prototype.initialize = function(transferObj = null) {
    this.messageQueue = new MessageQueue();
    this.messageQueue.initialize(2);
    this.messageQueue.registerListener('UICommand', this, this.doUICommand);
    
    // NOTE: game is a global object
    this.uiItems.push( new uiItemText("Select Ship", "36px", "MenuFont", "white", 0.5, 0.45, "center", "middle", {"command": "changeState", "params": {"stateName": "Playing"}}) );  // Currently, stateName is the name of the state obj (var) in the global scope
    this.uiItems.push( new uiItemText("Return", "36px", "MenuFont", "white", 0.5, 0.85, "center", "middle", {"command": "changeState", "params": {"stateName": "MainMenu"}}) );  // Currently, stateName is the name of the state obj (var) in the global scope

    this.activeItemIndex = 0;
    this.activeItem = this.uiItems[this.activeItemIndex];

    // Note: the colorScheme values are hard-coded based on color/pixel analysis of the texture images, using GIMP
    this.shipSelectMap = { 0: { "imgObj": game.imgMgr.imageMap["ship0"].imgObj, "colorScheme": { "light": [249, 23, 23], "medium": [162, 16, 16], "dark": [81, 8, 8] }},
                           1: { "imgObj": game.imgMgr.imageMap["ship1"].imgObj, "colorScheme": { "light": [64, 16, 234], "medium": [48, 12, 158], "dark": [24, 6, 80] }},
                           2: { "imgObj": game.imgMgr.imageMap["ship2"].imgObj, "colorScheme": { "light": [87, 82, 82], "medium": [29, 26, 26], "dark": [15, 13, 13] }}
                         };
    this.numSelectableShips = Object.keys(this.shipSelectMap).length;
};

GameStateShipSelect.prototype.cleanup = function() {
};

GameStateShipSelect.prototype.preRender = function(canvasContext, dt_s) {
};

GameStateShipSelect.prototype.render = function(canvasContext, dt_s) {
    canvasContext.save();
    canvasContext.setTransform(1,0,0,1,0,0);    // Reset transformation (similar to OpenGL loadIdentity() for matrices)

    // Clear the canvas (note that the game application object is global)
    canvasContext.fillStyle = 'black';
    canvasContext.fillRect(0,0, canvasContext.canvas.width, canvasContext.canvas.height);

    // Set the transform for the image
    canvasContext.save();
    canvasContext.setTransform(1,0,0,1,400,150);    // Reset transformation (similar to OpenGL loadIdentity() for matrices) TODO maybe don't hardcode image coordinates
    
    // Draw the ship
    var imgObj = this.shipSelectMap[this.shipSelectIdx].imgObj;
    canvasContext.drawImage(imgObj, -imgObj.width / 2, -imgObj.height / 2);

    canvasContext.restore();    // "pop" the transform

    // Now, draw UI items
    for (var item of this.uiItems) {
        item.draw(canvasContext);
    }

    // Highlight active item
    // TODO call getWidth() on active item; round up to nearest int (e.g. because measureText() returns float); multiply by 1.5. Make a rect
    var hlItem = this.uiItems[this.activeItemIndex];
    var hlWidth = Math.ceil( hlItem.getWidth(canvasContext) * 1.5 );
    var hlHeight = Math.ceil( hlItem.getHeight(canvasContext) * 1.5);
    var hlX = Math.floor(MathUtils.lerp(hlItem.posNDC[0], 0, canvasContext.canvas.width) - hlWidth/2);
    var hlY = Math.floor(MathUtils.lerp(hlItem.posNDC[1], 0, canvasContext.canvas.height) - hlHeight/2);

    canvasContext.lineWidth = 3;
    canvasContext.strokeStyle = "yellow";
    canvasContext.strokeRect(hlX, hlY, hlWidth, hlHeight);

    canvasContext.restore();
};


GameStateShipSelect.prototype.postRender = function(canvasContext, dt_s) {
    this.processMessages(dt_s);
};


GameStateShipSelect.prototype.handleKeyboardInput = function(evt) {
    if (evt.type == "keydown") {
        // haven't decided what (if anything) to do on keydown
    } else if (evt.type == "keyup") {
        switch(evt.code) {
            case "ArrowUp":
                this.activeItemIndex = (this.activeItemIndex + this.uiItems.length - 1) % this.uiItems.length;
                break;
            case "ArrowDown":
                this.activeItemIndex = (this.activeItemIndex + 1) % this.uiItems.length;
                break;
            case "ArrowLeft":
                this.shipSelectIdx = (this.shipSelectIdx - 1 + this.numSelectableShips) % this.numSelectableShips;
                break;
            case "ArrowRight":
                this.shipSelectIdx = (this.shipSelectIdx + 1) % this.numSelectableShips;
                break;
            case "Enter":
            case "Space":
                // Enqueue an action to be handled in the postRender step. We want all actions (e.g. state changes, etc.) to be handled in postRender, so that when the mainloop cycles back to the beginning, the first thing that happens is the preRender step in the new state (if the state changed)

                // transferObj is used if we are switching into the Playing state.
                // The hard-coding feels janky here, but it will get the job done
                var transferObj = null;
                if (this.uiItems[this.activeItemIndex].actionMsg["params"].stateName == "Playing") {
                    transferObj = this.shipSelectMap[this.shipSelectIdx];
                }

                var cmdMsg = { "topic": "UICommand",
                               "targetObj": this,
                               "command": this.uiItems[this.activeItemIndex].actionMsg["command"],
                               "params": this.uiItems[this.activeItemIndex].actionMsg["params"],
                               "transferObj": transferObj
                             };
                this.messageQueue.enqueue(cmdMsg);
                break;
        }
    }
};


GameStateShipSelect.prototype.processMessages = function(dt_s) {
    // dt_s is not used specifically by processMessages, but is passed in in case functions called by processMessages need it
    //console.log('MessageQueue has ' + this.messageQueue.numItems() + ' items in it');

    while (!this.messageQueue._empty) {
        //console.log('Processing message');
        // NOTE: If the queue is initialized with dummy values, then this loop will iterate over dummy values
        // It may be better to use a queue that is has an actual empty array when the queue is empty
        // That way, this loop will not run unless items actually exist in the queue
        var msg = this.messageQueue.dequeue();

        //console.log('Iterating over topic: ' + msg.topic);

        for (var handler of this.messageQueue._registeredListeners[msg.topic]) {
            handler["func"].call(handler["obj"], msg);
        }
    }
};


GameStateShipSelect.prototype.doUICommand = function(msg) {
    // Take action on a message with topic, "UICommand"
    // UICommand messages contain a command, a targetObj (i.e. who's going to execute the command), and a params list
    // The command is most likely to call a function. This is not quite a function callback, because we are not storing a pre-determined function ptr
    //console.log("In doUICommand(), with msg = ", msg);

    switch (msg.command) {
        case "changeState":
            // call the game state manager's changestate function
            // NOTE gameStateMgr is global, because I felt like making it that way. But we could also have the GameStateManager handle the message (instead of having this (active game state) handle the message, by calling a GameStateManager member function
            gameStateMgr.changeState(gameStateMgr.stateMap[msg.params.stateName], msg.transferObj);
            break;
    }

};
