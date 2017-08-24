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
    this.minLaunchVelMult = 0.0;        // Minimum velocity magnitude multiplier
    this.maxLaunchVelMult = 0.0;        // Maximum velocity magnitude multiplier
    this.minLaunchAngle = 0.0;          // Minimum launch angle offset (relative to launchDir, in degrees)
    this.maxLaunchAngle = 0.0;          // Maximum launch angle offset (relative to launchDir, in degrees)
    this.position = vec2.create();

    this.color = [0.0, 0.0, 0.0];       // TODO make a color palette/something to base initial particle color on

    this.minTTL = 0.0;  // seconds
    this.maxTTL = 0.0;

    this.enabled = false;
}

ParticleEmitter.prototype = Object.create(GameObject.prototype);
ParticleEmitter.prototype.constructor = ParticleEmitter;

ParticleEmitter.prototype.registerParticleSystem = function(particleSys) {
    this.registeredPS = particleSys;
}

// We want to be able to emit from one or more "emit points", e.g. multiple thrusters or multiple guns/missile launchers -- should guns/missiles be treated as particles? (if so, should missiles have logic, e.g. homing missiles? Should this game even have missiles?)

// Get the "next available particle" in the system, and initialize it
// If getNextUnusedParticle() fails, then this function should fail silently (at most, log to console)
ParticleEmitter.prototype.emitParticle = function(dt_s) {
    // TODO update emitParticle to take in the type of particle to emit (or, e.g., info about how to initialize the particle. Use the Transfer Object pattern -- the object will contain config info re: particles with sprite rendering vs other type of rendering)
    var particle = this.registeredPS.getNextUsableParticle();

    if (particle) {
        // Initialize the particle direction by copying from the emitter's direction property
        var particleDir = vec2.create();
        vec2.copy(particleDir, this.launchDir);

        // Compute an angle offset by which to rotate the base particle direction
        var angleOffset = Math.floor(Math.random() * (this.maxLaunchAngle - this.minLaunchAngle)) + this.minLaunchAngle;

        // Compute the rotation matrix to apply the desired rotational offset to the launch dir
        var angleOffsetMatrix = mat2.create();
        mat2.fromRotation( angleOffsetMatrix, glMatrix.toRadian(angleOffset) );

        // Apply the rotation
        vec2.transformMat2(particleDir, particleDir, angleOffsetMatrix);
        vec2.normalize(particleDir, particleDir);   // normalize, just in case

        // Compute a launch velocity (don't use Math.floor() because we want floating point results
        var launchVelMag = Math.random() * (this.maxLaunchVelMult - this.minLaunchVelMult) + this.minLaunchVelMult;
        var launchVel = vec2.create();
        vec2.scale(launchVel, particleDir, launchVelMag);

        // Compute a TTL
        var ttl = Math.random() * (this.maxTTL - this.minTTL) + this.minTTL;

        // TODO set color (use a color palette or something?)
        var particleColor = [200, 200, 0];


        // Now, set the properties of the particle
        var physComp = particle.components["physics"];
        physComp.setPosAndVel(this.position[0], this.position[1], launchVel[0], launchVel[1], dt_s);
        // NOTE: We're not using particle angles here (but we could if we wanted to)

        particle.alive = true;
        particle.ttl = ttl;

        // TODO make a "setColor" function somewhere -- either in the particle's render component, or directly in the particle itself. NOTE: right now, the particle object has a color object (remove it), and the render component defaults to [255,255,255] (fix that)
        for (var colorComponent = 0; colorComponent < 3; colorComponent++) {
            particle.color[colorComponent] = particleColor[colorComponent];
        }
    }
}


ParticleEmitter.prototype.setPosition = function(posX, posY) {
    vec2.set(this.position, posX, posY);
}

ParticleEmitter.prototype.setVelocityRange = function(minMagnitude, maxMagnitude) {
    this.minLaunchVelMult = minMagnitude;
    this.maxLaunchVelMult = maxMagnitude;
}


ParticleEmitter.prototype.setLaunchDir = function(dirX, dirY) {
    vec2.set(this.launchDir, dirX, dirY);
    vec2.normalize(this.launchDir, this.launchDir);
}


ParticleEmitter.prototype.setAngleRange = function(minAng, maxAng) {
    // Angles are in degrees
    // Not sure if I want to use negative angles (e.g. min angle -10, max 10); or only non-zero (e.g. "min" is 350, "max" is 10), or use vectors (interpolate from a left-ish vector to a right-ish vector
    this.minLaunchAngle = minAng;
    this.maxLaunchAngle = maxAng;
}


ParticleEmitter.prototype.setTTLRange = function(minTTL, maxTTL) {
    // in seconds
    this.minTTL = minTTL;
    this.maxTTL = maxTTL;
}


ParticleEmitter.prototype.setColor = function(r, g, b) {
    this.color = [r, g, b];
}


ParticleEmitter.prototype.setEnabled = function() {
    this.enabled = true;
}


ParticleEmitter.prototype.setDisabled = function() {
    this.enabled = false;
}


ParticleEmitter.prototype.update = function(dt_s, config = null) {
    // emit a particle
    // NOTE: the particle emitter is only responsible for putting particles into a particle system
    // the emitter is not responsible for updating the emitted particles; the particle system itself will handle that

    if (this.enabled) {
        // If config obj exists, emit particles based on its contents
        if (config) {
            // Note that with multiple emitPoints, the emitter emits them all simultaneously.
            // I'm debating how to do round-robin emission (i.e., should the ParticleEmitter object be responsible for the logic of round-robin, or should the object that owns the emitter (e.g. the gun/thruster/etc)?
            for (var emitPoint of config["emitPoints"]) {
                this.setPosition(emitPoint["position"][0], emitPoint["position"][1]);
                this.setLaunchDir(emitPoint["direction"][0], emitPoint["direction"][1]);
                this.emitParticle(dt_s);
            }
        } else {
            // else, simply emit a particle based on originally set parameters
            this.emitParticle(dt_s);
        }
    }
}
