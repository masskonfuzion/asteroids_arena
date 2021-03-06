function GameStateHighScores() {
    GameStateBase.call(this);
    this.messageQueue = null;

    // The following members should really be members of a Menu/UI class. Maybe I'll still implement that..
    this.uiItems = [];

    this.highlightedItemIndex = 0;
    this.highlightedItem = null;    // Highlighted item, not necessarily selected/active

    this.activeItemIndex = -1;      // -1 means "no active selection"; but probably rely on the value of activeItem itself to determine whether or not the user is interacting with an item
    this.activeItem = null;         // Active/selected item

    this.currPage = 0;  // "Page" number, for looking at different "pages" of high scores data
    this.numPages = 0;
    this.highScores = {};

    this.scoreCategories = ["timeAttack", "deathMatch"];
    this.scoreCategorySelector = 0;
    this.timeAttackPageLabels = []; // List of "page labels" -- the different time lengths (in timeAttack) 
    this.deathMatchPageLabels = []; // List of "page labels" -- the different kill counts

    this.bgm = null;
}

GameStateHighScores.prototype = Object.create(GameStateBase.prototype);
GameStateHighScores.prototype.constructor = GameStateHighScores;

GameStateHighScores.prototype.initialize = function(transferObj = null) {
    this.messageQueue = new MessageQueue();
    this.messageQueue.initialize(2);
    this.messageQueue.registerListener('UICommand', this, this.doUICommand);

    this.loadHighScores();

    this.refreshPage();


    // Get background music player object
    if (transferObj && transferObj.bgmObj) {
        this.bgm = transferObj.bgmObj;
    }
    // Note: no else case for the bgmObj.. technically, we shouldn't even need the "if", because there should always be a bgmObj coming from the previous state (which should always be the MainMenu)
};

GameStateHighScores.prototype.loadHighScores = function() {
    var highScoresObj = localStorage.getItem('highScores');

    if (highScoresObj) {
        this.highScores = JSON.parse(highScoresObj);
    }
    else {
        // We shouldn't ever reach this block. If we do get here, it means high scores are corrupted in the web browser's localStorage space.
        // The easiest fix would be to clear the browser cache for this game (which wuold wipe out scores and settings)
    }
    this.timeAttackPageLabels = Object.getOwnPropertyNames(this.highScores["timeAttack"]);
    this.deathMatchPageLabels = Object.getOwnPropertyNames(this.highScores["deathMatch"]);
};

GameStateHighScores.prototype.refreshPage = function() {
    this.uiItems = [];  // clear the uiItems list so we can build it anew

    switch(this.scoreCategorySelector) {
        case 0: // timeAttack
            this.refreshScorePageTimeAttack();
            this.numPages = this.timeAttackPageLabels.length;
        break;
        case 1: // deathMatch
            this.refreshScorePageDeathMatch();
            this.numPages = this.deathMatchPageLabels.length;
        break;
    }


    // Static UI items
    this.uiItems.push( new uiItemText("Mode", "16px", "MenuFont", "white", 0.85, 0.05, "right", "middle", null ) );
    this.uiItems.push( new uiItemImage(game.imgMgr.imageMap["kb_up_icon"].imgObj, 0.9, 0.05, "center", "middle", null ) );
    this.uiItems.push( new uiItemImage(game.imgMgr.imageMap["kb_down_icon"].imgObj, 0.95, 0.05, "center", "middle", null ) );
    this.uiItems.push( new uiItemImage(game.imgMgr.imageMap["kb_left_icon"].imgObj, 0.07, 0.85, "center", "middle", null ) );
    this.uiItems.push( new uiItemText("Prev", "16px", "MenuFont", "white", 0.07, 0.80, "center", "middle", null ) );
    this.uiItems.push( new uiItemImage(game.imgMgr.imageMap["kb_right_icon"].imgObj, 0.93, 0.85, "center", "middle", null ) );
    this.uiItems.push( new uiItemText("Next", "16px", "MenuFont", "white", 0.93, 0.80, "center", "middle", null ) );
    this.uiItems.push( new uiItemText("Return", "36px", "MenuFont", "white", 0.5, 0.85, "center", "middle", {"command": "changeState", "params": {"stateName": "MainMenu"}}) );  // Currently, stateName is the name of the state obj (var) in the global scope

    // highlight the first highlightable item (this code duplicates the ArrorDown key handler. I'm being really lazy/sloppy with the code here)
    this.highlightedItemIndex = (this.highlightedItemIndex + 1) % this.uiItems.length;
    while (this.uiItems[this.highlightedItemIndex].isSelectable != true) {
        this.highlightedItemIndex = (this.highlightedItemIndex + 1) % this.uiItems.length;
    }
    this.highlightedItem = this.uiItems[this.highlightedItemIndex];
};


