import * as THREE from 'three';
import SceneManager from './sceneManager.js';
import createPremiseScene from './scenes/premiseScene.js';
import createSceneA from './scenes/sceneA.js';
import createLavanderiaScene from './scenes/lavanderiaScene.js';

let stepScroller = null;
let textboxes = null;
let rotationState = null;

async function loadSceneContent(sceneName) {
  const res = await fetch('../src/text/texts.json');
  const data = await res.json();

  const scene = data[sceneName];
  if (!scene) return;

  // Insert BEFORE the Three.js app
  const app = document.getElementById("app");

  scene.contentBlocks.forEach(block => {
    const wrapper = document.createElement("div");
    wrapper.className = "content";

    // alert element
    const alert = document.createElement("div");
    alert.className = block.alertClass || "alert fade-out";

    // textbox element
    const textbox = document.createElement("div");
    textbox.className = block.textboxClass || "textbox fade-in anchor";
    textbox.innerHTML = block.html;

    wrapper.appendChild(alert);
    wrapper.appendChild(textbox);

    // important: append ABOVE #app to keep layout
    app.parentNode.insertBefore(wrapper, app);
  });
}


// ============================
// Mount WebGL renderer
// ============================
const mount = document.getElementById('app') || document.body;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.setClearColor( 0xffffff, 1 );
mount.appendChild(renderer.domElement);

// ============================
// Scene manager
// ============================
const manager = new SceneManager(renderer);
manager.register('Premise', createPremiseScene);
manager.register('sceneA', createSceneA);
manager.register('Lavanderia', createLavanderiaScene);

// ============================
// Simple on-screen menu
// ============================
const menuToggle = document.createElement('button');
menuToggle.className = 'scene-menu-toggle';
document.body.appendChild(menuToggle);

menuToggle.addEventListener('click', () => {
  menu.classList.toggle('hide');
});

const menu = document.createElement('div');
menu.className = 'scene-menu';
menu.innerHTML = `
  <h1>Memories-Hub</h1>
  <button data-scene="Premise"><h2>Premise</h2></button>
  <button data-scene="sceneA"><h2>Fitting a Cat in a Klein Bottle</h2></button>
  <button data-scene="Lavanderia"><h2>Lavanderia</h2></button>
  <button data-scene="sceneA"><h2>Rectangles</h2></button>
  <button data-scene="sceneA"><h2>Semionde</h2></button>
  <button data-scene="sceneA"><h2>Conclusion</h2></button>
  <button class="about-button"><h2>About</h2></button>
`;
menu.classList.add('hide');
document.body.appendChild(menu);

const aboutus = document.createElement('div');
aboutus.className = 'about-us';
aboutus.innerHTML = `
  <h1>About</h1>
  <h3>This project was created by <a href="https://github.com/turanoiacopo/" target="_blank">Iacopo Turano</a> and <a href="https://marcostalder.framer.website/" target="_blank">Marco Stalder</a> as part of the HS25.STORY course at HSLU.</h3>
  <br><h3>------------------------------------</h3>
  <h3>More information about them can be found here:</h3>
  <br>
  <h3>Iacopo Turano (Writing / Storytelling): <a href="https://github.com/turanoiacopo/" target="_blank">Github</a></h3>
  <br>
  <h3>Marco Stalder (Design / Visuals): <a href="https://marcostalder.framer.website/" target="_blank">Portfolio</a> / <a href="https://instagram.com/zulate/" target="_blank">Instagram</a></h3>
  <br><h3>------------------------------------</h3>
  <h3>Also, big thanks to our lecturer <a href="https://kontrast.ch/hofer/" target="_blank">Susanne Hofer</a> for her support!</h3>
  <br><h3>------------------------------------</h3>
  <button><h2>Back to the Project</h2></button>
`;
document.body.appendChild(aboutus);

const menuSelector = document.createElement('div');
menuSelector.className = 'scene-menu-selector';
document.querySelector('.scene-menu').appendChild(menuSelector);

// MOUSE OVER MENU SELECTOR

menu.addEventListener('mouseover', (e) => {
  const btn = e.target.closest('button');
  if (!btn){
    document.querySelector('.scene-menu-selector').style.opacity = '0';
    return;
  }
  document.querySelector('.scene-menu-selector').style.opacity = '1';
  const rect = btn.getBoundingClientRect();
  menuSelector.style.top = `${rect.top}px`;
});

aboutus.addEventListener('mouseover', (e) => {
  const btn = e.target.closest('button');
  if (!btn){
    menuSelector.style.opacity = '0';
    menuSelector.style.top = `110vh`;
    return;
  }
  menuSelector.style.opacity = '1';
  const rect = btn.getBoundingClientRect();
  menuSelector.style.top = `${rect.top}px`;
});

