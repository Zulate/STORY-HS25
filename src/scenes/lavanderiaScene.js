import * as THREE from 'three';
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";


import { CustomOutlinePass } from "/src/shaders/CustomOutlinePass.js";
import FindSurfaces from "/src/shaders/FindSurfaces.js";
import { Vector3 } from 'three';
import { lerp } from 'three/src/math/MathUtils.js';

export default async function createLavanderiaScene(renderer) {

    let mouse = new THREE.Vector2();
    let lineMouseX = 0;
    let lineMouseY = 0;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    const uniforms = {
    u_time: { value: 0.0 },
    u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
    };
    camera.position.z = 0;

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

    let mesh = new THREE.Mesh();
    let cubemesh = new THREE.Mesh();
    let door1 = new THREE.Mesh();
    let door2 = new THREE.Mesh();
    let door3 = new THREE.Mesh();

    // Load model
    const loader = new GLTFLoader();
    const model = "src/models/lavanderia.glb";
    loader.load(model, (gltf) => {
    scene.add(gltf.scene);
    mesh = gltf.scene.children[0];
    cubemesh = gltf.scene.children[1];
    door1 = gltf.scene.children[5];
    door2 = gltf.scene.children[4];
    door3 = gltf.scene.children[6];
    console.log(gltf.scene);
    gltf.scene.position.z = -28;
    mesh.position.x = -4.5;
    mesh.position.y = -1;
    mesh.position.z = -4;

    mesh.rotation.x = 0;
    mesh.rotation.y = 0;
    mesh.rotation.z = -1.57079633 / 2;
    surfaceFinder.surfaceId = 0;

    scene.traverse((node) => {
        if (node.name === "Door-2") {
            const colorsTypedArray = surfaceFinder.getSurfaceIdAttribute(node);
            node.geometry.setAttribute(
                "color",
                new THREE.BufferAttribute(colorsTypedArray, 4)
            );
            node.material = new THREE.MeshBasicMaterial({color: 0xffffff});
        } else if(node.name === "Door-1"){
            const colorsTypedArray = surfaceFinder.getSurfaceIdAttribute(node);
            node.geometry.setAttribute(
                "color",
                new THREE.BufferAttribute(colorsTypedArray, 4)
            );
            node.material = new THREE.MeshBasicMaterial({color: 0xffffff});
        }else if(node.name === "Door-3"){
            const colorsTypedArray = surfaceFinder.getSurfaceIdAttribute(node);
            node.geometry.setAttribute(
                "color",
                new THREE.BufferAttribute(colorsTypedArray, 4)
            );
            node.material = new THREE.MeshBasicMaterial({color: 0xffffff});
        }else if(node.type === "Mesh") {
            console.log("cube loaded");
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

    cubemesh.position.x = 0;
    cubemesh.position.y = 0;
    cubemesh.position.z = 0;

    const raycaster = new THREE.Raycaster();
    let intersects;

    // document.addEventListener('mousemove', function(event) {
    //     mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
    //     mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
    //     raycaster.setFromCamera(mouse, camera);
    //     intersects = raycaster.intersectObject(mesh);

    //     if (intersects.length > 0) {
    //         console.log("intersected");
    //     };

    // });

    let targetCamX = 0, targetCamY = 0;
    let targetCamZ = 0;  // target z position for smooth interpolation
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

    function onWheel(scrollPosition) {

        targetCamZ += scrollPosition.deltaY * 0.01;  // accumulate scroll into target

        console.log("camera position", camera.position.z, "targetValue", targetCamZ);

    }

    async function init() {
    }
    function start() {}
    function stop() {}

    function dispose() {
        try {
            if(composer) scene.remove(composer);
            if(renderTarget) scene.remove(renderTarget);
            if(depthTexture) scene.remove(depthTexture);
            if(light) scene.remove(light);
            composer.dispose();
            renderTarget.dispose();
            depthTexture.dispose();
            light.dispose();
            if (loader) scene.remove(loader);
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
        uniforms.u_time.value += dt;

        camera.rotation.y = -(targetCamX - camera.position.x) * 0.09 + Math.sin(uniforms.u_time.value / 2) * 0.01;
        camera.rotation.x = (targetCamY - camera.position.y) * 0.09 + Math.sin(uniforms.u_time.value / 2) * 0.01;

        rot += dt * 0.2;
        mesh.rotation.y = rot;
        mesh.rotation.x = rot;



        if(camera.position.z < -2 && camera.position.z > -15){
            door1.rotation.y = lerp(door1.rotation.y, 1.5, 0.05);
            console.log("door1 opened");
            camera.position.z = lerp(camera.position.z, targetCamZ, 0.01);
        } else if(camera.position.z < -35 && camera.position.z > -50){
            door2.rotation.y = lerp(door2.rotation.y, 1.5, 0.05);
            console.log("door2 opened");
            camera.position.z = lerp(camera.position.z, targetCamZ, 0.01);
        }else if(camera.position.z <= -70){
            targetCamZ = -(camera.position.z + (-targetCamZ));
            camera.position.z = 2;
            camera.position.z = lerp(camera.position.z, targetCamZ, 0.01);

        }else {
            camera.position.z = lerp(camera.position.z, targetCamZ, 0.01);
            door1.rotation.y = lerp(door1.rotation.y, 0, 0.05);
            door2.rotation.y = lerp(door2.rotation.y, 0, 0.05);
            door3.rotation.y = lerp(door3.rotation.y, 0, 0.05);
        }

        composer.render();
    }

    return { init, start, stop, resize, onWheel, onPointerMove, animate, dispose };
}