GameStateHighScores.prototype.cleanup = function() {
    this.uiItems = [];

    // Save settings to localStorage. We have to JSON.stringify() the object, because localStorage wants key/value pairs of strings (even numbers get saved as strings)
    // TODO maybe the localStorage saving shouldn't happen in cleanup(), but in the handler for the return action
    localStorage.setItem('highScores', JSON.stringify(this.highScores));

    if (this.bgm) {
        this.bgm.stop();    // TODO move bgm out to a sound/resource manager
    }
};

GameStateHighScores.prototype.render = function(canvasContext, dt_s) {
    canvasContext.save();
    canvasContext.setTransform(1,0,0,1,0,0);    // Reset transformation (similar to OpenGL loadIdentity() for matrices)

    // Clear the canvas (note that the game application object is global)
    canvasContext.fillStyle = 'black';
    canvasContext.fillRect(0,0, canvasContext.canvas.width, canvasContext.canvas.height);

    // Draw UI items. (Should really be part of the render() or draw() method of a Menu/UI class
    for (var item of this.uiItems) {
        item.draw(canvasContext);
    }

    // Draw highlight box around currently highlightedItem (should really be part of a Menu/UI class)
    // TODO look at the alignment of the highlighted item - adjust highlight position based on left/center/align (actual text rendering position seems to be affected by that)
    var hlItem = this.uiItems[this.highlightedItemIndex];
    var hlWidth = Math.ceil( hlItem.getWidth(canvasContext) * 1.5 );
    var hlHeight = Math.ceil( hlItem.getHeight(canvasContext) * 1.5);

    var hlXOffset = (hlItem.hasOwnProperty("align") && hlItem.align == "center") ? -hlWidth / 2 : 0;
    //var hlYOffset = (hlItem.hasOwnProperty("baseline") && hlItem.align == "middle") ? -hlHeight / 2 : 0; // TODO delete, or update to handle top/middle/bottom
    var hlYOffset = -hlHeight / 2;  // Note: this highlight assumes that textBaseline (vertical align) is "middle"

    var hlX = Math.floor(MathUtils.lerp(hlItem.posNDC[0], 0, canvasContext.canvas.width) + hlXOffset);
    var hlY = Math.floor(MathUtils.lerp(hlItem.posNDC[1], 0, canvasContext.canvas.height) + hlYOffset);

    canvasContext.lineWidth = 3;
    
    canvasContext.strokeStyle = this.activeItem == null ? "yellow" : "red";
    canvasContext.strokeRect(hlX, hlY, hlWidth, hlHeight);

    canvasContext.restore();
};

GameStateHighScores.prototype.postRender = function(canvasContext, dt_s) {
    this.processMessages(dt_s);
};

