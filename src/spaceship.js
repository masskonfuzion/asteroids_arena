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
    this.ableState = SpaceshipAbleStateEnum.enabled;
    this.spawnGracePd_s = 2;    // spawn grace period, in seconds
    this.spawnClock = 0;        // time remaining during spawning abaleState, before switching to fully enabled

    // Populate the command map (this.commandMap is part of the GameObject base class, which this Spaceship derives from)
    this.commandMap["setThrustOn"] = this.enableThrust;
    this.commandMap["setThrustOff"] = this.disableThrust;
    this.commandMap["setTurnLeftOn"] = this.enableTurnLeft;
    this.commandMap["setTurnRightOn"] = this.enableTurnRight;
    this.commandMap["setTurnOff"] = this.disableTurn;
    this.commandMap["setFireAOn"] = this.enableFireA;
    this.commandMap["setFireAOff"] = this.disableFireA;

    this.aiControlled = false;
    this.aiConfig = {};
    this.aiNearestObj = [];
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

    this.ableState = SpaceshipAbleStateEnum.spawning;
    this.resetSpawnClock();

    if(configObj.hasOwnProperty("isAI") && true == configObj["isAI"]) {
        this.aiControlled = true;
        //this.addComponent("ai", new FSM());   // TODO delete
        // Initialize an AI obj with a reference to this ship, and a reference to the gameLogic obj
        this.addComponent("ai", new SpaceshipAI(this, configObj["knowledge"]));

        this.aiConfig["aiProfile"] = configObj.hasOwnProperty("aiProfile") ? configObj["aiProfile"] : "miner";  // default to miner behavior profile if we forget to specify
        this.aiConfig["aiHuntRadius"] = configObj.hasOwnProperty("aiHuntRadius") ? configObj["aiHuntRadius"] : null;
        this.aiConfig["aiMaxLinearVel"] = 50;
        this.aiConfig["aiVelCorrectThreshold"] = 10;
        this.aiConfig["aiSqrAttackDist"] = 140 ** 2;     // Squared distance within which a ship will attack a target
        this.aiConfig["aiFireHalfAngle"] = 3;           // degrees
        this.aiConfig["aiVelCorrectDir"] = vec2.create();
        this.aiConfig["aiAlignHeadingThreshold"] = 10;     // Align-heading-towards-target threshold; a half-angle, in degrees
        this.aiConfig["aiAlignVelocityPursueThreshold"] = 45;     // Align-velocity-to-desired-direction threshold; a half-angle, in degrees
        this.aiConfig["aiAlignVelocityDriftThreshold"] = 60;     // Align-velocity-to-desired-direction threshold; a half-angle, in degrees
        this.aiConfig["aiAlignVelocityCorrectThreshold"] = 5;     // Align-velocity-to-desired-direction threshold; a half-angle, in degrees
        this.aiConfig["target"] = null;
        this.aiConfig["vecToTargetPos"] = vec2.create();        // vec2 from ship position to target position
        this.aiConfig["currVel"] = vec2.create();
        this.aiConfig["aiReflex"] = { "delayRange": {"min": 150, "max": 250},
                                      "delayInterval": 0,
                                      "currTimestamp": 0,
                                      "prevTimestamp": 0,
                                      "reflexState": 0
                                    };
        // ^ delay range given in milliseconds because the DOMHighResTimeStamp object returned by performance.now() is in ms
        // isReacting is a behavior lock - if the ship is reacting (e.g. changing behavior states), then we don't process behaviors
        // reflexState can be:  0 = not started, 1 = active, 2 = finished/time has elapsed

        this.initializeAI(configObj["knowledge"]);
    }
};

