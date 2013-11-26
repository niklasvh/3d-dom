function Game() {
  if ( ! Detector.webgl ) Detector.addGetWebGLMessage();
  this.scene = new THREE.Scene();
  this.renderer = new THREE.WebGLRenderer({antialias: false, alpha: false});
  this.renderer.setSize(window.innerWidth, window.innerHeight);

  this.renderer.gammaInput = true;
  this.renderer.gammaOutput = true;
  this.renderer.physicallyBasedShading = true;

  this.player = new Player(this.renderer.domElement);

  this.renderer.domElement.setAttribute("data-html2canvas-ignore", true);
  this.composer = new THREE.EffectComposer(this.renderer);
  this.composer.addPass(new THREE.RenderPass(this.scene, this.player.camera));
  this.blurEffect = new THREE.ShaderPass(Game.RadialBlur);
  this.blurEffect.renderToScreen = true;
  this.composer.addPass(this.blurEffect);

  Bacon.fromEventTarget(window, "resize").assign(this, "resize");
  this.animate();
  var terrainStream = new Terrain();
  terrainStream.assign(this, "createMap");
  terrainStream.map(".mesh").assign(this.scene, "add");
  terrainStream.assign(this, "appendCanvas");
}

Game.prototype.createMap = function(terrain) {
  var texture = new THREE.Texture(terrain.diffuse);
  texture.needsUpdate = true;
  var hudMaterial = new THREE.SpriteMaterial({map: texture, useScreenCoordinates: true, alignment: THREE.SpriteAlignment.topLeft});
  this.hud = new THREE.Sprite(hudMaterial);
  var size = 150;

  this.player.setTerrain(terrain, hudMaterial, size);

  hudMaterial.uvScale.x = size / terrain.diffuse.width;
  hudMaterial.uvScale.y = size / terrain.diffuse.height;

  this.scene.add(this.hud);
  this.hud.scale.set(size, size, 1.0 );
  this.hud.position.set(window.innerWidth - size, 0, 0);
};

Game.prototype.appendCanvas = function() {
  document.body.style.overflow = "hidden";
  this.renderer.domElement.style.position = "absolute";
  this.renderer.domElement.style.top = "0";
  this.renderer.domElement.style.left = "0";
  this.renderer.domElement.style.zIndex = "9999999";

  while (document.body.firstChild) {
    document.body.removeChild(document.body.firstChild);
  }
  document.body.appendChild(this.renderer.domElement);
};

Game.prototype.resize = function() {
  this.player.camera.aspect = window.innerWidth / window.innerHeight;
  this.player.camera.updateProjectionMatrix();
  this.renderer.setSize(window.innerWidth, window.innerHeight);
};

Game.prototype.animate = function() {
  var self = this;
  requestAnimationFrame(function() {
    self.animate();
  });
  this.render();
};

Game.prototype.render = function() {
  var time = Date.now();
  this.player.update(time);
  if (!this.player.landed) {
    this.blurEffect.uniforms['sampleStrength'].value = -this.player.velocity.y/5;
    this.composer.render();
  } else {
    this.renderer.render(this.scene, this.player.camera);
  }
};

Game.Shaders = {};
