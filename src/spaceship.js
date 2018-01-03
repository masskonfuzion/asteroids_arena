var SpaceshipAbleStateEnum = { "disabled": 0,
                               "enabled": 1,
                               "spawning": 2
                             };
function Spaceship() {
    // Inherit GameObject properties, includinga components dict
    GameObject.call(this);

    // TODO: Consider moving the addComponent calls to an initialize() function outside the ctor; i.e. try to guarantee a fully-formed object at ctor exit
    this.addComponent("physics", new PhysicsComponentVerlet());
    this.addComponent("render", new RenderComponentSprite());
    this.addComponent("thrustPE", new ParticleEmitter());           // Particle emitter for rocket/thruster exhaust particle system
    this.addComponent("gunPE", new ParticleEmitter());              // Particle emitter for bullet/guns particle system
    this.addComponent("collision", new CollisionComponentAABB());
    this.addComponent("ai", new FSM());

    var thrustPE = this.components["thrustPE"];  // get a reference to our own component, to shorten the code
    thrustPE.setVelocityRange(150.0, 300.0);
    thrustPE.setAngleRange(-20, 20);     // degrees
    thrustPE.setTTLRange(0.2, 0.4);    // seconds
    thrustPE.setMinColor(20, 4, 4);
    thrustPE.setMaxColor(252, 140, 32);

    var gunPE = this.components["gunPE"];
    gunPE.setVelocityRange(300.0, 300.0);
    gunPE.setAngleRange(0, 0);     // degrees
    gunPE.setMinColor(200, 200, 200);   // TODO make sure these colors actually get set... Right now, particle color isn't getting set if the emitParticle call does not pass in a config object...
    gunPE.setMaxColor(200, 200, 200);
    gunPE.setRateLimit(0.1);
    // NOTE: we don't set TTLRange here because the particles were already created and initialized (in an object pool); the autoExpire/TTL stuff is done there


    this.fireAState = false;        // To be used in AI/logic or whatever, to tell the game that this spaceship is firing its guns
    this.ableState = SpaceshipAbleStateEnum.enabled

    // Populate the command map (this.commandMap is part of the GameObject base class, which this Spaceship derives from)
    this.commandMap["setThrustOn"] = this.enableThrust;
    this.commandMap["setThrustOff"] = this.disableThrust;
    this.commandMap["setTurnLeftOn"] = this.enableTurnLeft;
    this.commandMap["setTurnRightOn"] = this.enableTurnRight;
    this.commandMap["setTurnOff"] = this.disableTurn;
    this.commandMap["setFireAOn"] = this.enableFireA;
    this.commandMap["setFireAOff"] = this.disableFireA;

    this.aiControlled = false;
    this.aiBehavior = "";
    this.aiProfile = "miner";    // TODO at some point, stop hardcoding this
    this.aiMaxLinearVel = 24;    // TODO tune this -- currently set artificially low, for testing
    this.target = null;

}


Spaceship.prototype = Object.create(GameObject.prototype);
Spaceship.prototype.constructor = Spaceship;

Spaceship.prototype.initialize = function(configObj) {
    // configObj is a dict object 
    // TODO test for existence of configObj and its properties
    this.components["render"].setImgObj(configObj["imgObj"]);
    this.components["physics"].setPosition(configObj["initialPos"][0], configObj["initialPos"][1]);
    this.components["collision"].update(0);    // Do an update to force the collision component to compute its boundaries

    // NOTE: can't set particle emitter IDs in the constructor because the objectID for this object has not been set at that point
    this.components["gunPE"].setEmitterID(this.constructor.name + this.objectID.toString() + "." + "gunPE");

    if(configObj.hasOwnProperty("isAI") && true == configObj["isAI"]) {
        this.aiControlled = true;
        this.initializeAI(configObj["knowledge"]);
    }
};