// Override the default update()
Spaceship.prototype.update = function(dt_s, config = null) {
    //if (this.aiControlled) {
    //    // TODO compute nearest threat (use the quadtree to prune calculations)
    //    // The quadtree is owned by the gameLogic object, which is also the parent obj of all spaceships
    //    // NOTE: it would be safer to verify that the gameLogic object has a collisionMgr, but whatever, we know it does..
    //    var qt = this.parentObj.collisionMgr.quadTree;

    //    var nearObjs = [];
    //    // Clear the near objs list
    //    qt.retrieve(nearObjs, this.components["collision"]);

    //    var minDist = Number.MAX_SAFE_INTEGER;
    //    for (var nearObj of nearObjs) {
    //        var sqrDist = 0; // TODO standardize a way to get distance to an object -- maybe use closest point or some other math
    //        // TODO 2018-01-11 - pick up from here
    //        // TODO 2018-04-12 - Hmmm.... pick up what from here? What was I trying to do? Always keep a reference to the nearest threat, no matter what state the AI is in? Possibly
    //    }
    //}

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
                    var launchDir = vec2.create();
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
                    var launchDir = vec2.create();
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

    // If ship has spawned recently, count down until spawnClock reaches 0, then change ableState to enabled
    // i.e., in spawning state, the ship is "partially enabled", except collisions are not processed (see game_logic.js)
    if (this.ableState == SpaceshipAbleStateEnum.spawning) {
        this.spawnClock -= dt_s;

        if (this.spawnClock <= 0) {
            this.spawnClock = 0;
            this.ableState = SpaceshipAbleStateEnum.enabled;
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

    // Draw an indicator if the ship is protected, because it just respawned
    if (this.ableState == SpaceshipAbleStateEnum.spawning) {
        // draw a circle
        canvasContext.strokeStyle = "yellow";
        canvasContext.lineWidth = 1;
        canvasContext.beginPath();
        canvasContext.arc(this.components["physics"].currPos[0], this.components["physics"].currPos[1], 32, 0, Math.PI * 2);
        canvasContext.stroke(); // have to call stroke() to "commit" the arc to the canvas
        canvasContext.closePath();
    }


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
    // TODO don't hardcode the acceleration vector
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
};

Spaceship.prototype.enableTurnRight = function() {
    var myPhysComp = this.components["physics"];

    myPhysComp.angularVel = 210;
};

Spaceship.prototype.disableTurn = function() {
    var myPhysComp = this.components["physics"];

    myPhysComp.angularVel = 0;
};

Spaceship.prototype.enableFireA = function() {
    this.fireAState = true;

    var myGunPE = this.components["gunPE"];
    myGunPE.setEnabled();                       // Enable the emitter
};

Spaceship.prototype.disableFireA = function() {
    this.fireAState = false;

    var myGunPE = this.components["gunPE"];
    myGunPE.setDisabled();                       // Disable the emitter
};


Spaceship.prototype.initializeAI = function(knowledgeObj) {
    // Initialize state machine
    this.components["ai"].initialize(this, knowledgeObj);


    ////// Initialize state machine
    ////var aiFsm = this.components["ai"];
    ////aiFsm.initialize(knowledgeObj); // the input to the AI is the entire game logic object)

    ////// NOTE: It's probably not the best idea to pass the entire game logic object into this ship's
    ////// AI FSM, but it's the quickest/easiest way, given the implementation details of this game.

    ////var aiStateSelectTarget = this.createAIStateSelectTarget();
    ////var aiTransSelectToAttack = new FSMTransition("AttackTarget", new FSMConditionReturnTrue()); // No condition; always transition from SelectTarget to AttackTarget
    ////aiStateSelectTarget.addTransition(aiTransSelectToAttack);
    ////aiFsm.addState(aiStateSelectTarget);  // Add fsm state object to machine


    ////var aiStatePursueTarget = this.createAIStatePursueTarget();
    ////// NOTE: We're presuming that if a target becomes not-alive during pursuit, that means we didn't kill it; something else did
    ////var aiCondPursueToSelect = new FSMConditionEQ(aiFsm.knowledge, "ref", "parentObj.aiConfig.target.alive", "const", false);   // TODO! Find a way to identify if a spaceship is alive. Using .alive works for particles (asteroids); maybe just add an alive member to the spaceship
    ////var aiTransPursueToSelect = new FSMTransition("SelectTarget", aiCondPursueToSelect);
    ////aiStatePursueTarget.addTransition(aiTransPursueToSelect);
    ////
    ////var aiCondPursueToAttack = new FSMConditionLTE(aiFsm.knowledge, "calc", ["sqrDist", "parentObj.components.physics.currPos", "parentObj.aiConfig.target.components.physics.currPos"], "const", this.aiConfig["aiSqrAttackDist"]);
    ////var aiTransPursueToAttack = new FSMTransition("AttackTarget", aiCondPursueToAttack);
    ////aiStatePursueTarget.addTransition(aiTransPursueToAttack);

    ////var aiCondPursueToAvoidA;
    ////// TODO make an avoid state, and nearly finish it, but don't add conditions. Then, deep-copy it, so we have 2 separate states, but with the exact-same-everything (including update()). Then, after deep-copy, assign transitions/conditions, so that one transitions back to PursueTarget, and the other transitions back to AttackTarget. Use the nearest threat computed in the spacehip's update() procedure
    ////// ^^ Actually.. we might need to look into a proper alarming mechanism (like in Game AI Programming by Ian Millington). E.g., consider what happens if, e.g. with the design above, the target ship gets shot during the pursuer's asteroid/arena avoidance phase? with the design above, now, the state machine would get confused. I think both Avoid and TargetLost should be alarms or triggers to change behavior
    ////aiFsm.addState(aiStatePursueTarget);  // Add fsm state object to machine


    ////var aiStateAttackTarget = this.createAIStateAttackTarget();
    ////var aiCondAttackToSelect = new FSMConditionEQ(aiFsm.knowledge, "ref", "parentObj.aiConfig.target.alive", "const", false);   // TODO! Find a way to identify if a spaceship is alive. Using .alive works for particles (asteroids); maybe just add an alive member to the spaceship
    ////var aiTransAttackToSelect = new FSMTransition("SelectTarget", aiCondAttackToSelect);
    ////aiStateAttackTarget.addTransition(aiTransAttackToSelect);

    ////var aiCondAttackToPursue = new FSMConditionGT(aiFsm.knowledge, "calc", ["sqrDist", "parentObj.components.physics.currPos", "parentObj.aiConfig.target.components.physics.currPos"], "const", this.aiConfig["aiSqrAttackDist"]);
    ////var aiTransAttackToPursue = new FSMTransition("PursueTarget", aiCondAttackToPursue);
    ////aiStateAttackTarget.addTransition(aiTransAttackToPursue);
    ////
    ////var aiCondAttackToAvoidB;   // TODO make this condition essentially the same as (if not exactly the same as) aiCondAttackToAvoidA
    ////aiFsm.addState(aiStateAttackTarget);  // Add fsm state object to machine


    ////aiFsm.setInitState("SelectTarget");        // Set initial state by name
    ////aiFsm.start();


};


// TODO possibly move "start reaction delay" into an AI class
Spaceship.prototype.startReflexDelay = function() {
    this.aiConfig.aiReflex.delayInterval = Math.random() * (this.aiConfig.aiReflex.delayRange.max - this.aiConfig.aiReflex.delayRange.min) + this.aiConfig.aiReflex.delayRange.min;
    this.aiConfig.aiReflex.currTimestamp = performance.now();
    this.aiConfig.aiReflex.prevTimestamp = this.aiConfig.aiReflex.currTimestamp;
    this.aiConfig.aiReflex.reflexState = 1;     // actively pausing to simulate reflex delay
};

Spaceship.prototype.updateReflex = function() {
    this.aiConfig.aiReflex.currTimestamp = performance.now();
    if ((this.aiConfig.aiReflex.currTimestamp - this.aiConfig.aiReflex.prevTimestamp) > this.aiConfig.aiReflex.delayInterval) {
        this.aiConfig.aiReflex.reflexState = 2; // reflex delay time has elapsed
    }
};

Spaceship.prototype.finishReflexDelay = function() {
    this.aiConfig.aiReflex.reflexState = 0; // reflex state goes back to 0, which means "not started"
};

Spaceship.prototype.resetAI = function() {
    // potential optimization: instead of assigning a new array here, pop all elements, instead of "Default"
    this.components["ai"].reset();
};

Spaceship.prototype.resetSpawnClock = function() {
    this.spawnClock = this.spawnGracePd_s;
};


Spaceship.prototype.createAIStateSelectTarget = function() {
    var aiStateSelectTarget = new FSMState("SelectTarget");

    aiStateSelectTarget.enter = function(knowledge = null) {
        // possibly some logic here, like setting hunter/miner profile
        // NOTE: we're actually overriding a function provided in the FSMState class, which has the same signature. If we don't actually use enter() and exit(), we don't have to implement them.
        //console.log("Enter state SelectTarget");
    };
    aiStateSelectTarget.exit = function(knowledge = null) {
        //console.log("Exit state SelectTarget");
    };
    aiStateSelectTarget.update = function(knowledge, dt_s = null) {
        // NOTE: objRef will be passed in by the FSM. It will be the gameLogic object, so this state will have access to ships, bullets, and asteroids

        // knowledge is passed in by the state machine
        // Find the nearest target
        var parentObj = knowledge["parentObj"];
        if (parentObj.aiConfig["aiProfile"] == "miner") {
            // find nearest object - prefer asteroids, but attack a ship if it's closer than the nearest asteroid
            // TODO possibly wrap the target selection loops inside functions. We're duplicating code here
            var astMgr = knowledge["gameLogic"].gameObjs["astMgr"];

            var minSqrDistAst = Number.MAX_SAFE_INTEGER;
            var potentialAstTarget = null;
            for (var asteroid of astMgr.components["asteroidPS"].particles) {
                // Blah, why did I make the asteroids a subclass of particles?
                if (asteroid.alive) {
                    var sqDistAst = vec2.sqrDist(parentObj.components["physics"].currPos, asteroid.components["physics"].currPos);
                    if (sqDistAst < minSqrDistAst) {
                        minSqrDistAst = sqDistAst;
                        potentialAstTarget = asteroid;
                    }
                }
            }

            var minSqrDistShip = Number.MAX_SAFE_INTEGER;
            var potentialShipTarget = null;
            for (var shipDictIDKey in knowledge["gameLogic"].shipDict) {
                // Iterate over ships that aren't my ship ("I" am an AI, not a ship)
                if (parentObj.objectID != shipDictIDKey) {
                    var gameObjIDName = knowledge["gameLogic"].shipDict[shipDictIDKey];
                    var shipRef = knowledge["gameLogic"].gameObjs[gameObjIDName];

                    // TODO - add some kind of after-death delay so we don't target a ship that just respawned
                    sqDistShip = vec2.sqrDist(parentObj.components["physics"].currPos, shipRef.components["physics"].currPos);
                    if (sqDistShip < minSqrDistShip) {
                        minSqrDistShip = sqDistShip;
                        potentialShipTarget = shipRef;
                    }
                }
            }
            
            // Target the nearest asteroid, unless a ship is closer
            parentObj.aiConfig["target"] = sqDistAst <= sqDistShip ? potentialAstTarget : potentialShipTarget;

        } else if (parentObj.aiConfig["aiProfile"] == "hunter") {
            // find nearest ship and go after it. Only prefer an asteroid if there are no ships within the hunt radius
            var minSqrDistShip = Number.MAX_SAFE_INTEGER;

            var sqDistShip = 0;
            var potentialShipTarget = null;
            for (var shipDictIDKey in knowledge["gameLogic"].shipDict) {
                // Iterate over ships that aren't my ship ("I" am an AI, not a ship)
                if (parentObj.objectID != shipDictIDKey) {
                    var gameObjIDName = knowledge["gameLogic"].shipDict[shipDictIDKey];
                    var shipRef = knowledge["gameLogic"].gameObjs[gameObjIDName];

                    // TODO - add some kind of after-death delay so we don't target a ship that just respawned
                    sqDistShip = vec2.sqrDist(parentObj.components["physics"].currPos, shipRef.components["physics"].currPos);
                    if (sqDistShip < minSqrDistShip) {
                        minSqrDistShip = sqDistShip;
                        potentialShipTarget = shipRef;
                    }
                }
            }
            // Target the nearest ship
            parentObj.aiConfig["target"] =  potentialShipTarget;

            // If the nearest ship is outside the hunt radius, then go for asteroids
            if (minSqrDistShip >= parentObj.aiConfig["aiHuntRadius"] * parentObj.aiConfig["aiHuntRadius"]) {
                var astMgr = knowledge["gameLogic"].gameObjs["astMgr"];

                var minSqrDistAst = Number.MAX_SAFE_INTEGER;
                var sqDistAst = 0;
                var potentialAstTarget = null;
                for (var asteroid of astMgr.components["asteroidPS"].particles) {
                    // Blah, why did I make the asteroids a subclass of particles?
                    if (asteroid.alive) {
                        sqDistAst = vec2.sqrDist(parentObj.components["physics"].currPos, asteroid.components["physics"].currPos);
                        if (sqDistAst < minSqrDistAst) {
                            minSqrDistAst = sqDistAst;
                            potentialAstTarget = asteroid;
                        }
                    }
                }
                // If we're here, we want to target the nearest asteroid, even though we're a "hunter"
                parentObj.aiConfig["target"] =  potentialAstTarget;
            }
        }
    };  // end update() func

    return aiStateSelectTarget;
};




Spaceship.prototype.createAIStatePursueTarget = function() {

    var aiStatePursueTarget = new FSMState("PursueTarget");
    aiStatePursueTarget.enter = function(knowledge = null) {
        //console.log("Enter state PursueTarget");
    };
    aiStatePursueTarget.exit = function(knowledge = null) {
        var parentShip = knowledge["parentObj"];

        // When we exit the state, we blank out the ship's aiBehavior. This is by design;
        // currently, the AI is designed to have only 1 behavior. We want states to be
        // properly able to set the aiBehavior upon enter or first update. So we clear
        // out the var on exit
        parentShip.aiConfig["aiBehavior"] = ["Default"];
        //console.log("Exit state PursueTarget");
    };
    aiStatePursueTarget.update = function(knowledge, dt_s = game.fixed_dt_s) {
        // Remember: game is a global object
        var parentShip = knowledge["parentObj"];

        // Get a reference to the ship's heading vector
        var shipDir = vec2.clone( parentShip.components["physics"].angleVec ); // NOTE: angleVec is already unit length

        // Compute the ship-to-target vector
        var shipToTarget = vec2.create();
        vec2.sub(shipToTarget, parentShip.aiConfig["target"].components["physics"].currPos, parentShip.components["physics"].currPos);
        vec2.normalize(shipToTarget, shipToTarget);

        // Compute the signed angle between the ship's heading and the shipToTarget vector
        // (the sign indicates whether a + or - rotation about the angle is required to get from shipDir to shipToTarget)
        // NOTE: In HTML5/Canvas space, a + rotation is clockwise on the screen (i.e., to the right)
        var thHeadingTarget = MathUtils.angleBetween(shipDir, shipToTarget);     // radians

        // TODO spruce up AI decision making here, something like the following:
        // - ship should be able to shoot from "far away", even if drifting away from the target, as long as it has a good shot lined up

        var currVel = vec2.create();
        vec2.sub(currVel, parentShip.components["physics"].currPos, parentShip.components["physics"].prevPos);

        var normalizedVel = vec2.create();
        vec2.normalize(normalizedVel, currVel); // store normalized currVel into normalizedVel

        var thVelTarget = MathUtils.angleBetween(normalizedVel, shipToTarget);

        var behaviorIndex = parentShip.aiConfig["aiBehavior"].length - 1;
        //console.log("aiBehavior " + parentShip.aiConfig["aiBehavior"][behaviorIndex] + ";\tlist:", parentShip.aiConfig["aiBehavior"]);
        
        switch (parentShip.aiConfig["aiBehavior"][behaviorIndex]) {
            case "Default":
                // aiBehavior constitutes a state machine-within-the-machine, of sorts. It's hard-coded
                // aiBehavior transitions
                parentShip.aiConfig["aiBehavior"].push("AlignToTarget");
                parentShip.aiConfig["aiBehavior"].push("ReflexDelay");
                // NOTE that we push items onto the stack in the OPPOSITE order that we want to process them (Last-in, First-out)
                break;

            case "ReflexDelay":
                if (parentShip.aiConfig["aiReflex"]["reflexState"] == 0) {
                    parentShip.startReflexDelay();
                } else if (parentShip.aiConfig["aiReflex"]["reflexState"] == 1) {
                    parentShip.updateReflex();
                } else if (parentShip.aiConfig["aiReflex"]["reflexState"] == 2) {
                    parentShip.finishReflexDelay();

                    // After finishing the delay, pop() to get the next behavior to execute
                    parentShip.aiConfig["aiBehavior"].pop();
                }
                break;

            case "AlignToTarget":
                // Align Heading to some target
                // This case is for when the ship's velocity is less than the "speed limit". If the
                // ship is already moving fast, then the behavior will be to reduce velocity, which
                // will also involve adjusting heading
                // if currVel u-component is already within an allowable threshold of deviance from the target velocity vector, then thrust freely

                // Adjust turn/heading
                if (thHeadingTarget > glMatrix.toRadian(parentShip.aiConfig["aiAlignHeadingThreshold"])) {
                    // In the HTML5 Canvas coordinate system, a + rotation is to the right
                    // But it might be worth (at some point? if I feel like it?) renaming enableTurnRight/Left to enableTurnPos/Neg
                    parentShip.enableTurnRight();
                } else if (thHeadingTarget < glMatrix.toRadian(-parentShip.aiConfig["aiAlignHeadingThreshold"])) {
                    parentShip.enableTurnLeft();
                } else {
                    parentShip.disableTurn();
                    parentShip.aiConfig["aiBehavior"].pop();
                    parentShip.aiConfig["aiBehavior"].push("ThrustToPursueTarget");
                    parentShip.aiConfig["aiBehavior"].push("ReflexDelay");
                }
                break;

            case "ThrustToPursueTarget":

                // We want to accelerate towards the target. 
                // * if ||vel|| < speed limit, then thrust
                // * if ||vel|| > speed limit, then
                // ** if angleBetween(vel, shipToTarget) <= 20 (degrees), stop thrusting (but keep drifting? - perhaps "drift" can be a state?)
                // ** else work to reduce tangential component? (or, otherwise, do nothing, but continue 
                if (vec2.len(currVel) / game.fixed_dt_s <= parentShip.aiConfig["aiMaxLinearVel"]) {
                    //console.log("ThrustToPursueTarget, vel magnitude: " + vec2.len(currVel) / game.fixed_dt_s, "Vec: ", currVel, "align to:", parentShip.aiConfig["aiVelCorrectDir"]);
                    parentShip.enableThrust();
                } else {
                    // If ship heading is within an acceptable offset from shipToTarget, then disableThrust and just drift
                    // Otherwise, work to reduce the velocity component that is doing more to take the ship away from its desired heading, and then get back to AlignToTarget (which will re-align the ship for thrusting)
                    parentShip.disableThrust();

                    if ( Math.abs(thVelTarget) <= glMatrix.toRadian(parentShip.aiConfig["aiAlignVelocityPursueThreshold"]) ) {
                        parentShip.aiConfig["aiBehavior"].pop();
                        parentShip.aiConfig["aiBehavior"].push("Drift");
                        parentShip.aiConfig["aiBehavior"].push("ReflexDelay");
                    } else {
                        parentShip.aiConfig["aiBehavior"].pop();
                        parentShip.aiConfig["aiBehavior"].push("AlignToCorrectVel");
                        parentShip.aiConfig["aiBehavior"].push("ReflexDelay");
                        // Set the direction to align with, to correct velocity
                        vec2.set(parentShip.aiConfig["aiVelCorrectDir"], -normalizedVel[0], -normalizedVel[1]);
                    }
                }
                break;

            case "Drift":
                    // This state is meant to allow the spaceship to "do nothing" if it is already well-aligned with its target
                    if ( Math.abs(thVelTarget) > glMatrix.toRadian(parentShip.aiConfig["aiAlignVelocityDriftThreshold"]) ) {
                        // TODO possibly encapsulate into function. This code is identical to the code in ThrustToPursueTarget
                        parentShip.aiConfig["aiBehavior"].pop();
                        parentShip.aiConfig["aiBehavior"].push("AlignToCorrectVel");
                        parentShip.aiConfig["aiBehavior"].push("ReflexDelay");
                        vec2.set(parentShip.aiConfig["aiVelCorrectDir"], -normalizedVel[0], -normalizedVel[1]);
                    }
                break;
                
            case "AlignToCorrectVel":
                // Line up the ship's heading to reduce velocity in the direction it's going

                var th_Heading_DesiredVel = MathUtils.angleBetween(shipDir, parentShip.aiConfig["aiVelCorrectDir"]);
                if (th_Heading_DesiredVel > glMatrix.toRadian(parentShip.aiConfig["aiAlignVelocityCorrectThreshold"])) {
                    // Determine which direction to turn, to aim
                    // Could ternary here ( condition ? val_if_true : val_if_false ), but for readability, we'll use long form
                    // In the HTML5 Canvas coordinate system, a + rotation is to the right
                    // But it might be worth (at some point? if I feel like it?) renaming enableTurnRight/Left to enableTurnPos/Neg
                    parentShip.enableTurnRight();
                } else if (th_Heading_DesiredVel < glMatrix.toRadian(-parentShip.aiConfig["aiAlignVelocityCorrectThreshold"])) {     // TODO don't hardcode
                    parentShip.enableTurnLeft();
                } else {
                    parentShip.disableTurn();
                    parentShip.aiConfig["aiBehavior"].pop();
                    parentShip.aiConfig["aiBehavior"].push("ThrustToAdjustVelocity");
                    parentShip.aiConfig["aiBehavior"].push("ReflexDelay");
                }
                break;

            case "ThrustToAdjustVelocity":
                if ( vec2.len(currVel) / game.fixed_dt_s > parentShip.aiConfig["aiVelCorrectThreshold"] ) {
                    var th_Heading_DesiredVel = MathUtils.angleBetween(shipDir, parentShip.aiConfig["aiVelCorrectDir"]);

                    if (Math.abs(th_Heading_DesiredVel) <= parentShip.aiConfig["aiAlignVelocityCorrectThreshold"]) {
                        //console.log("ThrustToAdjustVelocity, vel magnitude: " + vec2.len(currVel) / game.fixed_dt_s, "Vec: ", currVel, "align to:", parentShip.aiConfig["aiVelCorrectDir"]);
                        parentShip.enableThrust();
                    } else {
                        parentShip.disableThrust();
                        parentShip.aiConfig["aiBehavior"].pop();
                        parentShip.aiConfig["aiBehavior"].push("AlignToCorrectVel");
                        parentShip.aiConfig["aiBehavior"].push("ReflexDelay");
                        vec2.set(parentShip.aiConfig["aiVelCorrectDir"], -normalizedVel[0], -normalizedVel[1]);
                    }
                } else {
                    parentShip.disableThrust();
                    parentShip.aiConfig["aiBehavior"].pop();
                    parentShip.aiConfig["aiBehavior"].push("AlignToTarget");
                    parentShip.aiConfig["aiBehavior"].push("ReflexDelay");
                }
                break;
        }

        // NOTES on behaviors (and maybe some TODOs)
        // - There should be a ReduceComponent pursuit behavior (in the Pursue and also Attack states) that reduces velocity in a given direction.
        //   - The idea is to find a target velocity direction, and then act to reduce velocity in any direction other than that target dir
        //   - (but this probably just means reducing velocity in the direction perpendicular to the target velocity)
        // - There should also be a SlowDown behavior to reduce velocity in the current direction
        //   - performed by turning 180 deg relative to current/desired velocity, and thrusting, to reduce velocity in that direction
    };

    return aiStatePursueTarget;
};


Spaceship.prototype.createAIStateAttackTarget = function() {
    var aiStateAttackTarget = new FSMState("AttackTarget");
    aiStateAttackTarget.enter = function(knowledge = null) {
        //console.log("Enter state AttackTarget");
    };
    aiStateAttackTarget.exit = function(knowledge = null) {
        var parentShip = knowledge["parentObj"];
        parentShip.disableFireA();
        //console.log("Exit state AttackTarget");
    };
    aiStateAttackTarget.update = function(knowledge, dt_s = game.fixed_dt_s) {
        var parentShip = knowledge["parentObj"];

        var shipDir = vec2.clone( parentShip.components["physics"].angleVec );  // angleVec is already normalized

        var shipToTarget = vec2.create();
        vec2.sub(shipToTarget, parentShip.aiConfig["target"].components["physics"].currPos, parentShip.components["physics"].currPos);
        vec2.normalize(shipToTarget, shipToTarget);

        // the dot product represents |u|*|v|*cos(thHeadingTarget) - because |u| == |v| == 1, the dot product represents cos(thHeadingTarget) between the two vectors
        var thHeadingTarget = Math.acos( vec2.dot(shipDir, shipToTarget) );  // radians

        // if thHeadingTarget > the ai aim/fire threshold angle, we need to narrow the angle by turning in the direction that shipToTarget is offset from shipDir
        if (thHeadingTarget > glMatrix.toRadian(parentShip.aiConfig["aiFireHalfAngle"])) {
            // We need to figure out which direction the angle sweeps, with respect to the ship's heading. So we'll compute a normal vector in the + rotation direction. So, e.g., (1,0) rotates to (0, 1); (0,1) rotates to (-1, 0), etc.
            // NOTE: In HTML5/Canvas space, a + rotation is clockwise on the screen (i.e., to the right)
            var normal = vec2.create();
            vec2.set(normal, -shipDir[1], shipDir[0]);    

            // Determine which direction to turn, to aim
            // Could ternary here ( condition ? val_if_true : val_if_false ), but for readability, we'll use long form
            if (vec2.dot(normal, shipToTarget) > 0) {
                parentShip.enableTurnRight();
            } else {
                parentShip.enableTurnLeft();
            }
            
        } else {
            // Fire away!!
            parentShip.disableTurn();
            parentShip.enableFireA();
        }
    }

    return aiStateAttackTarget;
};





// ============================================================================
// "New-style" AI functions
// The following functions implement an AI state machine, but remove the overhead of a
// node/graph-based machine. There will be "actions", which are functions that represent
// states; and conditions. The current state/action will be maintained in a var (a queue..
// maybe even a priority-based queue, so we can interrupt the current state/action with a 
// more important one (ooh yeahh, I like that).
// The queue will contain a reference to the action function to execute. Yeah. I like this
// ============================================================================

// TODO eventually break the SpaceshipAI object to its own file?
function SpaceshipAI() {
    GameObject.call(this);

    this.parentObj = null;  // The spaceship that has this AI obj
    this.knowledge = null;  // The rest of the "knowledge" (i.e. the gameLogic object)
    this.defaultState = null;

    // a JS array object, to be used as a queue of actions (FIFO)
    // In JS, enqueue with push() (i.e. add to tail); remove with shift() (i.e. pop from head)
    // each "action" will actually be a reference to a function to execute

    // This queue is a basic JS "queue". (it's an array object)
    // For a fancier, more heavily-engineered queue idea, see the MessageQueue
    this.actionQueue = [];

    // And now, the actions/behaviors.
    // Each aiState is a simple JS object, with a priority level and a function to call
    // Priority 0 is the highest/most important priority level.
    // The functions are members of this SpaceshipAI class -- each aiState obj will
    // store a reference to the function

    this.aiStateSelectTarget = { "priority": 2, "function": this.aiBehaviorSelectTarget };
    this.aiStateAlignToTarget = { "priority": 2, "function": this.aiBehaviorAlignToTarget };
    this.aiStateThrustToTarget = { "priority": 2, "function": this.aiBehaviorThrustToTarget };
    this.aiStateAttackTarget = { "priority": 2, "function": this.aiBehaviorAttackTarget };

    this.aiStateAlignToEvadeThreat = { "priority": 1, "function": this.aiBehaviorAlignToEvadeThreat }; // TODO: write this function.. Same as AlignToTarget, but will use a different vector
    this.aiStateThrustToEvadeThreat = { "priority": 1, "function": this.aiBehaviorThrustToEvadeThreat };  // TODO write this function.. essentially the same as ThrustToTarget, but with different transitions

    // TODO write these functions, too
    this.aiStateAlignToReduceVelocity = { "priority": 0, "function": this.aiBehaviorAlignToReduceVelocity };
    this.aiStateThrustToReduceVelocity = { "priority": 0, "function": this.aiBehaviorThrustToReduceVelocity };

}

SpaceshipAI.prototype = Object.create(GameObject.prototype);
SpaceshipAI.prototype.constructor = SpaceshipAI;

SpaceshipAI.prototype.initialize = function(parentObj, knowledge) {
    // Set default state (a reference to the function itself, which is defined on the prototype)
    this.defaultState = this.aiStateSelectTarget;
    this.parentObj = parentObj;
    this.knowledge = knowledge;
};

SpaceshipAI.prototype.reset = function() {
    this.parentObj.aiConfig["target"] = null;
    this.actionQueue = [];
};

SpaceshipAI.prototype.update = function(dt_s, config = null) {
    // Call action function on the spaceship that is this AI's parent object

    // Update any info needed for computations that will be done as part af AI
    // e.g., update the ship's knowledge of its vector to target, etc.
    this.processKnowledge();

    if (this.actionQueue.length == 0) {
        this.actionQueue.enqueue(this.defaultState);
    }

    if (this.actionQueue[0]) {
        this.actionQueue[0]["function"].call(this);
    }
};


// deqeueue current state/action/behavior and enqueue the given one
// (the given state is a reference to the function to execute)
SpaceshipAI.prototype.dequeueCurrentEnqueueNew = function(behavior) {
    // Note - we can build on this design if we want
    // Have transitions enqueue a fromState_Exit() and toState_Enter() action.. all that
    // We can even update the queue to be a priority queue, and have some actions preempt others, or whatever.
    this.dequeue();
    this.enqueue(behavior)
    // NOTE: a behavior is an object with a "priority" property and a "function" reference
    // The function actually executes the behavior
};

SpaceshipAI.prototype.dequeue = function() {
    // dequeue the current state, but do not enqueue anything
    // Useful for, e.g., simulating delay, due to reflexes. A preceding state can enqueue 2
    // actions: pause, and then do some behavior
    // The pause state can be dequeued, leaving whatever the 2nd action was as the active
    // state.
    this.actionQueue.shift();           // dequeue the current state/action/behavior
};

SpaceshipAI.prototype.enqueue = function(behavior) {
    // Enqueue, with priority
    // i.e., insert the incoming behavior as the last item of whatever priority level it's at

    if (this.actionQueue.length == 0) {
        // if the actionQueue is empty, simply push() the behavior onto the end
        this.actionQueue.push(behavior);
    } else if (behavior.priority < this.actionQueue[0].priority) {
        // Peek at the first item in the queue. If its priority level is higher than the incoming
        // behavior's, then we can simply insert the incoming behavior at the head of the queue
        this.actionQueue.unshift(behavior); // unshift() inserts one or more items at the front of an array
    } else {
        // otherwise, we have to find a place to put the incoming behavior
        // (linear search.. can we do better?)
        var i = 1;
        for (var i = 1; i < this.actionQueue.length; i++) {
            if (this.actionQueue[i].priority > behavior.priority) {
                // If we're here, then we've reached an item in the queue with a higher priority
                // number (which actually means a less-important priority level)
                // In that case, mark where we are, and insert the incoming behavior _before_
                // that item
                break;
            }
        }
        // splice() will insert an item before the item at index #i
        // (the 0 in the 2nd parameter means "delete 0 items")
        // if the for loop (linear search) above didn't find a hit, then i will be the end of
        // the array. in that case, the splice() will be equivalent to push()
        this.actionQueue.splice(i, 0, behavior);
    }
};


// This state is essentially the AI's "thinking" step
// i.e., it has "knowledge" (maybe the "knowledge" var should be called "awareness". The ship
// is "aware" of things around it. The processKnowledge function is responsible for "thinking" --
// processing objects it's aware of, and updating vars that represent the AI's understanding
// of the situation
SpaceshipAI.prototype.processKnowledge = function() {
    var parentShip = this.parentObj;

    // update current velocity (approximate... because of Verlet stuff)
    vec2.sub(parentShip.aiConfig["currVel"], parentShip.components["physics"].currPos, parentShip.components["physics"].prevPos);

    if (parentShip.aiConfig["target"]) {
        var target = parentShip.aiConfig["target"];

        // Update vector from ship's current position to target's current position
        vec2.sub(parentShip.aiConfig["vecToTargetPos"], target.components["physics"].currPos, parentShip.components["physics"].currPos);
        vec2.normalize(parentShip.aiConfig["vecToTargetPos"], parentShip.aiConfig["vecToTargetPos"]);
    }

};

SpaceshipAI.prototype.aiBehaviorSelectTarget = function() {
    // NOTE: in the original state machine-based AI, the knowledge obj was a dict/Object, with property "parentObj" == the spaceship, and property "knowledge" = the gameLogic obj. In this function, parentObj is the "this" reference
    var parentShip = this.parentObj;

    // Find the nearest target
    if (parentShip.aiConfig["aiProfile"] == "miner") {
        // find nearest object - prefer asteroids, but attack a ship if it's closer than the nearest asteroid
        // TODO possibly wrap the target selection loops inside functions. We're duplicating code here
        var astMgr = this.knowledge.gameObjs["astMgr"];

        var minSqrDistAst = Number.MAX_SAFE_INTEGER;
        var potentialAstTarget = null;
        for (var asteroid of astMgr.components["asteroidPS"].particles) {
            // Blah, why did I make the asteroids a subclass of particles?
            if (asteroid.alive) {
                var sqDistAst = vec2.sqrDist(parentShip.components["physics"].currPos, asteroid.components["physics"].currPos);
                if (sqDistAst < minSqrDistAst) {
                    minSqrDistAst = sqDistAst;
                    potentialAstTarget = asteroid;
                }
            }
        }

        var minSqrDistShip = Number.MAX_SAFE_INTEGER;
        var potentialShipTarget = null;
        for (var shipDictIDKey in this.knowledge.shipDict) {
            // Iterate over ships that aren't my ship ("I" am an AI, not a ship)
            if (parentShip.objectID != shipDictIDKey) {
                var gameObjIDName = this.knowledge.shipDict[shipDictIDKey];
                var shipRef = this.knowledge.gameObjs[gameObjIDName];

                // TODO - add some kind of after-death delay so we don't target a ship that just respawned
                sqDistShip = vec2.sqrDist(parentShip.components["physics"].currPos, shipRef.components["physics"].currPos);
                if (sqDistShip < minSqrDistShip) {
                    minSqrDistShip = sqDistShip;
                    potentialShipTarget = shipRef;
                }
            }
        }
        
        // Target the nearest asteroid, unless a ship is closer
        parentShip.aiConfig["target"] = sqDistAst <= sqDistShip ? potentialAstTarget : potentialShipTarget;

    } else if (parentShip.aiConfig["aiProfile"] == "hunter") {
        // find nearest ship and go after it. Only prefer an asteroid if there are no ships within the hunt radius
        var minSqrDistShip = Number.MAX_SAFE_INTEGER;

        var sqDistShip = 0;
        var potentialShipTarget = null;
        for (var shipDictIDKey in this.knowledge.shipDict) {
            // Iterate over ships that aren't my ship ("I" am an AI, not a ship)
            if (parentShip.objectID != shipDictIDKey) {
                var gameObjIDName = this.knowledge.shipDict[shipDictIDKey];
                var shipRef = this.knowledge.gameObjs[gameObjIDName];

                // TODO - add some kind of after-death delay so we don't target a ship that just respawned
                sqDistShip = vec2.sqrDist(parentShip.components["physics"].currPos, shipRef.components["physics"].currPos);
                if (sqDistShip < minSqrDistShip) {
                    minSqrDistShip = sqDistShip;
                    potentialShipTarget = shipRef;
                }
            }
        }
        // Target the nearest ship
        parentShip.aiConfig["target"] =  potentialShipTarget;

        // If the nearest ship is outside the hunt radius, then go for asteroids
        if (minSqrDistShip >= parentShip.aiConfig["aiHuntRadius"] * parentShip.aiConfig["aiHuntRadius"]) {
            var astMgr = this.knowledge.gameObjs["astMgr"];

            var minSqrDistAst = Number.MAX_SAFE_INTEGER;
            var sqDistAst = 0;
            var potentialAstTarget = null;
            for (var asteroid of astMgr.components["asteroidPS"].particles) {
                // Blah, why did I make the asteroids a subclass of particles?
                if (asteroid.alive) {
                    sqDistAst = vec2.sqrDist(parentShip.components["physics"].currPos, asteroid.components["physics"].currPos);
                    if (sqDistAst < minSqrDistAst) {
                        minSqrDistAst = sqDistAst;
                        potentialAstTarget = asteroid;
                    }
                }
            }
            // If we're here, we want to target the nearest asteroid, even though we're a "hunter"
            parentShip.aiConfig["target"] =  potentialAstTarget;
        }
    }

    // Transitions
    if (this.aiReadyToTransitionToAlign()) {
        // Transition to align state
        this.dequeueCurrentEnqueueNew(this.aiBehaviorAlignToTarget);
    } else if (this.aiReadyToTransitionToThrust()) {
        // Transition to thrust state
        this.dequeueCurrentEnqueueNew(this.aiBehaviorThrustToTarget);
    } else if (this.aiReadyToTransitionToAttack()) {
        // Transition to attack state
        this.dequeueCurrentEnqueueNew(this.aiBehaviorAttackTarget);
    }

};

// Align to a specified direction
// TODO decide whether to take in the target var as a param, or if it should be a var within the spaceship's AI "brain"
SpaceshipAI.prototype.aiReadyToTransitionToAlign = function() {
    var parentShip = this.parentObj;
    var enemy = parentShip.aiConfig["target"];

    if (!enemy) {
        return false;
    }

    // already normalized by the physics component; we can simply grab a reference to this vector
    var shipHeading = parentShip.components["physics"].angleVec;

    // return true if ship has a target, and heading is NOT yet aligned to target
    return this.isVectorAligned(shipHeading, parentShip.aiConfig["vecToTargetPos"], parentShip.aiConfig["aiAlignHeadingThreshold"]) == false;
};

SpaceshipAI.prototype.aiReadyToTransitionToThrust = function() {
    var parentShip = this.parentObj;
    var enemy = parentShip.aiConfig["target"];

    if (!enemy) {
        return false;
    }

    // already normalized by the physics component; we can simply grab a reference to this vector
    var shipHeading = parentShip.components["physics"].angleVec;

    // Compute the ship-to-target vector

    var shipPos = parentShip.components["physics"].currPos;
    var enemyPos = enemy.components["physics"].currPos;

    // TODO factor these calculations into something else? Some state transitions are repeating the same calculations 
    return this.isVectorAligned(shipHeading, parentShip.aiConfig["vecToTargetPos"], parentShip.aiConfig["aiAlignHeadingThreshold"]) == true &&
           this.isWithinRange(shipPos, enemyPos, parentShip.aiConfig["aiSqrAttackDist"]) == false;
};

SpaceshipAI.prototype.aiReadyToTransitionToAttack = function() {
    var parentShip = this.parentObj;
    var enemy = parentShip.aiConfig["target"];

    if (!enemy) {
        return false;
    }

    // already normalized by the physics component; we can simply grab a reference to this vector
    var shipHeading = vec2.clone( parentShip.components["physics"].angleVec );

    // Compute the ship-to-target vector
    var shipToTarget = vec2.create();
    vec2.sub(shipToTarget, parentShip.aiConfig["target"].components["physics"].currPos, parentShip.components["physics"].currPos);
    vec2.normalize(shipToTarget, shipToTarget);

    var shipPos = parentShip.components["physics"].currPos;
    var enemyPos = enemy.components["physics"].currPos;

    // TODO factor these calculations into something else? Some state transitions are repeating the same calculations 
    return this.isVectorAligned(shipHeading, shipToTarget, parentShip.aiConfig["aiAlignHeadingThreshold"]) == true &&
           this.isWithinRange(shipPos, enemyPos, parentShip.aiConfig["aiSqrAttackDist"]) == true;


};


// Return true if the the angle between vecA and vecB is within the tolerance
// tolerance is a half-angle, in degrees
// i.e., if tolerance is 5, then it's actual +/- 5 degrees; a 10 degree window
SpaceshipAI.prototype.isVectorAligned = function(vecA, vecB, tolerance) {
    // angleBetween returns radians -- convert that to degrees
    var angBtwn = MathUtils.angleBetween(vecA, vecB) * (180.0 / Math.PI);
    return (Math.abs(angBtwn) <= Math.abs(tolerance))
};


// posA and posB are glMatrix vec2d objects
SpaceshipAI.prototype.isWithinRange = function(posA, posB, sqDistThreshold) {
    return vec2.sqrDist(posA, posB) <= sqDistThreshold;
};


//SpaceshipAI.prototype.isTargetAcquired = function() {
//    return 
//};


// Align to target (target info is stored within the ship/AI object
SpaceshipAI.prototype.aiBehaviorAlignToTarget = function() {
    // TODO - update this function. Pull out any calculations that can be used by other behaviors into the processKnowledge function. Update transition logic to follow the ai_take_07 diagram
    var parentShip = this.parentObj;
    var enemy = parentShip.aiConfig["target"];  //TODO maybe call it "target", instead of "enemy"

    if (enemy) {
        // already normalized by the physics component; we can simply grab a reference to this vector

        // Compute the angle between the ship's heading and the vector from ship pos to target pos
        // Both vectors are already normalized. angleBetween returns radians, but our AI thresholds are in degrees, so we convert
        var angBtwn = MathUtils.angleBetween(parentShip.components["physics"].angleVec, parentShip.aiConfig["vecToTargetPos"]) * 180.0 / Math.PI;

        // Adjust turn/heading
        if (angBtwn > glMatrix.toRadian(parentShip.aiConfig["aiAlignHeadingThreshold"])) {
            // In the HTML5 Canvas coordinate system, a + rotation is to the right
            // But it might be worth (at some point? if I feel like it?) renaming enableTurnRight/Left to enableTurnPos/Neg
            parentShip.enableTurnRight();
        } else if (angBtwn < glMatrix.toRadian(-parentShip.aiConfig["aiAlignHeadingThreshold"])) {
            parentShip.enableTurnLeft();
        } else {
            // NOTE: if you're here, you're ready to transition out of the state
            parentShip.disableTurn();
        }

        // transitions out of this state
        if (!enemy.alive) {
            // target lost (i.e. target is not alive anymore) --> select target
            this.dequeueCurrentEnqueueNew(this.aiBehaviorSelectTarget);
        } else if this.isVectorAligned(parentShip.components["physics"].angleVec, parentShip.aiConfig["vecToTargetPos"], parentShip.aiConfig["aiAlignHeadingThreshold"]) == true &&
                  !this.isWithinRange(parentShip.components["physics"].currPos, enemy.components["physics"].currPos, parentShip.aiConfig["aiSqrAttackDist"]) {
            // target acquired, aligned to target, not within firing range --> thrust
            this.dequeueCurrentEnqueueNew(this.aiBehaviorThrustToTarget);
        } else if this.isVectorAligned(parentShip.components["physics"].angleVec, parentShip.aiConfig["vecToTargetPos"], parentShip.aiConfig["aiAlignHeadingThreshold"]) == true &&
                  this.isWithinRange(parentShip.components["physics"].currPos, enemy.components["physics"].currPos, parentShip.aiConfig["aiSqrAttackDist"]) {
            // target acquired, aligned to target, within firing range --> attack
            this.dequeueCurrentEnqueueNew(this.aiBehaviorAttackTarget);
        }
    } else {
        // if the ship doesn't have an enemy/target selected, then select one
        this.dequeueCurrentEnqueueNew(this.aiBehaviorSelectTarget);
    }
};

// Thrust to target
SpaceshipAI.prototype.aiBehaviorThrustToTarget = function() {
    // TODO rework this function -- make it thrust specifically towards target.  Pull out anything that can be used by other behavior functions, into processKnowledge
    // The thrust state can either engage or disengage thrust. 
    // Thrust is disengaged if the ship has reached its speed limit, but the AI will stay in this
    // state until something causes a transition out to another state/behavior
    var parentShip = this.parentObj;
    var shipPhysComp = parentShip.components["physics"];

    if (vec2.len(parentShip.aiConfig["currVel"]) / game.fixed_dt_s <= parentShip.aiConfig["aiMaxLinearVel"]) {
        //console.log("ThrustToPursueTarget, vel magnitude: " + vec2.len(currVel) / game.fixed_dt_s, "Vec: ", currVel, "align to:", parentShip.aiConfig["aiVelCorrectDir"]);
        parentShip.enableThrust();
    } else {
        // If ship heading is within an acceptable offset from shipToTarget, then disableThrust and just drift
        // Otherwise, work to reduce the velocity component that is doing more to take the ship away from its desired heading, and then get back to AlignToTarget (which will re-align the ship for thrusting)
        parentShip.disableThrust();
    }

    // TODO make an update() function in the ship's AI that updates "important" metrics, like shipHeading, shipVelo, angBetween those 2 things, and whatever else we need. Then, use those metrics to determine how to behave / transition into/out of states


    // Transitions
};

// Attack a target (fire weapon)
SpaceshipAI.prototype.aiBehaviorAttackTarget = function(knowledgeObj) {

};
