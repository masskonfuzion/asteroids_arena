function Arena () {
    GameObject.call(this);

    // TODO make arena a collection of render components and collision components
    // We want the arenas to be a contained in polygonal area. The polygon can be any shape (defined by an array of segments.. Or maybe vertex/edges)
    // We also need new collision geoms - line segments

    // In this early version, the arena will simply be a rectangle. We can use AABBs for the arena's boundaries (which will be 2 vertical and 2 horizontal)
    // If we continue into later versions, we should have a general polygonal shape; maybe use the separating axis theorem
    // TODO - implement hierarchical render objects, and hierarchical collision objects (see, e.g. falldown webgl?)

}

Arena.prototype = Object.create(GameObject.prototype);
Arena.prototype.constructor = Arena;

Arena.prototype.initialize = function () {
    // TODO add parameters later, to control how the arena is constructed; e.g., load from files or something
    this.addComponent( "render", new RenderComponentGroup() );

    var rcg = this.components["render"];

    // Add individual render components to the group
    // NOTE: I know this is verbose (I could write one-liners here, if the ctors had default params), but I want the ctors in this framework to do as _little_ as possible

    var lineLeft = new RenderComponentLine();
    lineLeft.setStartPt(0, 0);
    lineLeft.setEndPt(0, 720);
    lineLeft.setLineWidth(3);
    lineLeft.setColor(0, 128, 255);
    rcg.addGroupItem(lineLeft);

    // Note: "Bot" looks like the bottom, but has + coord values, because Y coordinates increase down the screen in Canvas
    var lineBot = new RenderComponentLine();
    lineBot.setStartPt(0, 720);
    lineBot.setEndPt(1280, 720);
    lineBot.setLineWidth(3);
    lineBot.setColor(0, 128, 255);
    rcg.addGroupItem(lineBot);

    var lineRight = new RenderComponentLine();
    lineRight.setStartPt(1280,720);
    lineRight.setEndPt(1280, 0);
    lineRight.setLineWidth(3);
    lineRight.setColor(0, 128, 255);
    rcg.addGroupItem(lineRight);
 
    var lineTop = new RenderComponentLine();
    lineTop.setStartPt(1280,0);
    lineTop.setEndPt(0, 0);
    lineTop.setLineWidth(3);
    lineTop.setColor(0, 128, 255);
    rcg.addGroupItem(lineTop);
}

Arena.prototype.draw = function(canvasContext) {
    this.components["render"].draw(canvasContext);
}