// Override the default update()
Spaceship.prototype.update = function(dt_s, config = null) {

    // Iterate over all components and call their respective update() function
    for (var compName in this.components) {
        if (this.components.hasOwnProperty(compName)) {

            // NOTE: I'm debating whether or not I need the ParticleEmitter class. Or, I'm debating whether I can possibly keep it simple or I'll need to create a base class/subclass hierarchy
            // Determine the configuration object to send into update()
            var updateConfigObj = null;

            // Do some preliminary setup work before calling update() on the following components
            switch(compName) {
                case "thrustPE":
                    // Could wrap all this in a function
                    var myRenderComp = this.components["render"];
                    var myPhysicsComp = this.components["physics"];
                    var myThrustPEComp = this.components["thrustPE"];

                    // Compute the particle emitters' launch dir and position
                    var launchDir = vec2.create()
                    vec2.copy(launchDir, myPhysicsComp.angleVec);    // NOTE: could have called setLaunchDir() here

                    vec2.scale(launchDir, launchDir, -1);
                    vec2.normalize(launchDir, launchDir);   // Normalize, just to be sure..

                    // position the particle emitter at the back of the ship (use the ship's sprite dimensions for guidance)
                    var pePos = vec2.create();
                    vec2.set(pePos, -16, 0);
                    var rotMat = mat2.create();
                    mat2.fromRotation(rotMat, glMatrix.toRadian(myPhysicsComp.angle) );
                    vec2.transformMat2(pePos, pePos, rotMat);
                    vec2.add(pePos, pePos, myPhysicsComp.currPos);

                    // emitPoints is a list of emitter position/direction pairs. Used for having multiple emit points/dirs.
                    //var emitterConfig = { "emitPoints": [ {"position": pePos, "direction": launchDir}, {"position": pePos, "direction": launchDir}, {"position": pePos, "direction": launchDir}, {"position": pePos, "direction": launchDir} ] };   // emit 4 particles per update
                    updateConfigObj = { "emitPoints": [ {"position": pePos, "direction": launchDir}, {"position": pePos, "direction": launchDir} ] };   // emit 2 particles per update
                    break;
                case "gunPE":
                    // Could wrap all this in a function
                    var myRenderComp = this.components["render"];
                    var myPhysicsComp = this.components["physics"];
                    var myGunPEComp = this.components["gunPE"];

                    // Compute the particle emitters' launch dir and position
                    var launchDir = vec2.create()
                    vec2.copy(launchDir, myPhysicsComp.angleVec);    // NOTE: could have called setLaunchDir() here
                    vec2.normalize(launchDir, launchDir);   // Normalize, just to be sure..

                    // position the particle emitter at the front of the ship (use the ship's sprite dimensions for guidance)
                    var pePos = vec2.create();
                    vec2.set(pePos, 16, 0);
                    var rotMat = mat2.create();
                    mat2.fromRotation(rotMat, glMatrix.toRadian(myPhysicsComp.angle) );
                    vec2.transformMat2(pePos, pePos, rotMat);
                    vec2.add(pePos, pePos, myPhysicsComp.currPos);

                    myGunPEComp.setPosition(pePos[0], pePos[1]);
                    // NOTE: we emit 1 particle per update, but as we add different types of weapons, that can change
                    updateConfigObj = { "emitPoints": [ {"position": pePos, "direction": launchDir} ] };
                    break;
            }

            this.components[compName].update(dt_s, updateConfigObj);
        }
    }
}

// Override the class default executeCommand()
Spaceship.prototype.executeCommand = function(cmdMsg, params) {
    //console.log("Spaceship executing command");
    //console.log(cmdMsg);

    // Call function
    this.commandMap[cmdMsg].call(this, params); // use call() because without it, we're losing our "this" reference (going from Spaceship to Object)
}

Spaceship.prototype.draw = function(canvasContext) {
    var myRenderComp = this.components["render"];
    var myPhysicsComp = this.components["physics"];     // Get the physics comp because it has the position of the game obj in world space

    canvasContext.save();    // similar to glPushMatrix

    canvasContext.translate(myPhysicsComp.currPos[0], myPhysicsComp.currPos[1]);
    canvasContext.rotate( glMatrix.toRadian(myPhysicsComp.angle) );                 // Rotate

    myRenderComp.draw(canvasContext);                                               // Draw -- rendercomponent will use my position, so this draw() effectively "translates" the sprite to where it belongs
    canvasContext.restore(); // similar to glPopMatrix

    // ----- DEBUGGING stuff
    var myCollisionComp = this.components["collision"];
    var topleft = vec2.clone(myCollisionComp.center);
    vec2.set(topleft, topleft[0] - myCollisionComp.getWidth() / 2, topleft[1] - myCollisionComp.getHeight() / 2);
    myCollisionComp.draw(canvasContext);
    // -----

};

