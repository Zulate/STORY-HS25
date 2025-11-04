// Basic Three.js starter for Vite with wheel-based rotation (X and Y axes)
import * as THREE from 'three';
import vert from './shaders/cube.vert?raw';
import frag from './shaders/cube.frag?raw';

// Find mount point; fall back to body if not present
const mount = document.getElementById('app');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 3;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
if (mount) {
  mount.appendChild(renderer.domElement);
} else {
  document.body.appendChild(renderer.domElement);
}

// Simple cube
const geometry = new THREE.BoxGeometry(1, 1, 1);

// Shader uniforms
const uniforms = {
  u_time: { value: 0.0 },
  u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
};

const shaderMat = new THREE.ShaderMaterial({
  vertexShader: vert,
  fragmentShader: frag,
  uniforms,
  side: THREE.DoubleSide
});

const cube = new THREE.Mesh(geometry, shaderMat);
scene.add(cube);

// --- Scroll-to-rotate state & configuration ---
let rotSpeedX = 0; // rotation velocity applied to cube.rotation.x
let rotSpeedY = 0; // rotation velocity applied to cube.rotation.y
const SCROLL_SENSITIVITY = 0.00025; // tuning: increase to make scrolling more aggressive
const DAMPING = 0.9; // per-frame damping (0-1) — lower = faster decay

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (uniforms && uniforms.u_resolution) uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize);

function onWheel(e) {
  // Prevent page scroll so wheel controls the cube.
  // We add rotation velocity based on wheel delta and let animate() decay it for smooth motion.

  // deltaY (vertical wheel) -> rotate around X axis (tilt up/down)
  // deltaX (horizontal wheel / two-finger swipe) -> rotate around Y axis (spin left/right)
  rotSpeedX += e.deltaY * SCROLL_SENSITIVITY;
  rotSpeedY += e.deltaX * SCROLL_SENSITIVITY;
}

// Use passive:false so we can call preventDefault() in the handler.
window.addEventListener('wheel', onWheel, { passive: false });
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);

  // Update shader time uniform
  uniforms.u_time.value = clock.getElapsedTime();

  // Apply velocity to rotation
  cube.rotation.x += rotSpeedX;
  cube.rotation.y += rotSpeedY;

  // Apply damping so movement slows down smoothly
  rotSpeedX *= DAMPING;
  rotSpeedY *= DAMPING;

  renderer.render(scene, camera);
}
animate();
