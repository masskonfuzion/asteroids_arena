/** Particle System
*/

function ParticleSystem() {
    this.particles = [];
    this.lastUsedIndex = 0;
}

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
    var i = this.lastUsedIndex;

    while (this.particles[i].alive) {
        i = (i + 1) % this.particles.length;

        if (!this.particles[i].alive) {
            return this.particles[i];
        }

        if (i == this.lastUsedIndex) {
            loops += 1;
        }

        if (loops == maxLoops) {
            return null;
        }
    }
};
