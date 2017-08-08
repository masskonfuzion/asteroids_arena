function PhysicsComponentVerlet() {
    this.currPos = vec2.create();
    this.prevPos = vec2.create();
    this.acceleration = vec2.create();
    this.angleVec = vec2.fromValues(1.0, 0.0);  // v[0] = cos(theta); v[1] = sin(theta)
    this.angularVel = 0.0;
}

// Run verlet integration. Note that this does just enough for particle simulation (we're treating the spaceship as a particle)
// The timestep, dt_s, is in seconds
PhysicsComponentVerlet.prototype.update = function(dt_s) {

    var posTmp = vec2.clone(this.currPos);

    var vel = vec2.create();
    vec2.sub(vel, this.currPos, this.prevPos);

    vec2.scaleAndAdd(this.currPos, this.currPos, vel, dt_s * dt_s);
    vec2.copy(this.currPos, posTmp);
}
