function RenderComponentSprite() {
    GameObject.call(this);

    // NOTE: We'll need to load all the images on the document.onload() -- so we might need an image manager (long-term), or to just simply has a list/array of image components we plan to draw, so we can check that they all loaded, and throw an error if any didn't
    this.imgObj = null;
}

RenderComponentSprite.prototype = Object.create(GameObject.prototype);
RenderComponentSprite.prototype.constructor = RenderComponentSprite;


RenderComponentSprite.prototype.setImgObj = function(imgObj) {
    this.imgObj = imgObj;
}

RenderComponentSprite.prototype.draw = function(canvasContext, xCoord, yCoord) {
    // xCoord,yCoord must be passed in (probably from the physics component's position?)
    canvasContext.drawImage(this.imgObj, xCoord, yCoord);
}

RenderComponentSprite.prototype.update = function(dt_s) {
    // Override base GameObject class update(), but do nothing in this func
    // (unless we determine that something does need to be updated, in which case, update this comment :-D)
}


// TODO add a RenderComponentSphere, and possibly also a RenderComponentBox (draw using canvas graphics primitives), and maybe even also a RenderComponentAnimSprite (for sprite animation?)