// ENTER ABOUT US

menu.addEventListener('click', (e) => {
  const aboutBtn = e.target.closest('button.about-button');
  if (!aboutBtn) return;
  aboutus.classList.add('show');
  menuSelector.style.opacity = '0';
  document.querySelector('.about-us').appendChild(menuSelector);
});

// LEAVE ABOUT US

aboutus.addEventListener('click', (e) => {
  const closeAboutBtn = e.target.closest('button');
  if (!closeAboutBtn) return;
  aboutus.classList.remove('show');
  document.querySelector('.scene-menu-selector').style.opacity = '0';
  document.querySelector('.scene-menu').appendChild(menuSelector);
});

// ENTER SELECTED SCENE

menu.addEventListener('click', (e) => {
  const btn = e.target.closest('button[data-scene]');
  if (!btn) return;
  const name = btn.getAttribute('data-scene');
  showSceneWithFade(name).catch(err => console.error('show scene error', err));
  menu.classList.add('hide');
});

// ============================
// Fullscreen overlay for fade transitions
// ============================
const overlay = document.createElement('div');
overlay.style.position = 'fixed';
overlay.style.left = '0';
overlay.style.top = '0';
overlay.style.width = '100%';
overlay.style.height = '100%';
overlay.style.background = '#000';
overlay.style.pointerEvents = 'none';
overlay.style.opacity = '0';
overlay.style.transition = 'opacity 800ms ease';
overlay.style.zIndex = '9998';
document.body.appendChild(overlay);

function fadeInOverlay(duration = 800) {
  return new Promise((resolve) => {
    overlay.style.transition = `opacity ${duration}ms ease`;
    requestAnimationFrame(() => { overlay.style.opacity = '1'; });
    const onEnd = (e) => {
      if (e && e.propertyName !== 'opacity') return;
      overlay.removeEventListener('transitionend', onEnd);
      resolve();
    };
    overlay.addEventListener('transitionend', onEnd);
    setTimeout(resolve, duration + 50);
  });
}

function fadeOutOverlay(duration = 800) {
  return new Promise((resolve) => {
    overlay.style.transition = `opacity ${duration}ms ease`;
    requestAnimationFrame(() => { overlay.style.opacity = '0'; });
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
  await fadeInOverlay(750);

  // remove the previous text blocks
  document.querySelectorAll(".content").forEach(el => el.remove());

  await loadSceneContent(name);

  textboxes = document.querySelectorAll('.textbox');
  rotationState = Array.from(textboxes).map(() => ({ x:0, y:0, z:0 }));

  textboxes.forEach(tb => observer.observe(tb));
  document.querySelectorAll(".alert.fade-out").forEach(disel => observer2.observe(disel));

  if (stepScroller) {
    window.removeEventListener("wheel", stepScroller.onWheel);
    window.removeEventListener("touchmove", stepScroller.onTouchMove);
    window.removeEventListener("touchstart", stepScroller.onTouchStart);
  }

  stepScroller = new StepScroller(".anchor");

  await manager.show(name);
  await fadeOutOverlay(750);
}

// ============================
// Forward pointer events to active scene
// ============================
const canvas = renderer.domElement;
window.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const inside = e.clientX >= rect.left && e.clientX <= rect.right &&
                 e.clientY >= rect.top && e.clientY <= rect.bottom;
  if (!inside) return;
  if (manager.active && manager.active.instance?.onPointerMove) {
    manager.active.instance.onPointerMove(e.clientX, e.clientY);
  }
}, { passive: true });

window.addEventListener('touchmove', (e) => {
  if (!e.touches || e.touches.length === 0) return;
  const t = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const inside = t.clientX >= rect.left && t.clientX <= rect.right &&
                 t.clientY >= rect.top && t.clientY <= rect.bottom;
  if (!inside) return;
  if (manager.active && manager.active.instance?.onPointerMove) {
    manager.active.instance.onPointerMove(t.clientX, t.clientY);
  }
}, { passive: true });

window.addEventListener('wheel', (e) => {
  if (manager.active && manager.active.instance?.onWheel) {
    manager.active.instance.onWheel(e);
    e.preventDefault();
  }
}, { passive: false });

// ============================
// Handle window resize
// ============================
function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h);
  manager.resize(w, h);
}
window.addEventListener('resize', onResize);

// ============================
// Start first scene Initial
// ============================
manager.show('Lavanderia').catch(err => console.error(err));