Spaceship.prototype.enableThrust = function() {
    // Set acceleration vector
    var myPhysComp = this.components["physics"];
    vec2.set(myPhysComp.acceleration, Math.cos( glMatrix.toRadian(myPhysComp.angle) ), Math.sin( glMatrix.toRadian(myPhysComp.angle) ));
    vec2.scale(myPhysComp.acceleration, myPhysComp.acceleration, 210);

    var myThrustPE = this.components["thrustPE"];
    myThrustPE.setEnabled();                       // Enable the emitter

    //console.log("Spaceship thrust");
    //console.log(myPhysComp.acceleration);
};

Spaceship.prototype.disableThrust = function() {
    var myPhysComp = this.components["physics"];
    vec2.set(myPhysComp.acceleration, 0.0, 0.0);    // Set the acceleration vector for the physics component

    var myThrustPE = this.components["thrustPE"];
    myThrustPE.setDisabled();                       // Disable the emitter

    //console.log("Spaceship thrust");
    //console.log(myPhysComp.acceleration);
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

Spaceship.prototype.enableFireA = function() {
    this.fireAState = true;

    var myGunPE = this.components["gunPE"];
    myGunPE.setEnabled();                       // Enable the emitter
}

Spaceship.prototype.disableFireA = function() {
    this.fireAState = false;

    var myGunPE = this.components["gunPE"];
    myGunPE.setDisabled();                       // Disable the emitter
}


Spaceship.prototype.initializeAI = function(knowledgeObj) {
    // Initialize state machine
    var aiFsm = this.components["ai"];
    aiFsm.initialize(knowledgeObj); // the input to the AI is the entire game logic object)

    // NOTE: It's probably not the best idea to pass the entire game logic object into this ship's
    // AI FSM, but it's the quickest/easiest way, given the implementation details of this game.

    // TODO move ship state machine into its own file
    // TODO move state machine objects (states, conditions, transitions) into the state machine object. Or, otherwise, just don't store them in thee spaceship object (e.g. the ship doesn't need "this.aiState*"
    // Note/question: In JS, if I (1) create an object (say, newObj)while inside a function, then (2) assign that object to container object (so, e.g. containerObj["someLabel"] = newObj; -- does newObj still exist after the function exits?
    // In C/C++, the answer would depend on how I created newObj -- if i just statically declared newObj, it would be gone; I'd have to new/malloc the obj, to have a pointer to it in heap space.
    // But in JS (I tested this in Firefox developer console) - the objects stick around. JS must already be doing some kind of heap allocation (which I guess makes sense, for a garbage-collected language)
    var aiStateSelectTarget = new FSMState("SelectTarget");
    // TODO maybe give fsm states a reference to the fsm's knowledge. I can imagine the states having a use for knowledge in the enter() and exit() functions
    aiStateSelectTarget.enter = function() {
        // possibly some logic here, like setting hunter/miner profile
    };
    aiStateSelectTarget.exit = function() {
    };
    aiStateSelectTarget.update = function(knowledge, dt_s = null) {
        // NOTE: objRef will be passed in by the FSM. It will be the gameLogic object, so this state will have access to ships, bullets, and asteroids

        // knowledge is passed in by the state machine
        // Find the nearest target
        var parentObj = knowledge["parentObj"];
        if (parentObj.aiProfile == "miner") {
            // find nearest asteroid
            var astMgr = knowledge["gameLogic"].gameObjs["astMgr"];
            var minSqrDist = Number.MAX_SAFE_INTEGER;

            for (var asteroid of astMgr.components["asteroidPS"].particles) {
                // Blah, why did I make the asteroids a subclass of particles?
                if (asteroid.alive) {
                    var sqDist = vec2.sqrDist(parentObj.components["physics"].currPos, asteroid.components["physics"].currPos);
                    if (sqDist < minSqrDist) {
                        minSqrDist = sqDist;
                        parentObj.target = asteroid;
                    }
                }
            }
        }
    };
    var aiTransSelectToPursue = new FSMTransition("PursueTarget", new FSMConditionReturnTrue()); // No condition; always transition from SelectTarget to PursueTarget
    aiStateSelectTarget.addTransition(this.aiTransSelectToPursue);


    var aiStatePursueTarget = new FSMState("PursueTarget");
    aiStatePursueTarget.enter = function() { };
    aiStatePursueTarget.exit = function() { };
    aiStatePursueTarget.update = function(knowledge, dt_s = game.fixed_dt_s) {
        // Rembmer: game is a global object

        // Compute rays offset by some number of degrees to the left and to the right of the ship's current heading/orientation
        // - sightLine0 and sightLine1
        // Compute the sight line normals, sightNormal0 and sightNormal1
        // - so, e.g. if sightLine0 is "to the left", then its normal points "to the right", and if sightLine1 is "to the right",
        // then its normal points "to the left"
        // The target is "in sight" if:
        // - The vector/ray from the ship to the target intersects the line segment formed by connecting the two sightLine vectors
        //   some distance down the line
        // - can also probably just use dot products
        //   - use the sightLine vectors (normalized); get the vector from ship to target
        //   - compute the points at the end of each sightLine vector
        //   - compute vectors, one from those points to target; normalize
        //   - dot the sightLine-target endpoint vectors against the sightLine normals
        //   - actually, you probably only need to dot the vector from ship to target against the normals
        //   - the target is in sight if each of the respective sightLine-to-target vectors dotted with the sightNormal is > 0
        var parentObj = knowledge["parentObj"];

        // Get a reference to the ship's angle vector
        var shipDir = parentObj.components["physics"].angleVec;

        var sightLine0 = vec2.create();
        var sightLine1 = vec2.create();

        var sightHalfAngle = 20;    // in degrees

        var rotMat = mat2.create();

        // Compute the "left" sight line
        mat2.fromRotation(rotMat, glMatrix.toRadian(-sightHalfAngle));
        vec2.transformMat2(sightLine0, shipDir, rotMat);
        var norm0 = vec2.create();
        vec2.set(norm0, sightLine0[1], sightLine0[0]);   // Cheap & easy 90 deg rotation in the positive direction

        // Compute the "right" sight line
        mat2.fromRotation(rotMat, glMatrix.toRadian(sightHalfAngle));
        vec2.transformMat2(sightLine1, shipDir, rotMat);
        var norm1 = vec2.create();
        vec2.set(norm1, sightLine1[1], -sightLine1[0]);

        // Compute the ship-to-target vector
        var shipToTarget = vec2.create();
        vec2.sub(shipToTarget, parentObj.target.components["physics"].currPos, parentObj.components["physics"].currPos);

        // Compute dot products
        var dotNorm0 = vec2.dot(norm0, shipToTarget);
        var dotNorm1 = vec2.dot(norm1, shipToTarget);


        if (dotNorm0 < 0) {
            // Target is to the left
            parentObj.enableTurnLeft();
        } else if (dotNorm1 < 0) {
            // Target is to the right
            parentObj.enableTurnRight();
        }

        if (vec2.dot(shipDir, shipToTarget) > 0 && dotNorm0 > 0 && dotNorm1 > 0)
        {
            parentObj.disableTurn();

            var currVel = vec2.create();
            vec2.sub(currVel, parentObj.components["physics"].currPos, parentObj.components["physics"].prevPos);
            if (vec2.length(currVel) / game.fixed_dt_s < parentObj.aiMaxLinearVel) {
                parentObj.enableThrust();
            } else {
                parentObj.disableThrust();
            }
        }

    };
    // TODO maybe add a "bool true" and a "bool false" condition to the state machine code (but maybe not necessary)
    var aiCondPursueToSelect = new FSMConditionEQ(aiFsm.knowledge["parentObj"].target.alive, false);   // TODO! Find a way to identify if a spaceship is alive. Using .alive works for particles (asteroids); maybe just add an alive member to the spaceship
    var aiTransPursueToSelect = new FSMTransition("SelectTarget", this.aiCondPursueToSelect);
    // TODO rework conditions to use direct reference to knowledge object (no need to create another layer of object/key)
    aiStatePursueTarget.addTransition(this.aiTransPursueToSelect);


    this.aiStateAttackTarget = new FSMState("AttackTarget");

    aiFsm.addState(this.aiStateSelectTarget);  // Add fsm state object to machine
    aiFsm.addState(this.aiStatePursueTarget);  // Add fsm state object to machine
    aiFsm.setInitState("SelectTarget");        // Set initial state by name
    aiFsm.start();

    // TODO add avoid states (because we're not doing any hierchical state machine stuff, we're going to have 2 avoid states -- one that transitions back "pursue", and one that transitions back to "attack"

};


Spaceship.prototype.resetAI = function() {
    this.components["ai"].start();
};
