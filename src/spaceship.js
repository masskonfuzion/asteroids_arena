function Spaceship() {
    // Inherit GameObject properties, includinga components dict
    GameObject.call(this);

    this.addComponent("physics", new PhysicsComponentVerlet());
    this.addComponent("render", new RenderComponentSprite());
    this.addComponent("thrustPE", new ParticleEmitter());   // Particle emitter for rockets

    var particleEmitter = this.components["thrustPE"];  // get a reference to our own component, to shorten the code
    particleEmitter.setVelocityRange(150.0, 300.0);
    particleEmitter.setAngleRange(-20, 20);     // degrees
    particleEmitter.setTTLRange(0.2, 0.4);    // seconds

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

    // Do some setup before calling update functions.  TODO -- perhaps the spaceship should pass some object into the particle emitter update, so that the updating of particle emitter essentials is only calculated when the particle system needs it (not every frame)
    var myRenderComp = this.components["render"];
    var myPhysicsComp = this.components["physics"];
    var myThrustPEComp = this.components["thrustPE"];

    // Refresh the particle emitters' launch dir and position
    vec2.copy(myThrustPEComp.launchDir, myPhysicsComp.angleVec);    // NOTE: could have called setLaunchDir() here
    vec2.scale(myThrustPEComp.launchDir, myThrustPEComp.launchDir, -1);
    vec2.normalize(myThrustPEComp.launchDir, myThrustPEComp.launchDir);   // Normalize, just to be sure..

    // position the particle emitter at the back of the ship (use the ship's sprite dimensions for guidance)
    var pePos = vec2.create();
    vec2.set(pePos, myPhysicsComp.currPos[0], myPhysicsComp.currPos[1]); // TODO figure out why the imgObj size dimensions are 0... Once you do that, then edit this line to properly place the emitter position at the back of the ship, using the image dimensions

    // TODO -- reinstate emiiter positioning when you figure out how to get the image dimensions from an object
    //var rotMat = mat2.create();
    //mat2.fromRotation(rotMat, glMatrix.toRadian(myPhysicsComp.angle) );
    //vec2.transformMat2(pePos, pePos, rotMat);

    myThrustPEComp.setPosition(pePos[0], pePos[1]);

    // TODO for thrust PE, possibly include some kind of time-based particle emission rate limiting here
    // TODO for thrust PE, make sure to emit particles only when actually thrusting
    // Iterate over all components and call their respective update() function
    for (var compName in this.components) {
        if (this.components.hasOwnProperty(compName)) {
            this.components[compName].update(dt_s);
        }
    }

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
    canvasContext.rotate( glMatrix.toRadian(myPhysicsComp.angle) );
    myRenderComp.draw(canvasContext, -myRenderComp.imgObj.width/2, -myRenderComp.imgObj.height/2);

    canvasContext.restore(); // similar to glPopMatrix
};

Spaceship.prototype.enableThrust = function() {
    // Set acceleration vector
    var myPhysComp = this.components["physics"];
    // TODO put spaceship parameters (thrust acceleration, etc) into an object
    vec2.set(myPhysComp.acceleration, Math.cos( glMatrix.toRadian(myPhysComp.angle) ), Math.sin( glMatrix.toRadian(myPhysComp.angle) ));
    vec2.scale(myPhysComp.acceleration, myPhysComp.acceleration, 210);

    var myThrustPE = this.components["thrustPE"];
    myThrustPE.setEnabled();                       // Enable the emitter

    console.log("Spaceship thrust");
    console.log(myPhysComp.acceleration);
};

Spaceship.prototype.disableThrust = function() {
    var myPhysComp = this.components["physics"];
    vec2.set(myPhysComp.acceleration, 0.0, 0.0);    // Set the acceleration vector for the physics component

    var myThrustPE = this.components["thrustPE"];
    myThrustPE.setDisabled();                       // Disable the emitter

    console.log("Spaceship thrust");
    console.log(myPhysComp.acceleration);
};

Spaceship.prototype.enableTurnLeft = function() {
    var myPhysComp = this.components["physics"];

    myPhysComp.angularVel = -210;
}

Spaceship.prototype.enableTurnRight = function() {
    var myPhysComp = this.components["physics"];

    myPhysComp.angularVel = 210;
}

Spaceship.prototype.disableTurn = function() {
    var myPhysComp = this.components["physics"];

    myPhysComp.angularVel = 0;
}

