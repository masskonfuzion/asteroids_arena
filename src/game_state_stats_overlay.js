// Game state for showing stats overlay, e.g. at end of game
function GameStateStatsOverlay() {
    GameStateBase.call(this);
    this.uiItems = [];
    this.messageQueue = null;
    this.activeItemIndex = 0;
    this.activeItem = null;
    this.bgm = null;
}

GameStateStatsOverlay.prototype = Object.create(GameStateBase.prototype);
GameStateStatsOverlay.prototype.constructor = GameStateStatsOverlay;


GameStateStatsOverlay.prototype.initialize = function(transferObj = null) {
    this.messageQueue = new MessageQueue();
    this.messageQueue.initialize(2);
    this.messageQueue.registerListener('UICommand', this, this.doUICommand);

    // create the end-of-game message display, based on the passed-in object
    this.createDisplayMessage(transferObj.scoresAndStats);

    this.activeItemIndex = 0;
    this.activeItem = this.uiItems[this.activeItemIndex];

    this.bgm = transferObj.bgmObj;

};


GameStateStatsOverlay.prototype.cleanup = function() {
    this.uiItems = [];
    if (this.bgm) {
        this.bgm.stop();
    }
};


GameStateStatsOverlay.prototype.preRender = function(canvasContext, dt_s) {
};

// Create the game over display message (using menu/ui items)
GameStateStatsOverlay.prototype.createDisplayMessage = function(infoObj) {
    // TODO Process the gameStats object (passed into this function via param) into collection of messages and their corresponding positions (essentially a control template for the display of the Game Over message -- i.e. score leaders in descending order).  Sort scores -- implement tie breakers to present proper winners at the end of games (if, e.g. 2 players have the score for the key scoring metric)
    switch(infoObj.settings.gameMode) {
        case "Death Match":
        var winMsg = infoObj.winnerInfo.characterName + " wins!";
        this.uiItems.push( new uiItemText(winMsg, "36px", "MenuFont", "white", 0.5, 0.35, "center", "middle", {"command": "changeState", "params": {"stateName": "MainMenu"} }) );

        break;

        case "Time Attack":
        var winMsg = infoObj.winnerInfo.characterName  + " wins with " + infoObj.winnerInfo.kills.toString() + " kills in " + game.settings.visible.gameModeSettings.timeAttack.timeLimit + "!!";
        this.uiItems.push( new uiItemText(winMsg, "36px", "MenuFont", "white", 0.5, 0.35, "center", "middle", {"command": "changeState", "params": {"stateName": "MainMenu"} }) );
        break;
    }


    var rankedShipIDs = this.sortScores(infoObj.stats);

    var i = 0;

    // A couple of vars to control layout. NOTE: next time around, we'll use a layout object of some sort (maybe a JSON layout?)
    var yNDC = 0.55;
    var ySpacing = 0.1;

    var objectIDForCharacterNameLookup = "";
    var shipObjectID = "";
    var characterName = "";

    // Iterate backwards because rankedShipIDs is sorted in ascending order; we want to print out highest to lowest scores
    for (var loopIdx = rankedShipIDs.length - 1; loopIdx >= 0; loopIdx -= 1) {
        var shipID = rankedShipIDs[loopIdx];
        // I could use Object.keys() and Object.values()... but I don't trust JavaScript.. O(n**2) lookup it is..
        for (var shipObjectID in infoObj.shipDict) {
            if (infoObj.shipDict[shipObjectID] == shipID) {
                characterName = infoObj.characters[shipObjectID].callSign;
                break;
            }
        }

        this.uiItems.push( new uiItemText(characterName, "20px", "MenuFont", "white", 0.3, yNDC + (i * ySpacing), "center", "middle", null ) );
        this.uiItems.push( new uiItemText("Kills:", "20px", "MenuFont", "white", 0.4, yNDC + (i * ySpacing), "center", "middle", null ) );
        this.uiItems.push( new uiItemText(infoObj.stats[shipID].kills.toString(), "20px", "MenuFont", "white", 0.44, yNDC + (i * ySpacing), "center", "middle", null ) );
        this.uiItems.push( new uiItemText("Deaths:", "20px", "MenuFont", "white", 0.52, yNDC + (i * ySpacing), "center", "middle", null ) );
        this.uiItems.push( new uiItemText(infoObj.stats[shipID].deaths.toString(), "20px", "MenuFont", "white", 0.57, yNDC + (i * ySpacing), "center", "middle", null ) );
        this.uiItems.push( new uiItemText("Score:", "20px", "MenuFont", "white", 0.64, yNDC + (i * ySpacing), "center", "middle", null ) );
        this.uiItems.push( new uiItemText(infoObj.stats[shipID].score.toString(), "20px", "MenuFont", "white", 0.72, yNDC + (i * ySpacing), "center", "middle", null ) );
        i += 1;
    }
};

