(function(glob) {
  var keyMap = {
    UP:    [new THREE.Vector2(0, -1), 38, 87],
    DOWN:  [new THREE.Vector2(0, 1),  40, 83],
    LEFT:  [new THREE.Vector2(-1, 0), 37, 65],
    RIGHT: [new THREE.Vector2(1, 0),  39, 68],
    JUMP: [true, 16, 17, 32]
  };

  function Player(element) {
    setupUpdateStream(this);
    this.camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 1, 35000);
    this.camera.position.x = window.innerWidth / 2;
    this.camera.position.z = window.innerHeight / 2;
    this.camera.position.y = 1970;
    this.camera.rotateZ(Math.PI);
    this.camera.rotateY(Math.PI);
    this.camera.rotation.x = -Math.PI / 2;
    this.direction = new THREE.Vector2(0, 0);
    this.speed = Bacon.constant(50);
    this.depth = new Bacon.Bus();
    this.gravity = 0;
    this.sensitivity = 0.5;
    this.landed = false;
    this.velocity = new THREE.Vector3(0, 0, 0);
    var lookTarget = Bacon.constant(new THREE.Vector3(0, 0, 0));
    var keysDown = Bacon.constant({UP: false, DOWN: false, LEFT: false, RIGHT: false, JUMP: false});

    var havePointerLock = 'pointerLockElement' in document || 'mozPointerLockElement' in document || 'webkitPointerLockElement' in document;

    if (havePointerLock) {
      Bacon.fromEventTarget(element, "click").onValue(function() {
        element.requestPointerLock = element.requestPointerLock || element.mozRequestPointerLock || element.webkitRequestPointerLock;
        element.requestPointerLock();
      });
    }

    var pointerLocked = Bacon.mergeAll(Bacon.fromEventTarget(document, "pointerlockchange"), Bacon.fromEventTarget(document, "mozpointerlockchange"), Bacon.fromEventTarget(document, "webkitpointerlockchange")).map(isPointerLocked).toProperty(false);
    var viewHalf = Bacon.fromEventTarget(window, "resize").toProperty(true).map(halfOfWindow);
    var mouse = Bacon.combineWith(mouseCoords, Bacon.fromEventTarget(document, "mousemove"), viewHalf, pointerLocked);
    Bacon.onValues(Bacon.fromEventTarget(document, "keydown").map(keyToDirection).filter(isTrue), keysDown, true, setDirectionState);
    Bacon.onValues(Bacon.fromEventTarget(document, "keyup").map(keyToDirection).filter(isTrue), keysDown, false, setDirectionState);
    Bacon.combineAsArray(this.updateStream.diff(Date.now(), diff), keysDown, this.speed, this.camera, mouse, lookTarget, this.depth.toProperty(), Bacon.constant(this)).sampledBy(this.updateStream).onValues(updatePlayer);
    mouse.sampledBy(this.updateStream).combine(pointerLocked, function(vector, locked) {
      if (locked) {
        vector.x = 0;
        vector.y = 0;
      }
    }).onValue(function() {});
  }

  Player.prototype.setTerrain = function(terrain, hud, size) {
    this.hudMaterial = hud;
    this.hudSize = size;
    this.terrain = terrain;
    this.camera.position.x = terrain.depth.width / 2;
    this.depth.push(terrain.depth);
    this.gravity = 5;
  };

  function isPointerLocked() {
    return (document.pointerLockElement || document.mozPointerLockElement || document.webkitPointerLockElement) !== null;
  }

  function mouseCoords(event, view, pointerLocked) {
    var movementX = pointerLocked ? (event.movementX || event.mozMovementX || event.webkitMovementX || 0) * 50 : event.pageX - view[0],
      movementY = pointerLocked ? (event.movementY || event.mozMovementY || event.webkitMovementY || 0) * 50 : event.pageY - view[1];
    return new THREE.Vector2(movementX, movementY);
  }

  function getPositionInDepth(depth, x, y) {
    return depth.data[Math.round(y) * depth.width * 4 + (Math.round(x) * 4)];
  }

  function getDepth(depth, origX, origY) {
    var depths = [];
    for (var y = (origY - (playerSize - 1)/2); y <= (origY + (playerSize - 1)/2); y++) {
      for (var x = (origX - (playerSize - 1)/2); x <= (origX + (playerSize - 1)/2); x++) {
        depths.push(getPositionInDepth(depth, x, y));
      }
    }

    return Math.max.apply(Math,  depths);
  }

  var lon = 0;
  var lat = 0;
  var depthScale = 15;
  var characterHeight = 10;
  var movementSteps = 20;
  var playerSize = 5;

  function applyFog(player, delta) {
    if (player.terrain.mesh.material.uniforms.fogFar.value < 700) {
      player.terrain.mesh.material.uniforms.fogFar.value += Math.min(delta / 10, 700);
    }
  }

  function movePlayer(movementVector, camera, depth) {
    var movementX = movementVector.x / movementSteps;
    var movementY = movementVector.y / movementSteps;

    for (var step = 0; step < movementSteps; step++) {
      camera.translateX(movementX);
      camera.translateZ(movementY);
      if (getDepth(depth, camera.position.x, camera.position.z) * depthScale + characterHeight >= camera.position.y + 1) {
        camera.translateX(-movementX);
        camera.translateZ(-movementY);
        break;
      }
    }
  }

  function updatePlayer(delta, directions, speed, camera, mouse, target, depthMap, player) {
    var movementVector = distanceMoved(delta, directions, speed);
    var velocity = player.velocity;
    mouse = mouse.clone();
    mouse.multiplyScalar(player.sensitivity);

    if (player.landed) {
      cameraMovement(mouse, delta, target, camera);
      applyFog(player, delta);
    } else {
      target.x = camera.position.x + velocity.y * 0.05 * Math.random();
      target.y = camera.position.y - 100;
      target.z = camera.position.z - 5 + velocity.y * 0.5;
      camera.lookAt(target);
    }

    velocity.y -= player.gravity * delta / 1000;

    var currentDepth = getDepth(depthMap, camera.position.x, camera.position.z);
    var currentDepthLevel = currentDepth * depthScale + characterHeight;
    movePlayer(movementVector, camera, depthMap);
    player.hudMaterial.uvOffset.x = (camera.position.x - (player.hudSize / 2)) / player.terrain.diffuse.width;
    player.hudMaterial.uvOffset.y = 1 - ((camera.position.z + (player.hudSize / 2)) / player.terrain.diffuse.height);
    if (Math.round(camera.position.y) <= currentDepthLevel && directions.JUMP) {
      velocity.y += 5;
    }

    camera.position.y = Math.max(camera.position.y + velocity.y, currentDepthLevel);
    if (camera.position.y === currentDepthLevel) {
      if (!player.landed) {
        player.terrain.mesh.material.uniforms.gridLineThickness.value = 1.8;
        player.terrain.mesh.material.uniforms.fogFar.value = 0.1;
      }
      player.landed = true;
      velocity.y = 0;
    }
  }

  function cameraMovement(mouse, delta, target, camera) {
    var verticalMin = 0.1;
    var verticalMax = 2.8;
    var lookSpeed = 0.125;
    var actualLookSpeed = delta * lookSpeed / 1000;
    var verticalLookRatio = Math.PI / (verticalMax - verticalMin);

    lon += mouse.x * actualLookSpeed;
    lat -= mouse.y * actualLookSpeed * verticalLookRatio;


    lat = Math.max(-85, Math.min( 85, lat));

    var theta = THREE.Math.degToRad(lon);
    var phi = THREE.Math.mapLinear(THREE.Math.degToRad(90 - lat), 0, Math.PI, verticalMin, verticalMax);

    target.x = camera.position.x + 100 * Math.sin(phi) * Math.cos(theta);
    target.y = camera.position.y + 100 * Math.cos(phi);
    target.z = camera.position.z + 100 * Math.sin(phi) * Math.sin(theta);
    camera.lookAt(target);
  }

  function halfOfWindow() {
    return [window.innerWidth / 2, window.innerHeight / 2];
  }

  function distanceMoved(diff, directions, speed) {
    return directionVector(directions).multiplyScalar((diff / 1000) * speed);
  }

  function directionVector(keysDown) {
    return Object.keys(keysDown).filter(function(key) {
      return !!keysDown[key] && /^(UP|DOWN|LEFT|RIGHT)$/.test(key);
    }).map(directionToVector).reduce(addVector, new THREE.Vector2(0, 0));
  }

  function addVector(a, b) {
    return a.add(b);
  }

  function setDirectionState(direction, keysDown, state) {
    keysDown[direction] = state;
  }

  function keyToDirection(event) {
    return Object.keys(keyMap).find(function(direction) {
      return keyMap[direction].indexOf(event.keyCode, 1) !== -1;
    });
  }

  function directionToVector(direction) {
    return keyMap[direction][0];
  }

  glob.Player = Player;
})(this);