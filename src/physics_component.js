function PhysicsComponentVerlet() {
    GameObject.call(this);

    this.currPos = vec2.create();
    this.prevPos = vec2.create();
    this.acceleration = vec2.create();
    this.angle = 0.0;
    this.angleVec = vec2.fromValues(1.0, 0.0);  // v[0] = cos(theta); v[1] = sin(theta)
    this.angularVel = 0.0;
}

PhysicsComponentVerlet.prototype = Object.create(GameObject.prototype);
PhysicsComponentVerlet.prototype.constructor = PhysicsComponentVerlet;

// Run verlet integration. Note that this does just enough for particle simulation (we're treating the spaceship as a particle)
// The timestep, dt_s, is in seconds
PhysicsComponentVerlet.prototype.update = function(dt_s) {

    // TODO update the physics component's angleVec and keep sync with the "angle" (or, otherwise, ditch the angleVec) (the angleVec is essentially the heading of the ship. In fact... Maybe rename it to that (if we don't delete it entirely))
    var posTmp = vec2.clone(this.currPos);

    // currPos += (currPos - prevPos) + (acceleration * dt_s * dt_s)

    var integrationTerm = vec2.create();
    vec2.sub(integrationTerm, this.currPos, this.prevPos);                                  // currPos - prevPos
    vec2.scaleAndAdd(integrationTerm, integrationTerm, this.acceleration, dt_s * dt_s);     // (currPos - prevPos) + (accel * dt_s * dt_s)
    vec2.add(this.currPos, this.currPos, integrationTerm);

    vec2.copy(this.prevPos, posTmp);

    this.angle = (this.angle + glMatrix.toRadian(this.angularVel) * dt_s) % (2 * Math.PI);
}

PhysicsComponentVerlet.prototype.setPosition = function(x, y) {
    // Set both current and previous pos, so that the update() function does not obtain velocity
    vec2.set(this.currPos, x, y);
    vec2.set(this.prevPos, x, y);
}

// Set the particle's position and initial velocity
// Use vel to fabricate a prevPos
PhysicsComponentVerlet.prototype.setPosAndVel = function(posX, posY, velX, velY, dt_s) {
    // We'll scale velocity by dt (should be a fixed dt)
    vec2.set(this.currPos, this.posX, this.posY);
    vec2.set(this.prevPos, this.posX - velX*dt_s, this.posY - velX*dt_s);
}

// Set linear acceleration
PhysicsComponentVerlet.prototype.setAcceleration = function(x, y) {
    vec2.set(this.acceleration, x, y);
}

