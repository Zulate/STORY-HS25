import * as THREE from 'three';

export default async function createSceneA(renderer) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 4;

  const geo = new THREE.SphereGeometry(0.9, 32, 24);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x66ccff,
    metalness: 0.2,
    roughness: 0.4,
    wireframe: true
  });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);

  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(5, 5, 5);
  scene.add(light);

  let rot = 0;

  // NEW → asynchronous loading
  async function load() {
    // If you load textures/glb later, do it here e.g.:
    // const tex = await loader.loadAsync('...');
    // mesh.material.map = tex;

    // Dummy wait to prove sync works:
    await new Promise(r => setTimeout(r, 100)); 
  }

  function init() {}
  function start() {}
  function stop() {}

  function dispose() {
    try {
      scene.remove(mesh);
      mesh.geometry?.dispose();
      mesh.material?.dispose();
      scene.remove(light);
    } catch (e) {
      console.warn('error disposing sceneA', e);
    }
  }

  function resize(w, h) {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function animate(dt) {
    rot += dt * 0.6;
    mesh.rotation.y = rot;
    renderer.render(scene, camera);
  }

  return { load, init, start, stop, resize, animate, dispose };
}
