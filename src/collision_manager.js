// Quadtree-based Collision Manager
// Perhaps if we want to get fancier in the future, we can make a Collision Manager Interface, and
// then have Collision Manager instances that implement the interface using different underlying
// mechanisms, like BSP, Spatial Hash, etc.
function CollisionManager() {
    GameObject.call(this);
    // The collision manager has a pool of collision objects.
    this.colliders = {};    // The key of the dict will be the object ID of the object this collision component belongs to
    this.objectIDToAssign = -1;  // probably belongs in the base class.

    this.quadTree = null;
}

CollisionManager.prototype = Object.create(GameObject.prototype);
CollisionManager.prototype.constructor = CollisionManager;

CollisionManager.prototype.initialize = function(initialRect) {
    // Initialize a QuadTree, starting at level/depth 0
    // NOTE: The max # of levels in the quadtree is defined in quadtree.js
    this.quadTree = new QuadTree(0, initialRect); // width/height should match canvas width/height (maybe just use the canvas object?)
}

CollisionManager.prototype.addCollider = function(collider) {
    this.objectIDToAssign += 1;
    collider.objectID = this.objectIDToAssign;
    this.colliders[this.objectIDToAssign] = collider;
}

CollisionManager.prototype.removeCollider = function(id) {
    if (id in this.colliders && this.colliders.hasOwnProperty(id)) {
        delete(this.colliders[id]);
    } else {
        // NOTE: might not want to keep this log message long-term, but during development/testing, it's ok
        console.log("Attempted to remove from CollisionManager.colliders an item that does not exist");
    }
}

CollisionManager.prototype.update = function(dt_s, configObj) {
    // TODO implement -- the update function should call into a quadtree update (broad phase), and then individual collision tests possibly

    this.quadTree.clear();

    // Populate the quadtree
    for (var collKey in this.colliders) {
        if (this.colliders.hasOwnProperty(collKey)) {
            var collObj = this.colliders[collKey];
            this.quadTree.insert(collObj);
        }
    }

    // For each collider, query the quadtree to determine which other objects it could be colliding with
    // TODO improve this loop; currently, this would test, e.g. obj 0 against obj 1; then later, obj 1 against obj 0
    for (var collKey in this.colliders) {
        if (this.colliders.hasOwnProperty(collKey)) {
            var collObj = this.colliders[collKey];
            var candidates = [];
            this.quadTree.retrieve(candidates, collObj);

            for (var candidate of candidates) {
                if (this.isColliding(collObj, candidate)) {
                    console.log("Collision detected!");
                }
            }
        }
    }


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
