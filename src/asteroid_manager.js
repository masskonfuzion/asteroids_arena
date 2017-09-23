function AsteroidManager () {
    GameObject.call(this);
    // The Asteroid field is essentially a particle system
    this.addComponent("asteroidPS", new ParticleSystem(Asteroid));
    this.addComponent("asteroidPE", new ParticleEmitter());     // The Asteroid manager will control the particle emitter to put particles into the system

    this.maxAsteroids = 0;
    this.initialAsteroids = 0;
    this.numFreeSlots = 0;  // Track the # of free Asteroid slots in the particle system
}


AsteroidManager.prototype = Object.create(GameObject.prototype);
AsteroidManager.prototype.constructor = AsteroidManager;

AsteroidManager.prototype.initialize = function(initAsteroids, maxAsteroids) {
    // maxAsteroids is the maximum number of Asteroids that could be in play
    var mySystem = this.components["asteroidPS"];
    mySystem.initialize(maxAsteroids);  // TODO make it possible to set the class (maybe give the specific constructor to call?)

    // TODO make it possible to configure the emitter using a config object (i.e. an object with the params to set for the emitter, to enable difficulty levels, etc)
    var myEmitter = this.components["asteroidPE"];
    myEmitter.setVelocityRange(1.0, 5.0);
    myEmitter.setAngleRange(-180, 180);     // degrees
    myEmitter.setLaunchDir(1.0, 0.0);   // Direction doesn't matter.. the angle range will be a full 360 degrees
    myEmitter.setPosition(256, 256);    // TODO randomize emitter positions throughout the arena/space
    myEmitter.registerParticleSystem(mySystem);

    // TODO consider NOT emitting a particle/asteroid in initialize() (i.e. move this fn elsewhere)
    for (var i = 0; i < initAsteroids; i++) {
        // TODO add an emitPoints list -- otherwise, this emitter won't know where to emit from
        var configObj = { "renderCompType": "image",
                          "imageRef": game.imgMgr.imageMap["astLarge"].imgObj
                        };
        // Emit a particle with the given config. Note that the config tells the particle which image to use for its render component
        // Because the images are already loaded by the ImageManager (in the GameLogic object), all we have to do is reference it
        // Also note: this approach requires the ParticleSystem to be configured to create Particles with an image/sprite render component
        myEmitter.emitParticle(gameLogic.fixed_dt_s, configObj);
        // NOTE: I don't like accessing gameLogic directly, but then again, we made it to simplify the handling of situations like this one (we need fixed_dt_s and no more elegant way than this to get it)
    }
};

AsteroidManager.prototype.update = function(dt_s, config = null) {
    for (var compName in this.components) {
        if (this.components.hasOwnProperty(compName)) {
            this.components[compName].update(dt_s);
        }
    }
};


// TODO either delete setAsteroidCounts() or keep it, and flesh it out
//AsteroidManager.prototype.setAsteroidCounts = function(initAsteroids, maxAsteroids) {
//    this.initAsteroids = initAsteroids;
//    this.maxAsteroids = maxAsteroids;
//};

AsteroidManager.prototype.resetAsteroidField = function() {
    // TODO revisit what to do when you reset
    // This fn is meant to be called after setting max/init (or maybe we should reset when we initialize? Not sure..


    // Track the # of free slots in the Asteroid particle system. Before putting
    // on a new Asteroid, there should be enough free slots to accommodate all
    // fragments the Asteroid will eventually generate (er.. am I saying this
    // right? Basically, to put 1 particle out, we have to be sure there are
    // 4 slots open, because eventually 1 large Asteroid could be blasted into
    // 4 small Asteroids.)
    this.numFreeSlots = this.maxAsteroids;

};

AsteroidManager.prototype.draw = function(canvasContext) {
    // Draw each alive Particle
    var myPS = this.components["asteroidPS"];
    for (var particle of myPS.particles) {
        if (particle.alive) {
            //var myPhysicsComp = particle.components["physics"];
            ////canvasContext.translate(myPhysicsComp.currPos[0], myPhysicsComp.currPos[1]);
            //canvasContext.rotate( glMatrix.toRadian(myPhysicsComp.angle) );

            particle.draw(canvasContext);
            //canvasContext.restore(); // similar to glPopMatrix

            // DEBUG STUFF -- TODO delete
            var myCollisionComp = particle.components["collision"];
            myCollisionComp.draw(canvasContext);

        }
    }
};


