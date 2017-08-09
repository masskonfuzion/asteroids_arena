function GameObject () {
    this.components = {};
}

GameObject.prototype.addComponent = function(compType, compObj) {
    compObj.parentObj = this;  // Set parent obj. Felt like overkill to make a function in the component class, so it's done here

    // For simplicity, compType will be a string (like "render" or "physics")
    this.components[compType] = compObj;
}

GameObject.prototype.getComponent = function(compType) {
    if (compType in this.components && this.components.hasOwnProperty(compType)) {
        return this.components[compType];
    }

    return null;
}
