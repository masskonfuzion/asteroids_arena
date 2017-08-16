/** Particle Emitter

Particle Emitters register with a Particle System (a.k.a. Particle Engine). A System can have multiple emitters (e.g. multiple ships can emit to the the "thrust smoke" System)
Particle System has a fixed-length array of Particle objects
Emitters "emit" Particles by writing info to Particles, initializing their values (e.g. velocity, launch angle, start/end colors, time to live, etc.)
The Particle System simulates the Particles' decay

ParticleEmitters have to issue requests, of the Particle System, to add particles

NOTE: This class can be a game object component -- e.g., a spaceship will have the particle emitter. Yeah. I just decided that right now. You, reading this, will have no idea when "now" is. But I've been working on this game for over a week. So, yeah. :-D.
ParticleEmitter should be thought of as a Particle System Controller. A spaceship can use the ParticleEmitter differently, depending on which gun/launcher it has equipped.
**/

function ParticleEmitter() {
    // Inherit GameObject properties, includinga components dict
    GameObject.call(this);

    this.registeredPS = null;           // A reference to the particle system this emitter will write to

    this.launchDir = vec2.create();     // should be a normalized vector
    this.minLaunchVel = vec2.create();
    this.maxLaunchVel = vec2.create();
    this.minLaunchAngle = 0.0;          // Minimum launch angle offset (relative to launchDir)
    this.maxLaunchAngle = 0.0;          // Maximum launch angle offset (relative to launchDir)
    this.position = vec2.create();

    this.color = [0.0, 0.0, 0.0];

    this.maxTTL = 0.0;

    // TODO add some members/functions for, e.g. multiple emit points (e.g., dual thruster, multiple rocket launcher nozzles, etc)
}

ParticleEmitter.prototype = Object.create(GameObject.prototype);
ParticleEmitter.prototype.constructor = ParticleEmitter;

ParticleEmitter.prototype.registerParticleSystem = function(particleSys) {
    this.registeredPS = particleSys;
}

// We want to be able to emit from one or more "emit points", e.g. multiple thrusters or multiple guns/missile launchers -- should guns/missiles be treated as particles? (if so, should missiles have logic, e.g. homing missiles? Should this game even have missiles?)

// Get the "next available particle" in the system, and initialize it
// If getNextUnusedParticle() fails, then this function should fail silently (at most, log to console)
ParticleEmitter.prototype.emitParticle = function(emitterPos) {
    var particle = this.registeredPS.getNextUsableParticle();

    if (particle) {
        var physComp = particle.components["physics"];
        physComp.setPosAndVel(emitterPos[0], emitterPos[1]);

        particle.alive = true;
    }
}


ParticleEmitter.prototype.setPosition = function(posX, posY) {
    vec2.set(this.position, posX, posY);
}

ParticleEmitter.prototype.setVelocityRange = function(minVelX, minVelY, maxVelX, maxVelY) {
    vec2.set(this.minLaunchVel, minVelX, minVelY);
    vec2.set(this.maxLaunchVel, maxVelX, maxVelY);
}


ParticleEmitter.prototype.setLaunchDir = function(dirX, dirY) {
    vec2.set(this.launchDir, dirX, dirY);
    vec2.normalize(this.launchDir, this.launchDir);
}


ParticleEmitter.prototype.setAngleRange = function(minAng, maxAng) {
    // Not sure if I want to use negative angles (e.g. min angle -10, max 10); or only non-zero (e.g. "min" is 350, "max" is 10), or use vectors (interpolate from a left-ish vector to a right-ish vector
    this.minLaunchAngle = minAng;
    this.maxLaunchAngle = maxAng;
}


ParticleEmitter.prototype.setMaxTTL = function(mttl) {
    this.maxTTL = mttl;
}


ParticleEmitter.prototype.setColor = function(r, g, b) {
    this.color = [r, g, b];
}


ParticleEmitter.prototype.update = function(dt_s) {
    // TODO do something. Probably put some particles into the particle system (hint: call emitParticle). And stuff
}