GameStateHighScores.prototype.handleKeyboardInput = function(evt) {
    if (evt.type == "keydown") {
        // haven't decided what (if anything) to do on keydown
    } else if (evt.type == "keyup") {
        // TODO - correct KeyDown to KeyUp, everywhere
        switch(evt.code) {
            case "ArrowLeft":
                // If there is an active/selected UI item, send input to it
                if (this.activeItem) {
                    var cmdMsg = { "topic": "UICommand",
                                   "targetObj": this,
                                   "command": "sendUserInputToActiveItem",
                                   "params": { "event": "ActiveUIItem_HandleEvent_KeyDown_ArrowLeft" }
                                 };
                    this.messageQueue.enqueue(cmdMsg);
                }
                // Otherwise, decrease the "page number" of displayed high score data
                else {
                    this.currPage = (this.currPage + this.numPages - 1) % this.numPages;
                    this.refreshPage();
                }
                break;
            case "ArrowRight":
                // NOTE: "ActiveUIItem_HandleEvent_KeyDown_ArrowRight and etc. will be used to trigger function calls in the UI Items.  This object (i.e., the menu/form will need to call the functions on the form's active items.
                // Side note: I don't like this design. It forces the menu/UI itself to call the functions that make the UI items handle their own internal data. That's ugly. If I ever have to write another UI, I'd have menus be an object in & of themselves. The menu objects would store the menu layout, and also, they'd have the functions necessary to handle user input and pass whatever needs to be passed into UI items.

                // If there is an active/selected UI item, send input to it
                if (this.activeItem) {
                    var cmdMsg = { "topic": "UICommand",
                                   "targetObj": this,
                                   "command": "sendUserInputToActiveItem",
                                   "params": { "event": "ActiveUIItem_HandleEvent_KeyDown_ArrowRight" }
                                 };
                    this.messageQueue.enqueue(cmdMsg);
                }
                // Otherwise, increase the "page number" of displayed high score data
                else {
                    this.currPage = (this.currPage + 1) % this.numPages;
                    this.refreshPage();
                }
                break;
            case "ArrowDown":
            case "PageDown":
                if (!this.activeItem) {
                    // Change the score category selector, as long as there are no active/selected items (we don't want to change category while an item is active)
                    this.scoreCategorySelector = (this.scoreCategorySelector + 1) % this.scoreCategories.length;
                    this.currPage = 0;
                    this.refreshPage();
                }
                break;
            case "ArrowUp":
            case "PageUp":
                if (!this.activeItem) {
                    this.scoreCategorySelector = (this.scoreCategorySelector + this.scoreCategories.length - 1) % this.scoreCategories.length;
                    this.currPage = 0;
                    this.refreshPage();
                }
                break;
            case "Enter":
                // Enqueue an action to be handled in the postRender step. We want all actions (e.g. state changes, etc.) to be handled in postRender, so that when the mainloop cycles back to the beginning, the first thing that happens is the preRender step in the new state (if the state changed)

                // If we have an active item, deactivate it
                if (this.activeItem) {
                    this.activeItem.isActive = false;   // The UI Items store their activation state, so the menu can query it and determine how to interact with the UI items, based on user input
                    this.activeItemIndex = -1;
                    this.activeItem = null; // Unassign activeItem reference
                }

                // Else, we need to either select/activate the highlighted item (if it is selectable), or otherwise call the command of the "non-selectable" item
                else {
                    if (this.highlightedItem.actionMsg) {
                        // if the UI item has an actionMsg associated with it, then enqueue that message
                        var cmdMsg = { "topic": "UICommand",
                                       "targetObj": this,
                                       "command": this.uiItems[this.highlightedItemIndex].actionMsg["command"],
                                       "params": this.uiItems[this.highlightedItemIndex].actionMsg["params"]
                                     };
                        this.messageQueue.enqueue(cmdMsg);
                    }
                    else {
                        // Else, select the item (if it's selectable)
                        if (this.highlightedItem.isSelectable) {
                            this.activeItemIndex = this.highlightedItemIndex;
                            this.activeItem = this.uiItems[this.highlightedItemIndex];
                            this.activeItem.isActive = true;
                        }
                        else {
                            // This case is probably nonsense. I don't think it's possible, given the properties of the UI. But at this point, I'm writing hack'n'slash code, so here is the case, anyway
                        }
                    }
                }
                break;
            default:
                //Send ActiveUIItem_HandleEvent_KeyDown_Misc, which is a generic event - for example, with text input boxes, this sends regular typing keypresses to the box
                var cmdMsg = { "topic": "UICommand",
                               "targetObj": this,
                               "command": "sendUserInputToActiveItem",
                               "params": { "event": "ActiveUIItem_HandleEvent_KeyUp_Misc", "eventObj": evt }
                             };
                this.messageQueue.enqueue(cmdMsg);
                break;
                
        }
    }
};


