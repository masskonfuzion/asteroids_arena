function GameStateMainMenu() {
    this.uiTextButtons = [];

    //this.uiTextButtons.push( {"text": "Play Game", "posNDC": [0.5, 0.5], "align": "center"} );    // TODO delete
    // NOTE: game is a global object
    this.uiTextButtons.push( new uiItemText("Play Game", "36px", "MenuFont", "white", 0.5, 0.5, "center") );
}

GameStateMainMenu.prototype = Object.create(GameStateBase.prototype);
GameStateMainMenu.prototype.constructor = GameStateMainMenu;


GameStateMainMenu.prototype.initialize = function(transferObj = null) {
};

GameStateMainMenu.prototype.cleanup = function() {
};

GameStateMainMenu.prototype.preRender = function(canvasContext, dt_s) {
};

GameStateMainMenu.prototype.render = function(canvasContext, dt_s) {
    canvasContext.save();
    canvasContext.setTransform(1,0,0,1,0,0);    // Reset transformation (similar to OpenGL loadIdentity() for matrices)

    // Clear the canvas (note that the game application object is global)
    canvasContext.fillStyle = 'black';
    canvasContext.fillRect(0,0, canvasContext.canvas.width, canvasContext.canvas.height);

    for (var item of this.uiTextButtons) {
        item.draw(canvasContext);
    }

    canvasContext.restore();
};

GameStateMainMenu.prototype.postRender = function(canvasContext, dt_s) {
};

GameStateMainMenu.prototype.handleKeyboardInput = function(evt) {
};
