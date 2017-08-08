function RenderComponentSprite() {
    // NOTE: We'll need to load all the images on the document.onload() -- so we might need an image manager (long-term), or to just simply has a list/array of image components we plan to draw, so we can check that they all loaded, and throw an error if any didn't
    this.img = null;
    this.imgLoaded = false;
    this.src = "";  // img src (file path) of image to load
}

RenderComponentSprite.prototype.draw = function(canvasContext, xCoord, yCoord) {
    canvasContext.drawImage(xCoord, yCoord);    // xCoord,yCoord must be passed in (probably from the physics component's position?)
}
