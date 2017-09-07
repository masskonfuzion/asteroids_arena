function Spaceship() {
    // Inherit GameObject properties, includinga components dict
    GameObject.call(this);

    this.addComponent("physics", new PhysicsComponentVerlet());
    this.addComponent("render", new RenderComponentSprite());
    this.addComponent("thrustPE", new ParticleEmitter());   // Particle emitter for rockets
    this.addComponent("collision", new CollisionComponentAABB());

    var particleEmitter = this.components["thrustPE"];  // get a reference to our own component, to shorten the code
    particleEmitter.setVelocityRange(150.0, 300.0);
    particleEmitter.setAngleRange(-20, 20);     // degrees
    particleEmitter.setTTLRange(0.2, 0.4);    // seconds
    particleEmitter.setMinColor(20, 4, 4);
    particleEmitter.setMaxColor(252, 140, 32);

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
Spaceship.prototype.update = function(dt_s, config = null) {


    // TODO for thrust PE, possibly include some kind of time-based particle emission rate limiting here
    // TODO for thrust PE, make sure to emit particles only when actually thrusting
    // Iterate over all components and call their respective update() function
    for (var compName in this.components) {
        if (this.components.hasOwnProperty(compName)) {

            // NOTE: I'm debating whether or not I need the ParticleEmitter class. Or, I'm debating whether I can possibly keep it simple or I'll need to create a base class/subclass hierarchy
            // Determine the configuration object to send into update()
            var updateConfigObj = null;
            switch(compName) {
                case "thrustPE":
                    // Could wrap all this in a function
                    var myRenderComp = this.components["render"];
                    var myPhysicsComp = this.components["physics"];
                    var myThrustPEComp = this.components["thrustPE"];

                    // Compute the particle emitters' launch dir and position
                    var launchDir = vec2.create()
                    vec2.copy(launchDir, myPhysicsComp.angleVec);    // NOTE: could have called setLaunchDir() here

                    //var instantaneousVel = vec2.create(); // TODO probably delete these lines
                    //vec2.sub(instantaneousVel, myPhysicsComp.currPos, myPhysicsComp.prevPos);
                    //vec2.add(launchDir, launchDir, instantaneousVel);
                    vec2.scale(launchDir, launchDir, -1);
                    vec2.normalize(launchDir, launchDir);   // Normalize, just to be sure..

                    // position the particle emitter at the back of the ship (use the ship's sprite dimensions for guidance)
                    var pePos = vec2.create();
                    vec2.set(pePos, -16, 0);    // TODO un-hardcode this; use spaceship render component's img object width/height
                    var rotMat = mat2.create();
                    mat2.fromRotation(rotMat, glMatrix.toRadian(myPhysicsComp.angle) );
                    vec2.transformMat2(pePos, pePos, rotMat);
                    vec2.add(pePos, pePos, myPhysicsComp.currPos); // TODO figure out why the imgObj size dimensions are 0... Once you do that, then edit this line to properly place the emitter position at the back of the ship, using the image dimensions

                    // emitPoints is a list of emitter position/direction pairs. Used for having multiple emit points/dirs.
                    //var emitterConfig = { "emitPoints": [ {"position": pePos, "direction": launchDir}, {"position": pePos, "direction": launchDir}, {"position": pePos, "direction": launchDir}, {"position": pePos, "direction": launchDir} ] };   // emit 4 particles per update
                    var emitterConfig = { "emitPoints": [ {"position": pePos, "direction": launchDir}, {"position": pePos, "direction": launchDir} ] };   // emit 2 particles per update
                    updateConfigObj = emitterConfig;
            }

            this.components[compName].update(dt_s, updateConfigObj);
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

