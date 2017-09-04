function CollisionManager() {
    // Do nothing here?
}


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
