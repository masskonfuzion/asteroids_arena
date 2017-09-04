// Global scope
var CollisionComponentTypeEnum = { "circle": 0,
                                   "aabb": 1
                                 };

function CollisionComponentAABB() {
    GameObject.call(this);
    this.type = CollisionComponentTypeEnum.aabb;

    this.minPt = [0.0, 0.0];
    this.maxPt = [0.0, 0.0];
}

CollisionComponentAABB.prototype = Object.create(GameObject.prototype);
CollisionComponentAABB.prototype.constructor = CollisionComponentAABB;

