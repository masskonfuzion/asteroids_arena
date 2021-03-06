function GameStateManager() {
    this.stateMap = {};     // Mapping of state names (maybe nicknames?) to GameState objects
    this.states = [];       // A stack, implemented with an Array object
}

GameStateManager.prototype.addState = function(stateName, stateObj) {
    // NOTE: in JS, basically every object is created on the heap, so we're assigning a reference to the object, and we don't need to worry about copying/deepcopying objects
    this.stateMap[stateName] = stateObj;
};

// TODO add touch event handlers to the [change/pause/resume]State functions (maybe encapsulate the add/remove calls into functions)
// TODO make sure that when we change state, we do it as the very last thing that happens in the game loop (i.e. after all updates/renders, before next update
// Change from current state to toState
GameStateManager.prototype.changeState = function(toState, transferObj = null) {
    // TODO encapsulate the mgmt further into helper functions. e.g., changeState and resumeState have the same "current state deactivation" code
    var fromState = this.popState();
    if (fromState) {
        fromState.cleanup();
    }

    this.pushState(toState);
    this.currState().initialize(transferObj);
};

// Push a new state onto the stack, without popping the current one
// Scenarios where it's desirable to have multiple states in the stack:
// - pause menu overlay over paused game
// - in-game inventory menu
GameStateManager.prototype.pauseState = function(toState, transferObj = null) {

    // Now, push the passed-in state, initialize it, activate its handlers
    this.pushState(toState);
    this.currState().initialize(transferObj);
};

GameStateManager.prototype.resumeState = function() {
    // Destroy the existing state
    var fromState = this.popState();
    if (fromState) {
        fromState.cleanup();
    }
};


GameStateManager.prototype.currState = function() {
    return this.states[this.states.length - 1];

};


// push a state to the front of the stack
GameStateManager.prototype.pushState = function(state) {
    this.states.push(state);
};


// pop the state from the top of the stack
GameStateManager.prototype.popState = function(state) {
    return this.states.pop();
};
