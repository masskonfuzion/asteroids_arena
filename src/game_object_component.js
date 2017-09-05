function GameObjectComponent() {
    GameObject.call(this);
    this.parentObj = null;
}

GameObjectComponent.prototype = Object.create(GameObject.prototype);
GameObjectComponent.prototype.constructor = GameObjectComponent;


