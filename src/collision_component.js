// Global scope
var CollisionComponentTypeEnum = { "circle": 0,
                                   "aabb": 1
                                 };

function CollisionComponentAABB() {
    GameObjectComponent.call(this);
    this.type = CollisionComponentTypeEnum.aabb;

    this.center = vec2.create();

    this.extents = [0.0, 0.0];  // extents in an AABB are the half-widths along each axis

    this.minPt = vec2.create();
    this.maxPt = vec2.create();
}

CollisionComponentAABB.prototype = Object.create(GameObjectComponent.prototype);
CollisionComponentAABB.prototype.constructor = CollisionComponentAABB;

CollisionComponentAABB.prototype.setMinPt = function(x, y) {
    this.minPt[0] = x;
    this.minPt[1] = y;
}

CollisionComponentAABB.prototype.setMaxPt = function(x, y) {
    this.maxPt[0] = x;
    this.maxPt[1] = y;
}


CollisionComponentAABB.prototype.update = function(dt_s, obj = null) {
    // AABB probably doesn't need dt_s, but we pass it through so that the signature for this fn matches all other update() functions in the engine
    // The obj will contain a reference to the render geometry, so the AABB can recompute its boundaries. (Or, should obj be null? and instead, we give the the AABB a render geometry reference, so the AABB always has its render geometry?)

}
