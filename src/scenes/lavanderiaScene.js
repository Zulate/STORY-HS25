import * as THREE from 'three';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

import { CustomOutlinePass } from "/src/shaders/CustomOutlinePass.js";
import FindSurfaces from "/src/shaders/FindSurfaces.js";

export default async function createLavanderiaScene(renderer) {

    let mouse = new THREE.Vector2();
    let mesh = new THREE.Mesh();
    let lineMouseX = 0;
    let lineMouseY = 0;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 10;

    const depthTexture = new THREE.DepthTexture();
    const renderTarget = new THREE.WebGLRenderTarget(
    window.innerWidth,
    window.innerHeight,
    {
        depthTexture: depthTexture,
        depthBuffer: true,
    }
    );

    // Initial render pass.
    const composer = new EffectComposer(renderer, renderTarget);
    const pass = new RenderPass(scene, camera);
    composer.addPass(pass);

    // Outline pass.
    const customOutline = new CustomOutlinePass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    scene,
    camera
    );
    composer.addPass(customOutline);

    const surfaceFinder = new FindSurfaces();

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    scene.add(light);

    let rot = 0;

    // Load model
    const loader = new GLTFLoader();
    const model = "src/models/radio_hardsurface_practice.glb";
    loader.load(model, (gltf) => {
    scene.add(gltf.scene);
    mesh = gltf.scene.children[0];
    mesh.position.x = 0;
    mesh.position.y = -1;
    mesh.position.z = 0;

    mesh.rotation.x = 0;
    mesh.rotation.y = 0;
    mesh.rotation.z = -1.57079633 / 2;
    surfaceFinder.surfaceId = 0;

    const lineObject = new THREE.BoxGeometry();
    const lineMaterial = new THREE.MeshBasicMaterial( { color: 0x000000, wireframe: true} );
    const lineMesh = new THREE.Mesh( lineObject, lineMaterial );
    lineMesh.position.y = 3;
    scene.add(lineMesh);


    scene.traverse((node) => {
        if (node.type == "Mesh") {
        const colorsTypedArray = surfaceFinder.getSurfaceIdAttribute(node);
        node.geometry.setAttribute(
            "color",
            new THREE.BufferAttribute(colorsTypedArray, 4)
        );
        node.material = new THREE.MeshBasicMaterial({color: 0xffffff});
        }
    });

    customOutline.updateMaxSurfaceId(surfaceFinder.surfaceId + 1);
    });



    const raycaster = new THREE.Raycaster();
    let intersects;

    document.addEventListener('mousemove', function(event) {
        mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
        mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
        raycaster.setFromCamera(mouse, camera);
        intersects = raycaster.intersectObject(mesh);

        if (intersects.length > 0) {
            console.log("intersected");
        };

    });


    
    async function init() {
    }
    function start() {}
    function stop() {}

    function dispose() {
        try {
            composer.dispose();
            renderTarget.dispose();
            depthTexture.dispose();
            light.dispose();
            if (gltf.scene) {
                scene.remove(gltf.scene);
            }
        } catch (e) {
            console.warn('error disposing lavanderiaScene', e);
        }
    }

    function resize(w, h) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        composer.setSize(w, h);
        renderTarget.setSize(w, h);
    }

    function animate(dt) {

        rot += dt * 0.4;
        mesh.rotation.y = rot;
        mesh.rotation.x = rot;

        composer.render();
    }

    return { init, start, stop, resize, animate, dispose };
}
