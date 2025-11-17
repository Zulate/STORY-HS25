import * as THREE from 'three';
import SceneManager from './sceneManager.js';
import createHomeScene from './scenes/homeScene.js';
import createSceneA from './scenes/sceneA.js';

// mount point for renderer
const mount = document.getElementById('app') || document.body;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
mount.appendChild(renderer.domElement);

// Scene manager
const manager = new SceneManager(renderer);
manager.register('home', createHomeScene);
manager.register('sceneA', createSceneA);

// Simple on-screen menu
const menu = document.createElement('div');
menu.style.position = 'fixed';
menu.style.right = '16px';
menu.style.top = '16px';
menu.style.background = 'rgba(0,0,0,0.5)';
menu.style.color = 'white';
menu.style.padding = '8px';
menu.style.borderRadius = '6px';
menu.style.zIndex = '9999';
menu.style.fontFamily = 'sans-serif';
menu.innerHTML = `
  <div style="margin-bottom:6px;font-weight:600">Scenes</div>
  <button data-scene="home">Home</button>
  <button data-scene="sceneA">Scene A</button>
`;
document.body.appendChild(menu);

menu.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-scene]');
  if (!btn) return;
  const name = btn.getAttribute('data-scene');
  // use fade transition when changing scenes
  showSceneWithFade(name).catch(err => console.error('show scene error', err));
});

// create a fullscreen overlay used for fade transitions
const overlay = document.createElement('div');
overlay.style.position = 'fixed';
overlay.style.left = '0';
overlay.style.top = '0';
overlay.style.width = '100%';
overlay.style.height = '100%';
overlay.style.background = '#000';
overlay.style.pointerEvents = 'none';
overlay.style.opacity = '0';
overlay.style.transition = 'opacity 400ms ease';
overlay.style.zIndex = '9998';
document.body.appendChild(overlay);

function fadeInOverlay(duration = 400) {
  return new Promise((resolve) => {
    overlay.style.transition = `opacity ${duration}ms ease`;
    // ensure visible
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
    });
    const onEnd = (e) => {
      if (e && e.propertyName !== 'opacity') return;
      overlay.removeEventListener('transitionend', onEnd);
      resolve();
    };
    overlay.addEventListener('transitionend', onEnd);
    // fallback in case transitionend doesn't fire
    setTimeout(resolve, duration + 50);
  });
}

function fadeOutOverlay(duration = 400) {
  return new Promise((resolve) => {
    overlay.style.transition = `opacity ${duration}ms ease`;
    requestAnimationFrame(() => {
      overlay.style.opacity = '0';
    });
    const onEnd = (e) => {
      if (e && e.propertyName !== 'opacity') return;
      overlay.removeEventListener('transitionend', onEnd);
      resolve();
    };
    overlay.addEventListener('transitionend', onEnd);
    setTimeout(resolve, duration + 50);
  });
}

async function showSceneWithFade(name) {
  // fade to black, switch scene, then fade back
  await fadeInOverlay(350);
  await manager.show(name);
  await fadeOutOverlay(350);
}

// Forward pointer events to active scene if it exposes handlers
const canvas = renderer.domElement;
window.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
  if (!inside) return;
  if (manager.active && manager.active.instance && manager.active.instance.onPointerMove) {
    manager.active.instance.onPointerMove(e.clientX, e.clientY);
  }
}, { passive: true });

window.addEventListener('touchmove', (e) => {
  if (!e.touches || e.touches.length === 0) return;
  const t = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const inside = t.clientX >= rect.left && t.clientX <= rect.right && t.clientY >= rect.top && t.clientY <= rect.bottom;
  if (!inside) return;
  if (manager.active && manager.active.instance && manager.active.instance.onPointerMove) {
    manager.active.instance.onPointerMove(t.clientX, t.clientY);
  }
}, { passive: true });

// Forward wheel to active scene if it handles it
window.addEventListener('wheel', (e) => {
  if (manager.active && manager.active.instance && manager.active.instance.onWheel) {
    manager.active.instance.onWheel(e);
    e.preventDefault();
  }
}, { passive: false });

function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  manager.resize(w, h);
}
window.addEventListener('resize', onResize);

// Start on the home scene
manager.show('home').catch(err => console.error(err));

// Main loop
function loop() {
  requestAnimationFrame(loop);
  manager.update();
}
loop();
