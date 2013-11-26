varying vec3 vColor;
varying vec4 vPosition;
uniform float gridLineThickness;
uniform float fogFar;
uniform float rgbShift;
float gridSize = 10.0;

void main() {
    gl_FragColor = vec4(vColor, 1.0);

    gl_FragColor = (mod(2.0+vPosition.y * gridSize, gridSize) < gridLineThickness || mod(2.0+vPosition.z * gridSize, gridSize) < gridLineThickness || mod(2.0+vPosition.x * gridSize, gridSize) < gridLineThickness) ?
        ((gl_FragColor.r < 0.1) && (gl_FragColor.g < 0.1) && (gl_FragColor.b < 0.1) ? gl_FragColor + 0.1 : gl_FragColor * 0.9)
        : gl_FragColor;

    vec3 fogColor = vec3(0.01, 0.01, 0.01);
    float fogNear = 0.0;

    float depth = gl_FragCoord.z / gl_FragCoord.w;
    float fogFactor = smoothstep(fogNear, fogFar, depth);
    if (fogFar > 0.0) {
      gl_FragColor = mix(gl_FragColor, vec4(fogColor, gl_FragColor.w), fogFactor);
    }
}