/** Particle
*/

function Particle() {
    GameObject.call(this);

    this.addComponent("physics", new PhysicsComponentVerlet());
    this.addComponent("render", new RenderComponentSprite());

    // NOTE: Particles will not have a "velocity" property because they'll be simulated using position Verlet integration. The Emitter will control initial position and velocity

    this.alive = false;
    this.ttl = 0.0;         // in seconds
    this.color = [0, 0, 0]; // RGB components
}


Particle.prototype = Object.create(GameObject.prototype);
Particle.prototype.constructor = Particle;

Particle.prototype.draw = function(canvasContext) {
    // draw the render component
}


Particle.prototype.update = function(dt_s) {
    // TODO update the stuff here; probably integrate verlet, fade color, decrease ttl, all that..
}
