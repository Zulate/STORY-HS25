import * as THREE from 'three';
import bgUrl from '../images/galaxy-night-view-bw-front.png';
import bgUrlBack from '../images/galaxy-night-view-bw-back.png';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import threeTone from '../images/threeTone.jpg';


export default async function createPremiseScene(renderer) {

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 3;

  window.addEventListener( 'resize', onWindowResize );

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  let mesh, bgMesh, bgMeshBack, bgTexFront, bgTexBack, bgMat, bgMatBack, bgGeo, bgGeoBack;

  const loader = new THREE.TextureLoader();
  const toonLoader = new THREE.TextureLoader();

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
    const y = (Math.random() * 2 - 1) * 8.0; // vertical spread
    const z = (Math.random() * 2 - 1) * 8.0; // depth spread
    const length = 0.5 + Math.random() * 0.9; // line length
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
    transparent: false,
    blending: THREE.NoBlending,
    depthWrite: true,
    depthTest: true
  });

  const lines = new THREE.LineSegments(lineGeo, lineMat);

  const uniforms = {
    u_time: { value: 0.0 },
    u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
  };

  function animate(dt) {
    if (!mesh) return;
    // advance shader time for cube
    uniforms.u_time.value += dt;

    mesh.position.y = Math.sin(uniforms.u_time.value / 4) * 0.25;
    mesh.position.x = -Math.sin(uniforms.u_time.value / 4) * 0.25;

    // camera follows subtle target
    camera.position.x += (targetCamX - camera.position.x) * 0.08 + Math.sin(uniforms.u_time.value / 2) * 0.01;
    camera.position.y += (targetCamY - camera.position.y) * 0.08 + Math.sin(uniforms.u_time.value / 2) * 0.01;
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

  async function load(){

    // Background image as a 3D plane placed behind the scene to create parallax

    bgTexFront = await loader.loadAsync(bgUrl);
    bgTexBack = await loader.loadAsync(bgUrlBack);

    bgTexFront.encoding = THREE.sRGBEncoding;
    bgTexBack.encoding = THREE.sRGBEncoding;
    bgTexFront.minFilter = THREE.LinearFilter;
    bgTexBack.minFilter = THREE.LinearFilter;

    bgMat = new THREE.MeshBasicMaterial({ map: bgTexFront, transparent: true });
    bgMatBack = new THREE.MeshBasicMaterial({ map: bgTexBack, transparent: false });

    bgGeo = new THREE.PlaneGeometry(16 * 2, 9 * 2, 4, 4);
    bgGeoBack = new THREE.PlaneGeometry(16 * 4, 9 * 4, 4, 4);

    bgMesh = new THREE.Mesh(bgGeo, bgMat);
    bgMeshBack = new THREE.Mesh(bgGeoBack, bgMatBack);

    bgMeshBack.position.z = -4.5;
    bgMesh.position.z = -3;

    const mat = new THREE.MeshToonMaterial();
    mat.gradientMap = await toonLoader.loadAsync(threeTone);
    mat.gradientMap.minFilter = THREE.NearestFilter;
    mat.gradientMap.magFilter = THREE.NearestFilter;
    mat.color = new THREE.Color(0xffffff);

    const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
    mesh = new THREE.Mesh(geo, mat);

    scene.add(bgMeshBack);
    scene.add(bgMesh);
    scene.add(mesh);
    scene.add(lines);

  }


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

function onWindowResize() {
  renderer.setSize( window.innerWidth, window.innerHeight );
}

  return {
    load,
    init() {},
    start() {},
    stop() {},
    dispose() {
      try {
        // dispose composer
        if (composer && composer.dispose) composer.dispose();

        // background (front & back)
        if (bgMesh) {
          scene.remove(bgMesh);
        }
        if (bgMeshBack) {
          scene.remove(bgMeshBack);
        }
        if (bgTexFront) bgTexFront.dispose && bgTexFront.dispose();
        if (bgTexBack) bgTexBack.dispose && bgTexBack.dispose();
        if (bgMat) bgMat.dispose && bgMat.dispose();
        if (bgMatBack) bgMatBack.dispose && bgMatBack.dispose();
        if (bgGeo) bgGeo.dispose && bgGeo.dispose();
        if (bgGeoBack) bgGeoBack.dispose && bgGeoBack.dispose();

        // lines
        if (lines) scene.remove(lines);
        if (lineGeo) lineGeo.dispose && lineGeo.dispose();
        if (lineMat) lineMat.dispose && lineMat.dispose();

        // mesh
        if (mesh) {
          scene.remove(mesh);
          if (mesh.geometry) mesh.geometry.dispose && mesh.geometry.dispose();
          if (mesh.material) mesh.material.dispose && mesh.material.dispose();
        }

      } catch (e) {
        console.warn('error disposing PremiseScene resources', e);
      }
    },
    onPointerMove,
    animate,
  };
}
