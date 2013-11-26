Game.RadialBlur = {

  uniforms: {
    "tDiffuse": { type: "t", value: null },
    "sampleStrength": {type: "f", value: 6.8}
  },

  vertexShader: [

    "varying vec2 vUv;",

    "void main() {",

    "vUv = uv;",
    "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

    "}"

  ].join("\n"),

  fragmentShader: [
    "uniform sampler2D tDiffuse;",
    "varying vec2 vUv;",
    "const float sampleDist = 1.0;",
    "uniform float sampleStrength;",
    "float samples[10];",

    "void main() {",
    "samples[0] = -0.08;",
    "samples[1] = -0.05;",
    "samples[2] = -0.03;",
    "samples[3] = -0.02;",
    "samples[4] = -0.01;",
    "samples[5] = 0.01;",
    "samples[6] = 0.02;",
    "samples[7] = 0.03;",
    "samples[8] = 0.05;",
    "samples[9] = 0.08;",
    "vec2 dir = 0.5 - vUv;",
    "float dist = sqrt(dir.x*dir.x + dir.y*dir.y);",
    "dir = dir/dist;",
    "vec4 color = texture2D(tDiffuse,vUv);",
    "vec4 sum = color;",
    "for (int i = 0; i < 10; i++) {",
    "sum += texture2D(tDiffuse, vUv + dir * samples[i] * sampleDist );",
    "}",
    "sum *= 1.0/11.0;",
    "float t = dist * sampleStrength;",
    "t = clamp( t ,0.0,1.0);",
    "gl_FragColor = mix( color, sum, t );",
    "}"

  ].join("\n")





};