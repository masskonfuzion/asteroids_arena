function GameStatePlaying() {
}

GameStatePlaying.prototype = Object.create(GameStateBase.prototype);
GameStatePlaying.prototype.constructor = GameStatePlaying;

// A function callback registered with as the window event listener
// Can be coded to handle input directly, or can be a wrapper around an internal game logic object's input handler
GameStatePlaying.prototype.handleKeyboardInput = function(evt) {
};
