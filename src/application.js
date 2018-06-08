function GameApplication(xSize=512, ySize=512) {
    //console.log("Made an application obj");
    this.xSize = xSize;
    this.ySize = ySize;

    this.canvas = null;
    this.context = null;
    this.imgMgr = null;

    this.timer = null;
    this.fixed_dt_s = 0.015;

    // A settings object that will be modified by, e.g., a settings menu/UI
    this.settings = { "hidden": {}, "visible": {} };    // hidden settings are, e.g. point values for accomplishing certain goals; visible settings are, e.g. game config options
}

GameApplication.prototype.initialize = function() {
    // We initialize canvas and context here, becausee this initialize() function gets called once the program starts, and the page element named "canvas" is created
    this.canvas = document.getElementById("canvas");
    this.context = this.canvas.getContext("2d");
    this.imgMgr = new ImageManager();

    this.context.fillStyle = 'black';
    this.context.fillRect(0,0, this.canvas.width, this.canvas.height);

    this.context.font = '30px serif';
    this.context.fillStyle = 'white';
    this.context.fillText('If you see only this, something is probably wrong ;-)', this.canvas.width / 8, this.canvas.height / 8);

    this.timer = new Timer();

    //TODO un-hardcode game mode -- make it selectable/configurable. Use menus yeeaaahhh boyyyy. 
    this.settings["visible"]["gameMode"] = { "matchType": "deathmatch",
                                             "shipKills": 15,
                                             "gunsEnabled": "yes"
                                           }

}
