// Quadtree-based Collision Manager
// Perhaps if we want to get fancier in the future, we can make a Collision Manager Interface, and
// then have Collision Manager instances that implement the interface using different underlying
// mechanisms, like BSP, Spatial Hash, etc.
function CollisionManager() {
    GameObject.call(this);
    // The collision manager has a pool of collision objects.
    this.collisionObjs = [];

    this.quadTree = null;
}

CollisionManager.prototype = Object.create(GameObject.prototype);
CollisionManager.prototype.constructor = CollisionManager;

CollisionManager.prototype.initialize = function(maxLevels, initialRect) {
    this.quadTree = new QuadTree(maxLevels, initialRect); // width/height should match canvas width/height (maybe just use the canvas object?)
}

CollisionManager.prototype.update = function(dt_s, configObj) {
    // TODO implement -- the update function should call into a quadtree update (broad phase), and then individual collision tests possibly
};

// Return true if objA and objB are colliding with each other.
// This function does not compute contact/restitution information
CollisionManager.prototype.isColliding = function(objA, objB) {
    // NOTE: add to isColliding() as necessary

    // AABB-AABB
    if (objA.type == CollisionComponentTypeEnum.aabb && objB.type == CollisionComponentTypeEnum.aabb) {
        return this.isColliding_AABB_AABB(objA, objB);
    }
}


CollisionManager.prototype.isColliding_AABB_AABB = function(objA, objB) {
    if (objA.maxPt[0] < objB.minPt[0] || objA.minPt[0] > objB.maxPt[0]) {
        return false;
    }

    if (objA.maxPt[1] < objB.minPt[1] || objA.minPt[1] > objB.maxPt[1]) {
        return false;
    }

    return true;
};
