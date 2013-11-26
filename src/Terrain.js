function Terrain() {
  var depthCanvas = new Bacon.Bus();
  var diffuseCanvas = new Bacon.Bus();

  var renderer = html2canvas(document.body, {
    extension: true,
    onparsed: function(queue){
      window.setTimeout(function() {
        depthCanvas.push(renderer.render(queue, {renderer: html2canvasDepthRenderer}));
      }, 0);
    },
    onrendered: function(canvas) {
      diffuseCanvas.push(canvas);
    }
  });

  return Bacon.combineTemplate({
    mesh: diffuseCanvas.zip(depthCanvas, generateMapMesh),
    diffuse: diffuseCanvas,
    depth: depthCanvas.map(getData)
  });
}

function getData(canvas) {
  return canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
}

function generateMapMesh(diffuseCanvas, depthCanvas) {
  var diffuseData = getData(diffuseCanvas).data;
  var depthData = getData(depthCanvas).data;
  document.body.appendChild(diffuseCanvas);
  document.body.appendChild(depthCanvas);
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

  var geometry = new THREE.BufferGeometry();

  console.log(triangles, "triangles");
  console.log(triangles*3, "verticies");
  geometry.addAttribute('position', Float32Array, triangles * 3, 3);
  geometry.addAttribute('color', Float32Array, triangles * 3, 3);

  var positions = geometry.attributes.position.array;
  var colors = geometry.attributes.color.array;

  var depthScale = -15;
  var p = 0, x , y, z, ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz, r, g, b, faceX, faceY, shadow, r2, g2, b2, condition;

  function addFace(r,g,b, x1, y1, z1, x2, y2, z2, x3, y3, z3, x4, y4, z4) {
    addTriangle(positions, colors, p, r, g, b, x1, y1, z1, x2, y2, z2, x3, y3, z3);
    p+=9;
    addTriangle(positions, colors, p, r, g, b, x3, y3, z3, x2, y2, z2, x4, y4, z4);
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
      condition = (depthData[i - colorsPerRow] < depthData[i]);
      r2 = ((condition ? diffuseData[i] : diffuseData[i - colorsPerRow]) + shadow) / 2;
      g2 = ((condition ? diffuseData[i + 1] : diffuseData[i - colorsPerRow + 1]) + shadow) / 2;
      b2 = ((condition ? diffuseData[i + 2] : diffuseData[i - colorsPerRow + 2]) + shadow) / 2;
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
      shadow = (depthData[i - 4] > depthData[i]) ? 0x50 : -0x50;
      condition = (depthData[i - 4] < depthData[i]);
      r2 = ((condition ? diffuseData[i] : diffuseData[i - 4]) + shadow) / 2;
      g2 = ((condition ? diffuseData[i + 1] : diffuseData[i - 3]) + shadow) / 2;
      b2 = ((condition ? diffuseData[i + 2] : diffuseData[i - 2]) + shadow) / 2;
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

        dx = x + 1;
        dy = y + 1;
        dz = z;

        addFace(r, g, b, ax, ay, az, bx, by, bz, cx, cy, cz, dx, dy, dz);
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

  function addTriangle(positions, colors, p, r, g, b, ax, ay, az, bx, by, bz, cx, cy, cz) {
    positions[ p ]     = ax;
    positions[ p + 1 ] = ay;
    positions[ p + 2 ] = az;

    positions[ p + 3 ] = bx;
    positions[ p + 4 ] = by;
    positions[ p + 5 ] = bz;

    positions[ p + 6 ] = cx;
    positions[ p + 7 ] = cy;
    positions[ p + 8 ] = cz;

    colors[ p ]     = r / 255;
    colors[ p + 1 ] = g / 255;
    colors[ p + 2 ] = b / 255;

    colors[ p + 3 ] = r / 255;
    colors[ p + 4 ] = g / 255;
    colors[ p + 5 ] = b / 255;

    colors[ p + 6 ] = r / 255;
    colors[ p + 7 ] = g / 255;
    colors[ p + 8 ] = b / 255;
  }

  var uniforms = {
    gridLineThickness: {type: 'f', value: 0.0},
    fogFar: {type: 'f', value: -1.0}
  };

  var material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    attributes: {},
    vertexShader: Game.Shaders['terrain.vs'],
    fragmentShader: Game.Shaders['terrain.fs'],
    vertexColors: THREE.VertexColors,
    side: THREE.DoubleSide
  });

  geometry.computeBoundingSphere();
  var mesh = new THREE.Mesh(geometry, material);
  mesh.rotateX(-Math.PI / 2);
  mesh.rotateY(Math.PI);
  mesh.rotateZ(Math.PI);

  return mesh;
}