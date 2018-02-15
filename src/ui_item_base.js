function uiItemBase() {
    // Eh, a base class might be design overkill, but whatever
}


uiItemBase.prototype.draw = function(canvasContext) {
    throw new Error("Function must be implemented by subclass");
};
