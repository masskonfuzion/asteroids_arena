function uiItemBase() {
    this.cmd = null;                // maybe add a function to set the command.. whatever needs to happen
    this.boundObj = null;           // Object that contains configs/settings/whatever that this UI item is bound to
    this.boundKey = "";             // key/path to settings/config item that this item is bound to
    this.boundVal = null;
}


uiItemBase.prototype.draw = function(canvasContext) {
    throw new Error("Function must be implemented by subclass");
};

uiItemBase.prototype.getWidth = function() {
    throw new Error("Function must be implemented by subclass");
};

uiItemBase.prototype.setBoundObj = function(obj) {
    // Set a reference to the object that this UI item is bound to
    this.boundObj = obj;
};

uiItemBase.prototype.setBoundKey = function(key) {
    // Set the path to the bound data
    // ideally should be a simple key, like "myData"
    // So the idea is that this.boundObj[this.boundKey] gives you access to the data
    this.boundKey = key
};

uiItemBase.prototype.setBoundValue = function(value) {
    // Set the value
    this.boundObj[this.boundKey] = value
};


uiItemBase.prototype.getBoundValue = function() {
    return this.boundObj[this.boundKey];
}; 

