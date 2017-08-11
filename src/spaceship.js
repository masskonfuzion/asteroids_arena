function Spaceship() {
    // Inherit GameObject properties, includinga components dict
    GameObject.call(this);

    this.addComponent("physics", new PhysicsComponentVerlet());
    this.addComponent("render", new RenderComponentSprite());

    // Populate the command map (this.commandMap is part of the GameObject base class, which this Spaceship derives from)
    this.commandMap["setThrustOn"] = this.enableThrust;
    this.commandMap["setThrustOff"] = this.disableThrust;   // TODO evaluate: do we NEED the thrust functions to be defined on the prototype? Probably yes if anything will derive from Spaceship; but otherwise no
    this.commandMap["setTurnLeftOn"] = this.enableTurnLeft;
    this.commandMap["setTurnRightOn"] = this.enableTurnRight;
    this.commandMap["setTurnOff"] = this.disableTurn;
}


Spaceship.prototype = Object.create(GameObject.prototype);
Spaceship.prototype.constructor = Spaceship;

// Override the default update()
Spaceship.prototype.update = function(dt_s) {
    var myPhysComp = this.components["physics"];

    // call the physics component's update
    myPhysComp.update(dt_s);
    // TODO update the physics component's angularVec and keep sync with the "angle"
}

// Override the class default executeCommand()
Spaceship.prototype.executeCommand = function(cmdMsg) {
    console.log("Spaceship executing command");
    console.log(cmdMsg);

    // Call function
    this.commandMap[cmdMsg].call(this); // use call() because without it, we're losing our "this" reference (going from Spaceship to Object)
}

Spaceship.prototype.draw = function(canvasContext) {
    var myRenderComp = this.components["render"];
    var myPhysicsComp = this.components["physics"];     // Get the physics comp because it has the position of the game obj in world space

    canvasContext.save();    // similar to glPushMatrix

    canvasContext.translate(myPhysicsComp.currPos[0], myPhysicsComp.currPos[1]);
    canvasContext.rotate(myPhysicsComp.angle);
    myRenderComp.draw(canvasContext, -myRenderComp.imgObj.width/2, -myRenderComp.imgObj.height/2);

    canvasContext.restore(); // similar to glPopMatrix
};

Spaceship.prototype.enableThrust = function() {
    // Set acceleration vector
    var myPhysComp = this.components["physics"];
    // TODO put spaceship parameters (thrust acceleration, etc) into an object
    vec2.set(myPhysComp.acceleration, Math.cos(myPhysComp.angle), Math.sin(myPhysComp.angle));
    vec2.scale(myPhysComp.acceleration, myPhysComp.acceleration, 210);

    console.log("Spaceship thrust");
    console.log(myPhysComp.acceleration);
};

Spaceship.prototype.disableThrust = function() {
    var myPhysComp = this.components["physics"];
    vec2.set(myPhysComp.acceleration, 0.0, 0.0);

    console.log("Spaceship thrust");
    console.log(myPhysComp.acceleration);
};

Spaceship.prototype.enableTurnLeft = function() {
    var myPhysComp = this.components["physics"];

    myPhysComp.angularVel = -180;
}

Spaceship.prototype.enableTurnRight = function() {
    var myPhysComp = this.components["physics"];

    myPhysComp.angularVel = 180;
}

Spaceship.prototype.disableTurn = function() {
    var myPhysComp = this.components["physics"];

    myPhysComp.angularVel = 0;
}

