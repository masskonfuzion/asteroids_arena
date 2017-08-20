/** Particle System
*/

function ParticleSystem() {
    GameObject.call(this);

    this.particles = [];
    this.lastUsedIndex = -1;
}

ParticleSystem.prototype = Object.create(GameObject.prototype);
ParticleSystem.prototype.constructor = ParticleSystem;

ParticleSystem.prototype.initialize = function(numParticles) {
    console.assert(this.particles.length == 0);

    for (var i = 0; i < numParticles; i++) {
        this.particles.push(new Particle());
    }
};

// Return next available non-alive Particle that can be used
// Wrap back to beginning if the end of the list is reached
// Return null if you've looped through the particle array a certain number of times and not found a usable particle
ParticleSystem.prototype.getNextUsableParticle = function(maxLoops = 3) {
    var loops = 0;
    var i = (this.lastUsedIndex + 1) % this.particles.length;

    while (this.particles[i].alive) {
        if (i == this.lastUsedIndex) {
            loops += 1;
            if (loops == maxLoops) {
                return null;
            }
        }
        i = (i + 1) % this.particles.length;
    }

    this.lastUsedIndex = i;
    return this.particles[i];

};


ParticleSystem.prototype.draw = function(canvasContext) {
    // Draw each alive Particle
    for (var particle of this.particles) {
        if (particle.alive) {
            particle.draw(canvasContext);
        }
    }
};


ParticleSystem.prototype.update = function(dt_s) {
    for (particle of this.particles) {
        particle.update(dt_s);
    }
}
