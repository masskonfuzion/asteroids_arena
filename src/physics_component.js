function PhysicsComponentVerlet() {
    this.currPos = vec2.create();
    this.prevPos = vec2.create();
    this.acceleration = vec2.create();
    this.angleVec = vec2.fromValues(1.0, 0.0);  // v[0] = cos(theta); v[1] = sin(theta)
    this.angularVel = 0.0;
}