GameStateHighScores.prototype.processMessages = function(dt_s) {
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


// Take action on a message with topic, "UICommand"
GameStateHighScores.prototype.doUICommand = function(msg) {
    // UICommand messages contain a command, a targetObj (i.e. who's going to execute the command), and a params list
    // The command is most likely to call a function. This is not quite a function callback, because we are not storing a pre-determined function ptr
    //console.log("In doUICommand(), with msg = ", msg);

    switch (msg.command) {
        case "changeState":
            // call the game state manager's changestate function
            // NOTE gameStateMgr is global, because I felt like making it that way. But we could also have the GameStateManager handle the message (instead of having this (active game state) handle the message, by calling a GameStateManager member function

            var transferBGM = null;
            if (this.bgm) {
                transferBGM = this.bgm;
                this.bgm = null;
            }
            var transferObj = {"bgmObj": transferBGM};
            gameStateMgr.changeState(gameStateMgr.stateMap[msg.params.stateName], transferObj);
            break;

        case "sendUserInputToActiveItem":
            if (this.activeItem) {
                this.sendUserInputToActiveItem(msg.params);
            }
            break;
    }
};


// Send a user input event to the active/selected item in this menu.
// NOTE: Any GameStates that want to implement a menu/UI must implement this function.
// Menus/UIs are not structured as objects
GameStateHighScores.prototype.sendUserInputToActiveItem = function(params) {
    this.activeItem.handleUserInput(params);
};


// Generate a list of UI items for a page of high scores, for time attack mode
// (Assumes that this.uiItems is an empty list
GameStateHighScores.prototype.refreshScorePageTimeAttack = function() {
    var timeLimit = this.timeAttackPageLabels[this.currPage];
    this.uiItems.push( new uiItemText("Time Attack", "36px", "MenuFont", "lightgray", 0.052, 0.052, "left", "middle") );
    this.uiItems.push( new uiItemText("Time Attack", "36px", "MenuFont", "yellow", 0.05, 0.05, "left", "middle") );
    this.uiItems.push( new uiItemText("Time Limit", "32px", "MenuFont", "white", 0.02, 0.15, "left", "middle") );
    this.uiItems.push( new uiItemText(timeLimit, "32px", "MenuFont", "white", 0.22, 0.15, "left", "middle") );

    var yNDC = 0.25;
    var ySpacing = 0.1;

    // scores
    for (var i = 0; i < this.highScores["timeAttack"][timeLimit].length; i++) {
        var scoreItem = this.highScores["timeAttack"][timeLimit][i];

        var callSign = scoreItem.callSign;
        this.uiItems.push( new uiItemText(callSign, "20px", "MenuFont", "white", 0.02, yNDC + (i * ySpacing), "left", "middle", null ) );
        this.uiItems.push( new uiItemImage(game.imgMgr.imageMap["kills_icon"].imgObj, 0.27, yNDC + (i * ySpacing), "right", "middle", null ) );
        this.uiItems.push( new uiItemText(scoreItem.kills.toString(), "20px", "MenuFont", "white", 0.28, yNDC + (i * ySpacing), "left", "middle", null ) );
        this.uiItems.push( new uiItemImage(game.imgMgr.imageMap["deaths_icon"].imgObj, 0.38, yNDC + (i * ySpacing), "right", "middle", null ) );
        this.uiItems.push( new uiItemText(scoreItem.deaths.toString(), "20px", "MenuFont", "white", 0.40, yNDC + (i * ySpacing), "left", "middle", null ) );

        this.uiItems.push( new uiItemImage(game.imgMgr.imageMap["asteroids_icon"].imgObj, 0.50, yNDC + (i * ySpacing), "right", "middle", null ) );
        this.uiItems.push( new uiItemText("S:", "20px", "MenuFont", "white", 0.54, yNDC + (i * ySpacing), "right", "middle", null ) );
        this.uiItems.push( new uiItemText(scoreItem.ast_s.toString(), "20px", "MenuFont", "white", 0.55, yNDC + (i * ySpacing), "left", "middle", null ) );
        this.uiItems.push( new uiItemText("M:", "20px", "MenuFont", "white", 0.62, yNDC + (i * ySpacing), "right", "middle", null ) );
        this.uiItems.push( new uiItemText(scoreItem.ast_m.toString(), "20px", "MenuFont", "white", 0.63, yNDC + (i * ySpacing), "left", "middle", null ) );
        this.uiItems.push( new uiItemText("L:", "20px", "MenuFont", "white", 0.70, yNDC + (i * ySpacing), "right", "middle", null ) );
        this.uiItems.push( new uiItemText(scoreItem.ast_l.toString(), "20px", "MenuFont", "white", 0.71, yNDC + (i * ySpacing), "left", "middle", null ) );

        this.uiItems.push( new uiItemText("Score:", "20px", "MenuFont", "white", 0.84, yNDC + (i * ySpacing), "right", "middle", null ) );
        this.uiItems.push( new uiItemText(scoreItem.score.toString(), "20px", "MenuFont", "white", 0.86, yNDC + (i * ySpacing), "left", "middle", null ) );
    }
};

// Generate a list of UI items for a page of high scores, for death match mode
// (Assumes that this.uiItems is an empty list
GameStateHighScores.prototype.refreshScorePageDeathMatch = function() {
    var killCount = this.deathMatchPageLabels[this.currPage];
    // Display kill count (TODO position a little bit lower on the screen, to make room for the game mode)
    this.uiItems.push( new uiItemText("Death Match", "36px", "MenuFont", "lightgray", 0.052, 0.052, "left", "middle") );
    this.uiItems.push( new uiItemText("Death Match", "36px", "MenuFont", "yellow", 0.05, 0.05, "left", "middle") );
    this.uiItems.push( new uiItemText(killCount, "32px", "MenuFont", "white", 0.05, 0.15, "left", "middle") );

    var yNDC = 0.25;
    var ySpacing = 0.1;

    // scores
    for (var i = 0; i < this.highScores["deathMatch"][killCount].length; i++) {
        var scoreItem = this.highScores["deathMatch"][killCount][i];

        var callSign = scoreItem.callSign;
        this.uiItems.push( new uiItemText(callSign, "20px", "MenuFont", "white", 0.02, yNDC + (i * ySpacing), "left", "middle", null ) );
        this.uiItems.push( new uiItemImage(game.imgMgr.imageMap["clock_icon"].imgObj, 0.27, yNDC + (i * ySpacing), "right", "middle", null ) );
        this.uiItems.push( new uiItemText(this.getTimeStringFromFloatValue(scoreItem.time), "20px", "MenuFont", "white", 0.28, yNDC + (i * ySpacing), "left", "middle", null ) );
    }
};

// Return a time string (e.g. MM:SS.D), given an input number (float) of seconds
GameStateHighScores.prototype.getTimeStringFromFloatValue = function(val) {
    var minutes = Math.floor(val / 60);
    var seconds = Math.floor(val % 60 * 10) / 10;   // This pesky % operation introduces floating pt error

    // string values of min/sec
    var sMin = minutes.toString();
    var sSec = seconds < 10 ? seconds.toString().padStart(2, "0") : seconds.toString();    // Use padStart() to 0-pad seconds
    return sMin + ":" + sSec
};
