function uiItemText(text, size, fontFamily, color, ndcX, ndcY, align) {
    // uiItemText can be a label (i.e. item cannot trigger actions) or a button (i.e. item can trigger actions)
    this.size = size;               // Can be whatever CSS will accept  - must be defined somewhere in the scope of the game
    this.font = fontFamily;         // this should be the str as called by the canvasContext, e.g. "18px FontName"
    this.align = align == null ? "left" : align;    // can be "left", "center", or "right"
    this.color = color;             // can be words (e.g. "white") or rgb codes (e.g. "#ffffff")
    this.posNDC = [ndcX, ndcY];
    this.text = text;
    this.cmd = null;                // maybe add a function to set the command.. whatever needs to happen
}

uiItemText.prototype = Object.create(uiItemBase.prototype);
uiItemText.prototype.constructor = uiItemText;

uiItemText.prototype.draw = function(canvasContext) {
    // TODO figure out text alignment -- might be able to use a native canvas call? research
    canvasContext.font = this.size + " " + this.font;
    canvasContext.fillStyle = this.color;
    canvasContext.textAlign = this.align;
    canvasContext.fillText(this.text, MathUtils.lerp(this.posNDC[0], 0, canvasContext.canvas.width), MathUtils.lerp(this.posNDC[1], 0, canvasContext.canvas.height));
    
};
