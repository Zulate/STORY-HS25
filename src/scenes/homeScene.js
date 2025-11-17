import * as THREE from 'three';
import vert from '../shaders/cube_clean.vert?raw';
import frag from '../shaders/cube_clean.frag?raw';
import bgUrl from '../images/galaxy-night-view-bw-front.png';
import bgUrlBack from '../images/galaxy-night-view-bw-back.png';
import threeTone from '../images/threeTone.jpg';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { color } from 'three/tsl';

export default async function createHomeScene(renderer) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 3;

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth / 8, window.innerHeight / 8), 0.0, 1.0, 0.15);
  composer.addPass(bloom);

  // Background image as a 3D plane placed behind the scene to create parallax
  const loader = new THREE.TextureLoader();
  const loaderBack = new THREE.TextureLoader();
  const bgTexFront = loader.load(bgUrl);
  const bgTexBack = loaderBack.load(bgUrlBack)
  bgTexFront.encoding = THREE.sRGBEncoding;
  bgTexBack.encoding = THREE.sRGBEncoding;
  bgTexFront.minFilter = THREE.LinearFilter;
  bgTexBack.minFilter = THREE.LinearFilter;
  const bgMat = new THREE.MeshBasicMaterial({ map: bgTexFront, alphaMap: bgTexFront, transparent: true });
  const bgMatBack = new THREE.MeshBasicMaterial({ map: bgTexBack, alphaMap: bgTexBack, transparent: true });
  const bgGeo = new THREE.PlaneGeometry(20, 5 * (window.innerWidth / window.innerHeight));
  const bgGeoBack = new THREE.PlaneGeometry(20, 5 * (window.innerWidth / window.innerHeight));
  const bgMesh = new THREE.Mesh(bgGeo, bgMat);
  const bgMeshBack = new THREE.Mesh(bgGeoBack, bgMatBack);

  bgMeshBack.position.z = -1;
  bgMesh.position.z = 0;

  scene.add(bgMeshBack);
  scene.add(bgMesh);

  // --- Speed lines (cheap, GPU-driven) ---
  const PARTICLE_COUNT = 800; // tune: more = denser
  const FIELD_WIDTH = 40.0; // world units across which particles travel (wrap)

  const lineGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(PARTICLE_COUNT * 2 * 3); // placeholder, not used by CPU
  const basePos = new Float32Array(PARTICLE_COUNT * 2 * 3);
  const phase = new Float32Array(PARTICLE_COUNT * 2);
  const lenAttr = new Float32Array(PARTICLE_COUNT * 2);
  const offsetAttr = new Float32Array(PARTICLE_COUNT * 2);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    // random starting position inside field width
    const x0 = Math.random() * FIELD_WIDTH; // 0..FIELD_WIDTH
    const y = (Math.random() * 2 - 1) * 3.0; // vertical spread
    const z = (Math.random() * 2 - 1) * 2.0; // depth spread
    const length = 0.1 + Math.random() * 0.9; // line length
    const ph = Math.random() * FIELD_WIDTH;

    // two vertices per particle (start/end)
    const vi = i * 2;
    basePos[(vi + 0) * 3 + 0] = x0;
    basePos[(vi + 0) * 3 + 1] = y;
    basePos[(vi + 0) * 3 + 2] = z;
    basePos[(vi + 1) * 3 + 0] = x0;
    basePos[(vi + 1) * 3 + 1] = y;
    basePos[(vi + 1) * 3 + 2] = z;

    phase[vi + 0] = ph;
    phase[vi + 1] = ph;

    lenAttr[vi + 0] = length;
    lenAttr[vi + 1] = length;

    offsetAttr[vi + 0] = 0.0;
    offsetAttr[vi + 1] = 1.0;
  }

  lineGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  lineGeo.setAttribute('basePos', new THREE.BufferAttribute(basePos, 3));
  lineGeo.setAttribute('phase', new THREE.BufferAttribute(phase, 1));
  lineGeo.setAttribute('a_len', new THREE.BufferAttribute(lenAttr, 1));
  lineGeo.setAttribute('a_offset', new THREE.BufferAttribute(offsetAttr, 1));

  const lineVert = `
    attribute vec3 basePos;
    attribute float phase;
    attribute float a_len;
    attribute float a_offset;
    uniform float u_time;
    uniform float u_speed;
    uniform float u_speedFactor;
    uniform float u_fieldWidth;
    uniform float u_cullXMin;
    uniform float u_fadeRange;
    varying float vVis;
    void main() {
      float travel = mod(u_time * u_speed + phase, u_fieldWidth);
      vec3 pos = basePos;
      pos.x = pos.x - travel + a_offset * a_len * u_speedFactor;
      // visibility based on world X position (fade out when left of u_cullXMin)
      vVis = smoothstep(u_cullXMin, u_cullXMin + u_fadeRange, pos.x);
      vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
      gl_Position = projectionMatrix * mvPos;
    }
  `;

  const lineFrag = `
    uniform vec3 u_color;
    uniform float u_opacity;
    varying float vVis;
    void main() {
      gl_FragColor = vec4(u_color, u_opacity * vVis);
      if (gl_FragColor.a < 0.001) discard;
    }
  `;

  const lineMat = new THREE.ShaderMaterial({
    vertexShader: lineVert,
    fragmentShader: lineFrag,
    uniforms: {
      u_time: { value: 0.0 },
      u_speed: { value: 6.0 },
      u_speedFactor: { value: 1.0 },
      u_fieldWidth: { value: FIELD_WIDTH },
      u_cullXMin: { value: camera.position.x - FIELD_WIDTH * 4.0 - 2.0 },
      u_fadeRange: { value: 2.0 },
      u_color: { value: new THREE.Color(0x000000) },
      u_opacity: { value: 1.0 }
    },
    transparent: true,
    blending: THREE.NormalBlending,
    depthWrite: false,
    depthTest: true
  });

  const lines = new THREE.LineSegments(lineGeo, lineMat);
  scene.add(lines);

  const uniforms = {
    u_time: { value: 0.0 },
    u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
  };

    const mat = new THREE.MeshToonMaterial({});
    const toneMap = loader.load(threeTone);
    mat.color = new THREE.Color(0x2b2b2b);
    mat.gradientMap = toneMap;
    mat.gradientMap.minFilter = THREE.NearestFilter;
    mat.gradientMap.magFilter = THREE.NearestFilter;

    const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    const mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);

    const pointLight = new THREE.PointLight(0xffffff, 20.0);
    pointLight.position.set(1.0, 2.0, 1.0);

  // camera subtle offsets
  let targetCamX = 0, targetCamY = 0;
  const MOUSE_CAMERA_SENSITIVITY = 0.6;

  function onPointerMove(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    const nx = (x / rect.width) * 2 - 1;
    const ny = -((y / rect.height) * 2 - 1);
    targetCamX = nx * MOUSE_CAMERA_SENSITIVITY;
    targetCamY = ny * MOUSE_CAMERA_SENSITIVITY;
  }

  function resize(w, h) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    uniforms.u_resolution.value.set(w, h);
    composer.setSize(w, h);
    // compute world-space size of a plane at BG_DISTANCE so it exactly fills camera frustum
    const vFov = THREE.MathUtils.degToRad(camera.fov); // vertical fov in radians
    const height = 2 * Math.tan(vFov / 2) * Math.abs(BG_DISTANCE - camera.position.z);
    const width = height * camera.aspect;
  }

  function animate(dt) {
    // advance shader time for cube
    uniforms.u_time.value += dt;


    // camera follows subtle target
    camera.position.x += (targetCamX - camera.position.x) * 0.08;
    camera.position.y += (targetCamY - camera.position.y) * 0.08;
    camera.lookAt(0, 0, 0);

    // use a fixed visual speed and blur factor (no camera-velocity)
    const visualSpeed = 4.0;
    lineMat.uniforms.u_time.value += dt;
    lineMat.uniforms.u_speed.value = visualSpeed;
    lineMat.uniforms.u_speedFactor.value = 1.0;
    // update cull min so particles that moved far left are faded out
    if (lineMat.uniforms.u_cullXMin) {
      lineMat.uniforms.u_cullXMin.value = camera.position.x - FIELD_WIDTH * 0.5 - 2.0;
    }

    composer.render();
  }

  return {
    init() {},
    start() {},
    stop() {},
    dispose() {
      try {
        // dispose composer
        if (composer && composer.dispose) composer.dispose();

        // background
        if (bgMesh) {
          scene.remove(bgMesh);
        }
        if (bgTex) bgTex.dispose();
        if (bgMat) bgMat.dispose();
        if (bgGeo) bgGeo.dispose && bgGeo.dispose();

        // lines
        if (lines) scene.remove(lines);
        if (lineGeo) lineGeo.dispose();
        if (lineMat) lineMat.dispose();

        // mesh
        if (mesh) {
          scene.remove(mesh);
          if (mesh.geometry) mesh.geometry.dispose();
          if (mesh.material) mesh.material.dispose();
        }
      } catch (e) {
        console.warn('error disposing homeScene resources', e);
      }
    },
    onPointerMove,
    resize,
    animate
  };
}