GameStateStatsOverlay.prototype.render = function(canvasContext, dt_s) {
    canvasContext.save();
    canvasContext.setTransform(1,0,0,1,0,0);    // Reset transformation (similar to OpenGL loadIdentity() for matrices)

    // Clear the canvas (note that the game application object is global)
    canvasContext.fillStyle = 'black';
    canvasContext.fillRect(0,0, canvasContext.canvas.width, canvasContext.canvas.height);

    for (var item of this.uiItems) {
        item.draw(canvasContext);
    }

    // Highlight active item
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


GameStateStatsOverlay.prototype.postRender = function(canvasContext, dt_s) {
    this.processMessages(dt_s);
};


GameStateStatsOverlay.prototype.handleKeyboardInput = function(evt) {
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
            case "Enter":
                // Enqueue an action to be handled in the postRender step. We want all actions (e.g. state changes, etc.) to be handled in postRender, so that when the mainloop cycles back to the beginning, the first thing that happens is the preRender step in the new state (if the state changed)
                var cmdMsg = { "topic": "UICommand",
                               "targetObj": this,
                               "command": this.uiItems[this.activeItemIndex].actionMsg["command"],
                               "params": this.uiItems[this.activeItemIndex].actionMsg["params"]
                             };
                this.messageQueue.enqueue(cmdMsg);
                break;
        }
    }
};


GameStateStatsOverlay.prototype.processMessages = function(dt_s) {
    // dt_s is not used specifically by processMessages, but is passed in in case functions called by processMessages need it
    //console.log('MessageQueue has ' + this.messageQueue.numItems() + ' items in it');

    while (!this.messageQueue._empty) {
        //console.log('Processing message');
        var msg = this.messageQueue.dequeue();

        //console.log('Iterating over topic: ' + msg.topic);

        for (var handler of this.messageQueue._registeredListeners[msg.topic]) {
            handler["func"].call(handler["obj"], msg);
        }
    }
};


GameStateStatsOverlay.prototype.doUICommand = function(msg) {
    // Take action on a message with topic, "UICommand"
    // UICommand messages contain a command, a targetObj (i.e. who's going to execute the command), and a params list
    // The command is most likely to call a function. This is not quite a function callback, because we are not storing a pre-determined function ptr
    //console.log("In doUICommand(), with msg = ", msg);

    switch (msg.command) {
        case "changeState":
            // NOTE: This popState command calls the gameStateManager's resumeState(). There is a pushState() and popState() - maybe consolidate pauseState and resumeState into pushState and popState?

            // NOTE gameStateMgr is global, because I felt like making it that way. But we could also have the GameStateManager handle the message (instead of having this (active game state) handle the message, by calling a GameStateManager member function
            //gameStateMgr.resumeState();   // This is what we would call in an actual overlay.
            gameStateMgr.changeState(gameStateMgr.stateMap[msg.params.stateName]);
            break;
    }

};


GameStateStatsOverlay.prototype.sortScores = function(scoreObj) {
    var rankedShipIDs = Object.getOwnPropertyNames(scoreObj);

    // sort ascending by kills
    for (var fill_slot = rankedShipIDs.length - 1; fill_slot > 0; fill_slot -= 1) {
        var pos_of_max = 0;
        for (var loc  = 1; loc <= fill_slot; loc += 1) {
            if (scoreObj[rankedShipIDs[loc]].kills > scoreObj[rankedShipIDs[pos_of_max]].kills) {
                pos_of_max = loc;
            }
        }

        var temp = rankedShipIDs[fill_slot];
        rankedShipIDs[fill_slot] = rankedShipIDs[pos_of_max];
        rankedShipIDs[pos_of_max] = temp;
    }

    return rankedShipIDs;
};
