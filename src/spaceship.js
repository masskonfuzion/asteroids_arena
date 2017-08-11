function Spaceship() {
    // Inherit GameObject properties, includinga components dict
    GameObject.call(this);

    this.addComponent("physics", new PhysicsComponentVerlet());
    this.addComponent("render", new RenderComponentSprite());

    // Populate the command map (this.commandMap is part of the GameObject base class, which this Spaceship derives from)
    this.commandMap["setThrustOn"] = this.enableThrust;
    this.commandMap["setThrustOff"] = this.disableThrust;   // TODO evaluate: do we NEED the thrust functions to be defined on the prototype? Probably yes if anything will derive from Spaceship; but otherwise no
}


Spaceship.prototype = Object.create(GameObject.prototype);
Spaceship.prototype.constructor = Spaceship;

// Override the default update()
Spaceship.prototype.update = function(dt_s) {
}

// Override the class default executeCommand()
Spaceship.prototype.executeCommand = function(cmdMsg) {
    console.log("Spaceship executing command");
    console.log(cmdMsg);

    // Call function
    this.commandMap[cmdMsg].call(this); // use call() because without it, we're losing our "this" reference (going from Spaceship to Object)
}

Spaceship.prototype.enableThrust = function() {
    // Set acceleration vector
    var myPhysComp = this.components["physics"];
    vec2.set(myPhysComp.acceleration, 1.0, 0.0);    // TODO revist -- set based on direction from center of ship on screen to mouse pointer

    console.log("Spaceship thrust");
    console.log(myPhysComp.acceleration);
};

Spaceship.prototype.disableThrust = function() {
    var myPhysComp = this.components["physics"];
    vec2.set(myPhysComp.acceleration, 0.0, 0.0);    // TODO revist -- set based on direction from center of ship on screen to mouse pointer

    console.log("Spaceship thrust");
    console.log(myPhysComp.acceleration);
};

