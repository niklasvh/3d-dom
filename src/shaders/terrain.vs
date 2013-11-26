varying vec3 vColor;
varying vec4 vPosition;

void main() {
    vColor = color;
    vec4 mvPosition;
    vPosition = vec4(position, 1.0);
    mvPosition = modelViewMatrix * vPosition;
    gl_Position = projectionMatrix * mvPosition;
}