// ============================
// Main loop
// ============================
function loop() {
  requestAnimationFrame(loop);
  manager.update();
}
loop();

// ============================
// IntersectionObserver for appear + rotation
// ============================
textboxes = document.querySelectorAll('.textbox');
rotationState = Array.from(textboxes).map(() => ({ x: 0, y: 0, z: 0 }));
let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

window.addEventListener('mousemove', (e) => { mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener('touchmove', (e) => {
  if (!e.touches || e.touches.length === 0) return;
  mouse.x = e.touches[0].clientX;
  mouse.y = e.touches[0].clientY;
}, { passive: true });

function lerp(a, b, t) { return a + (b - a) * t; }

function updateTextboxesRotation() {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  textboxes.forEach((tb, i) => {
    const rect = tb.getBoundingClientRect();
    const rectCenterX = rect.left + rect.width / 2;
    const rectCenterY = rect.top + rect.height / 2;

    const targetX = -(mouse.y - centerY + (rectCenterX / 10000)) / 16;
    const targetY = (mouse.x - centerX + (rectCenterY / 10000)) / 32;

    rotationState[i].x = lerp(rotationState[i].x, targetX, 0.1);
    rotationState[i].y = lerp(rotationState[i].y, targetY, 0.1);

    const baseTransform = tb.dataset.baseTransform || '';
    tb.style.transform = `${baseTransform} rotate3d(1,0,0,${rotationState[i].x}deg) rotate3d(0,1,0,${rotationState[i].y}deg)`;

  });

  requestAnimationFrame(updateTextboxesRotation);
}
updateTextboxesRotation();

const observer = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const el = entry.target;
      el.classList.add("appear");

      // Store base transform for rotation
      const style = window.getComputedStyle(el);
      el.dataset.baseTransform = style.transform === 'none' ? '' : style.transform;

      observer.unobserve(el);
    }
  });
}, {
  root: null,
  threshold: 0,
  rootMargin: "-50% 0px -50% 0px"
});
document.querySelectorAll(".fade-in").forEach(el => observer.observe(el));

const observer2 = new IntersectionObserver((entries, observer) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const disel = entry.target;
      disel.classList.add("disappear");

      observer.unobserve(disel);
    }
  });
}, {
  root: null,
  threshold: 0,
  rootMargin: "-50% 0px -50% 0px"
});
document.querySelectorAll(".fade-out").forEach(disel => observer2.observe(disel));

// ============================
// StepScroller for guided scrolling
// ============================
class StepScroller {
  constructor(selector = ".anchor") {
    this.anchors = Array.from(document.querySelectorAll(selector));
    this.current = 0;
    this.isAnimating = false;
    this.scrollDuration = 1400;

    if (!this.anchors.length) return;
    setTimeout(() => this.scrollToAnchor(0), 20);

    this.bindEvents();
  }

  bindEvents() {
    window.addEventListener("wheel", this.onWheel, { passive: false });
    window.addEventListener("touchstart", this.onTouchStart, { passive: true });
    window.addEventListener("touchmove", this.onTouchMove, { passive: false });
  }

  onTouchStart = (e) => { this.touchStartY = e.touches[0].clientY; };

  onTouchMove = (e) => {
    if (this.isAnimating) { e.preventDefault(); return; }
    const delta = this.touchStartY - e.touches[0].clientY;
    if (Math.abs(delta) < 20) return;
    e.preventDefault();
    if (delta > 0) this.next(); else this.prev();
  };

  onWheel = (e) => {
    if (this.isAnimating) { e.preventDefault(); return; }
    e.preventDefault();
    if (e.deltaY > 0) this.next(); else this.prev();
  };

  next() { if (this.current < this.anchors.length - 1) this.scrollToAnchor(this.current + 1); }
  prev() { if (this.current > 0) this.scrollToAnchor(this.current - 1); }

  scrollToAnchor(index) {
    if (this.isAnimating) return;
    this.isAnimating = true;
    this.current = index;

    const target = this.anchors[index];
    const startY = window.scrollY;
    const rect = target.getBoundingClientRect();
    const targetY = startY + rect.top - window.innerHeight / 2 + rect.height / 2;

    const duration = this.scrollDuration;
    const startTime = performance.now();
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const animate = () => {
      const now = performance.now();
      const t = Math.min(1, (now - startTime) / duration);
      const eased = easeOutCubic(t);
      const newY = startY + (targetY - startY) * eased;
      window.scrollTo(0, newY);

      if (t < 1) requestAnimationFrame(animate);
      else this.isAnimating = false;
    };

    animate();
  }
}