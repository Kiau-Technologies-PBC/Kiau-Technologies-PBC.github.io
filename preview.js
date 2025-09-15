import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const PREVIEW_GLTF = './data/models/preview2.gltf';
const container = document.getElementById('viewer');
const info = document.getElementById('info');

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setSize(window.innerWidth, window.innerHeight - 60);
renderer.domElement.style.position = 'relative';
renderer.domElement.style.zIndex = '0';
renderer.domElement.style.pointerEvents = 'auto';
renderer.domElement.style.touchAction = 'none';
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / (window.innerHeight - 60), 0.1, 1000);
camera.position.set(1, 3, 5);

// Improved OrbitControls setup (mouse rotate enabled, damping, zoom limits)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableRotate = true;
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = true;
controls.minDistance = 0.6;
controls.maxDistance = 20;
controls.maxPolarAngle = Math.PI / 2;
controls.target.set(0, 0.8, 0);
controls.update();

scene.add(new THREE.AmbientLight(0xffffff, 0.6));
const dl = new THREE.DirectionalLight(0xffffff, 3);
dl.position.set(3,3,3);
scene.add(dl);

// ground plane and grid removed to keep the scene uncluttered
{ 
// Add a grid and small axes helper for positioning/nudging the model
const grid = new THREE.GridHelper(20, 20, 0x444444, 0x222222);
grid.position.y = -0.01;
scene.add(grid);

const axes = new THREE.AxesHelper(1.5);
axes.position.y = 0;
scene.add(axes);
}

function fitAndCenter(object3d, desired = 1) {
    const box = new THREE.Box3().setFromObject(object3d);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    if (maxDim > 0) {
        const s = desired / maxDim;
        object3d.scale.setScalar(s);
    }
    box.setFromObject(object3d);
    const center = box.getCenter(new THREE.Vector3());
    object3d.position.sub(center);
}

function loadPreview() {
    const loader = new GLTFLoader();
    loader.load(PREVIEW_GLTF, (gltf) => {
        const model = gltf.scene;

        // Fit and center with a larger target so the model appears bigger
        fitAndCenter(model, 3); // increase this to zoom the model in more

        // rotate upright if needed (adjust axis/sign)
        model.rotation.set(-Math.PI/2, 0, 0);

        // small forward nudge if needed (optional)
        model.position.z += 1.4;

        scene.add(model);

        // update controls to focus model
        controls.target.set(0, 0, 0);
        controls.update();

        animate();
    }, undefined, (err) => {
        console.error('Preview load error', err);
    });
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight - 60);
    camera.aspect = window.innerWidth / (window.innerHeight - 60);
    camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);

// read node data saved by build.js
let payload = {};
try {
    payload = JSON.parse(sessionStorage.getItem('previewData') || '{}');
} catch (e) { payload = {}; }

info.innerHTML = payload.nodeName ? `<strong>${payload.nodeName}</strong> — ${payload.description || ''}` : 'No node data found.';

// kick off
loadPreview();