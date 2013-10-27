
function start() {
  if(depthCanvas && diffuseCanvas) {
    setup(diffuseCanvas, depthCanvas);
  }
}

var depthCanvas;
var diffuseCanvas;
var renderer = html2canvas(document.body, {
  onparsed: function(queue){
    window.setTimeout(function() {
      depthCanvas = renderer.render(queue, {renderer: html2canvasDepthRenderer});
      start();
    }, 0);
  },
  onrendered: function(canvas) {
    diffuseCanvas = canvas;
    start();
  }
});


var container, stats;

var camera, scene, renderer;
var mesh;

function setup(diffuseCanvas, depthCanvas) {
  var diffuseData = diffuseCanvas.getContext("2d").getImageData(0, 0, diffuseCanvas.width, diffuseCanvas.height).data;
  var depthData = depthCanvas.getContext("2d").getImageData(0, 0, depthCanvas.width, depthCanvas.height).data;

  container = document.body;

  var len = diffuseData.length, i, triangles = 0, prevColor, color, depth, prevDepth, colorsPerRow = diffuseCanvas.width * 4;
  for (i = 0; i < len; i+=4) {
    if (i % colorsPerRow === 0) {
      prevColor = -1;
    }
    depth = depthData[i];
    color = (diffuseData[i] << 16) | (diffuseData[i + 1] << 8) | (diffuseData[i + 2]);

    //vertical
    if (i - colorsPerRow > 0 && depthData[i - colorsPerRow] !== depth) {
      triangles += 2;
    }

    //horizontal
    if (i % colorsPerRow > 0 && depthData[i - 4] !== depth) {
      triangles += 2;
    }

    if (color !== prevColor || depth !== prevDepth) {
      triangles += 2;
      prevColor = color;
      prevDepth = depth;
    }
  }

  console.log(triangles);

  camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 35000 );
  camera.position.z = -1350;
  camera.rotateZ(Math.PI);
  camera.rotateY(Math.PI);

  scene = new THREE.Scene();
  scene.fog = new THREE.Fog( 0x050505, 2000, 3500 );


  scene.add( new THREE.AmbientLight( 0x444444 ) );


  var light2 = new THREE.HemisphereLight( 0x0101ff, 0x000000, 0.1 );
  scene.add( light2 );


  var geometry = new THREE.BufferGeometry();

  geometry.addAttribute('position', Float32Array, triangles * 3, 3);
  geometry.addAttribute('color', Float32Array, triangles * 3, 3);

  var positions = geometry.attributes.position.array;
  var colors = geometry.attributes.color.array;

  var pA = new THREE.Vector3();
  var pB = new THREE.Vector3();
  var pC = new THREE.Vector3();

  var cb = new THREE.Vector3();
  var ab = new THREE.Vector3();

  var depthScale = -15;
  var p = 0, x , y, z, ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz, ex, ey, ez, hx, hy, hz, r, g, b, faceX, faceY, faceZ, shadow, r2, g2, b2;

  function addFace(r,g,b, x1, y1, z1, x2, y2, z2, x3, y3, z3, x4, y4, z4) {
    addTriangle(p, r, g, b, x1, y1, z1, x2, y2, z2, x3, y3, z3);
    p+=9;
    addTriangle(p, r, g, b, x3, y3, z3, x2, y2, z2, x4, y4, z4);
    p+=9;
  }

  for (i = 0; i < len; i+=4) {
    if (i % colorsPerRow === 0) {
      prevColor = -1;
    }
    color = (diffuseData[i] << 16) | (diffuseData[i + 1] << 8) | (diffuseData[i + 2]);
    depth = depthData[i] * depthScale;

    //vertical
    if (i - colorsPerRow > 0 && depthData[i - colorsPerRow] !== depthData[i]) {
      faceX = (i % colorsPerRow) / 4;
      faceY = ((i-4) - faceX) / colorsPerRow;
      shadow = (depthData[i - colorsPerRow] > depthData[i]) ? 0x50 : 0x5;
      r2 = (((depthData[i - colorsPerRow] < depthData[i]) ? diffuseData[i] : diffuseData[i - colorsPerRow]) + shadow) / 2;
      g2 = (((depthData[i - colorsPerRow] < depthData[i]) ? diffuseData[i + 1] : diffuseData[i - colorsPerRow + 1]) + shadow) / 2;
      b2 = (((depthData[i - colorsPerRow] < depthData[i]) ? diffuseData[i + 2] : diffuseData[i - colorsPerRow + 2]) + shadow) / 2;
      addFace(r2, g2, b2,
        faceX,     faceY, depthData[i] * depthScale,
        faceX + 1, faceY, depthData[i] * depthScale,
        faceX,     faceY, depthData[i - colorsPerRow] * depthScale,
        faceX + 1, faceY, depthData[i - colorsPerRow] * depthScale);
    }

    //horizontal
    if (i % colorsPerRow > 0 && depthData[i - 4] !== depthData[i]) {
      faceX = (i % colorsPerRow) / 4;
      faceY = ((i-4) - faceX) / colorsPerRow;
      shadow = (depthData[i - 4] > depthData[i]) ? 0x50 : 0x5;
      r2 = (((depthData[i - 4] < depthData[i]) ? diffuseData[i] : diffuseData[i - 4]) + shadow) / 2;
      g2 = (((depthData[i - 4] < depthData[i]) ? diffuseData[i + 1] : diffuseData[i - 3]) + shadow) / 2;
      b2 = (((depthData[i - 4] < depthData[i]) ? diffuseData[i + 2] : diffuseData[i - 2]) + shadow) / 2;
      addFace(r2, g2, b2,
        faceX, faceY,     depthData[i] * depthScale,
        faceX, faceY + 1, depthData[i] * depthScale,
        faceX, faceY,     depthData[i - 4] * depthScale,
        faceX, faceY + 1, depthData[i - 4] * depthScale);
    }

    if (color !== prevColor || depth !== prevDepth) {
      prevColor = color;
      prevDepth = depth;

      if (i > 0) {
        x = ((i-4) % colorsPerRow) / 4;
        y = ((i-4) - x) / colorsPerRow;
        z = az;
        bx = x + 1;

        hx = x + 1;
        hy = y + 1;
        hz = z;

        addFace(r, g, b, ax, ay, az, bx, by, bz, cx, cy, cz, hx, hy, hz);
      }

      r = diffuseData[i];
      g = diffuseData[i+1];
      b = diffuseData[i+2];

      x = (i % colorsPerRow) / 4;
      y = (i - x) / colorsPerRow;
      z = depth;

      ax = x;
      ay = y;
      az = z;

      by = y;
      bz = z;

      cx = x;
      cy = y + 1;
      cz = z;
    }
  }

  function addTriangle(p, r, g, b, ax, ay, az, bx, by, bz, cx, cy, cz) {
    positions[ p ]     = ax;
    positions[ p + 1 ] = ay;
    positions[ p + 2 ] = az;

    positions[ p + 3 ] = bx;
    positions[ p + 4 ] = by;
    positions[ p + 5 ] = bz;

    positions[ p + 6 ] = cx;
    positions[ p + 7 ] = cy;
    positions[ p + 8 ] = cz;

    colors[ p ]     = r;
    colors[ p + 1 ] = g;
    colors[ p + 2 ] = b;

    colors[ p + 3 ] = r;
    colors[ p + 4 ] = g;
    colors[ p + 5 ] = b;

    colors[ p + 6 ] = r;
    colors[ p + 7 ] = g;
    colors[ p + 8 ] = b;
  }

  geometry.computeBoundingSphere();
  THREE.GeometryUtils.center(geometry);

  var material = new THREE.MeshBasicMaterial({color: 0x010101, ambient: 0x010101, vertexColors: THREE.VertexColors, side: THREE.DoubleSide});
  mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);


  renderer = new THREE.WebGLRenderer( { antialias: false, alpha: false } );
  renderer.setClearColor( scene.fog.color, 1 );
  renderer.setSize( window.innerWidth, window.innerHeight );

  renderer.gammaInput = true;
  renderer.gammaOutput = true;
  renderer.physicallyBasedShading = true;

  container.appendChild( renderer.domElement );

  window.addEventListener( 'resize', onWindowResize, false );
  animate();

}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
  requestAnimationFrame( animate );
  render();
}

function render() {
  var time = Date.now() * 0.001;
  //mesh.rotation.x = time * 0.25;
  mesh.rotation.y = time * 0.5;
  renderer.render( scene, camera );
}