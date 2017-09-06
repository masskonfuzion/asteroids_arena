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


// Recompute the boundaries of the AABB
CollisionComponentAABB.prototype.update = function(dt_s, obj = null) {
    var renderComp = this.parentObj.components["render"];
    console.assert(renderComp !== null);
    console.assert(renderComp.imgObj !== null);

    // We get the physics component because it has the object's position. The render component does not store position
    var physicsComp = this.parentObj.components["physics"];
    console.assert(physicsComp !== null);

    // TODO re-work AABB update to be able to handle any render component of any type

    // Image/sprite case
    var imgObj = renderComp.imgObj;
    var pos = physicsComp.currPos;

    this.setMinPt(pos[0] - imgObj.width/2, pos[1] - imgObj.height/2)
    this.setMaxPt(pos[0] + imgObj.width/2, pos[1] + imgObj.height/2)
}
