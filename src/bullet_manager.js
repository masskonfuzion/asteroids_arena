// Bullet manager that controls the bullet particle system
// The manager can control how bullets are enables/initialized (and re-initialized) and disabled; also can control what sprite/image the bullet objects draw, as well as how they move

function BulletManager () {
    GameObject.call(this);
    // The Bullet particle system is an object pool
    this.addComponent("gunPS", new ParticleSystem());   // TODO possibly make a Bullet class that can be instantiated with one of many types of Bullet object (or maybe only one Bullet

    this.maxBullets = 0;
    this.initialBullets = 0;
    this.numFreeSlots = 0;  // Track the # of free Bullet slots in the particle system

}

BulletManager.prototype = Object.create(GameObject.prototype);
BulletManager.prototype.constructor = BulletManager;

BulletManager.prototype.initialize = function(maxBullets) {
    // maxBullets is the maximum number of Bullets that could be in play
    var mySystem = this.components["gunPS"];
    mySystem.initialize(maxBullets);  // TODO make it possible to set the class (maybe give the specific constructor to call?)

    // TODO NOTE: Chances are the BulletManager does not have its own emitter; various other things will have emitters (e.g. spaceships). However, the manager will be able to expire bullets when they meet certain conditions (e.g. off-screen, collide with something)

    //// TODO make it possible to configure the emitter using a config object (i.e. an object with the params to set for the emitter, to enable different types of guns)
    //var myEmitter = this.components["bulletPE"];
    //myEmitter.setVelocityRange(1.0, 5.0);
    //myEmitter.setAngleRange(-180, 180);     // degrees
    //myEmitter.setLaunchDir(1.0, 0.0);   // Direction doesn't matter.. the angle range will be a full 360 degrees
    //myEmitter.setPosition(256, 256);    // TODO randomize emitter positions throughout the arena/space
    //myEmitter.registerParticleSystem(mySystem);
};

BulletManager.prototype.update = function(dt_s, config = null) {
    for (var compName in this.components) {
        if (this.components.hasOwnProperty(compName)) {
            this.components[compName].update(dt_s);
        }
    }
};


BulletManager.prototype.draw = function(canvasContext) {
    // Draw each alive Particle
    var myPS = this.components["gunPS"];
    for (var particle of myPS.particles) {
        if (particle.alive) {
            particle.draw(canvasContext);
        }
    }
};
