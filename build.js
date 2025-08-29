import * as THREE from 'three';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;

if (isMobileDevice()) {
    renderer.setPixelRatio(1);
    renderer.setSize(window.innerWidth / 2, window.innerHeight / 2);
} else {
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
}

renderer.setClearColor(0xaaaaaa);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(0, 15, 25);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minDistance = 5;
controls.maxDistance = 20;
controls.minPolarAngle = 0.5;
controls.maxPolarAngle = 1.5;
controls.autoRotate = false;
controls.target.set(0, 1, 0);
controls.update();

const groundGeometry = new THREE.PlaneGeometry(20, 20, 32, 32);
groundGeometry.rotateX(-Math.PI / 2);
const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x555555, side: THREE.DoubleSide });
const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
groundMesh.visible = false;
scene.add(groundMesh);

const markers = [];
const labels = [];

const tooltip = document.getElementById('tooltip');

// Setup for tooltip preview renderer and model caching
const PREVIEW_GLTF = './data/models/preview2.gltf';
let previewRenderer = null;
let previewScene = null;
let previewCamera = null;
let previewModel = null;
let previewAnimating = false;
let previewRAF = null;

/*
 * Ensure the tooltip preview renderer, camera and lights exist.
 */
function ensurePreviewSetup() {
    if (previewRenderer) return;

    previewRenderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    previewRenderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    previewRenderer.setSize(180, 120);
    previewRenderer.domElement.style.width = '180px';
    previewRenderer.domElement.style.height = '120px';
    previewRenderer.domElement.style.pointerEvents = 'none';
    previewRenderer.domElement.style.position = 'relative';
    previewRenderer.domElement.style.display = 'block';
    previewRenderer.domElement.style.margin = '0 auto';
    previewRenderer.domElement.style.zIndex = '1001';

    previewScene = new THREE.Scene();

    previewCamera = new THREE.PerspectiveCamera(50, 180 / 120, 0.1, 100);
    previewCamera.position.set(7, 7, 0);
    previewCamera.lookAt(0, 0, 0);

    previewScene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, .8);
    dirLight.position.set(3, 3, 3);
    previewScene.add(dirLight);
}

/*
 * Load and cache the preview GLTF model, center and scale it to fit the preview.
 */
function loadPreviewModel() {
    return new Promise((resolve, reject) => {
        if (previewModel) return resolve(previewModel);

        const loaderPreview = new GLTFLoader().setPath('./');
        loaderPreview.load(
            PREVIEW_GLTF,
            (gltf) => {
                if (previewModel) {
                    previewScene.remove(previewModel);
                    previewModel = null;
                }

                previewModel = gltf.scene.clone(true);

                const box = new THREE.Box3().setFromObject(previewModel);
                const size = box.getSize(new THREE.Vector3()).length();
                const baseScale = size > 0 ? 0.9 / size : 1;
                const scale = baseScale * 6;
                previewModel.scale.setScalar(scale);
                const center = box.getCenter(new THREE.Vector3());
                previewModel.position.sub(center.multiplyScalar(scale));

                previewModel.position.z += 2.3;
                // previewModel.position.y -= 1;
                

                previewModel.rotation.set(-Math.PI / 2, 0, 0);

                previewScene.add(previewModel);
                resolve(previewModel);
            },
            undefined,
            (err) => reject(err)
        );
    });
}

/*
 * Populate and display the tooltip content and start preview animation.
 */
function showTooltipWithModel(descriptionHtml) {
    tooltip.innerHTML = '';

    const descDiv = document.createElement('div');
    descDiv.className = 'desc';
    descDiv.innerHTML = descriptionHtml || '';
    tooltip.appendChild(descDiv);

    ensurePreviewSetup();
    if (!tooltip.querySelector('canvas')) {
        tooltip.appendChild(previewRenderer.domElement);
    }

    loadPreviewModel().catch(err => console.warn('Preview load failed', err));

    if (!previewAnimating) {
        previewAnimating = true;
        const animatePreview = () => {
            previewRAF = requestAnimationFrame(animatePreview);
            if (previewModel) previewModel.rotation.z += 0.02;
            previewRenderer.render(previewScene, previewCamera);
        };
        animatePreview();
    }

    tooltip.style.display = 'block';
}

/*
 * Hide the tooltip and stop the preview animation.
 */
function hideTooltip() {
    tooltip.style.display = 'none';
    if (previewRAF) {
        cancelAnimationFrame(previewRAF);
        previewRAF = null;
    }
    previewAnimating = false;
}

/*
 * Create a marker mesh at a given location and attach an HTML label with hover handlers.
 */
function addMarker(nodeName, description, location, color) {
    const markerGeometry = new THREE.SphereGeometry(0.1, 32, 32);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: color });
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.copy(location);
    scene.add(marker);

    const label = document.createElement('div');
    label.style.font = 'Courier New';
    label.style.position = 'absolute';
    label.style.color = 'white';
    label.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    label.style.padding = '4px 8px';
    label.style.borderRadius = '4px';
    label.style.fontSize = '12px';
    label.innerText = nodeName;
    document.body.appendChild(label);

    label.addEventListener('mouseenter', (e) => {
        showTooltipWithModel(description);
        tooltip.style.left = `${e.pageX + 10}px`;
        tooltip.style.top = `${e.pageY + 10}px`;
    });

    label.addEventListener('mousemove', (event) => {
        tooltip.style.left = `${event.pageX + 10}px`;
        tooltip.style.top = `${event.pageY + 10}px`;
    });

    label.addEventListener('mouseleave', () => {
        hideTooltip();
    });

    label.addEventListener('click', (e) => {
        const payload = { nodeName, description };
        try {
            sessionStorage.setItem('previewData', JSON.stringify(payload));
        } catch (err) {
            console.warn('Session storage error', err);
        }
        window.open(`preview.html?node=${encodeURIComponent(nodeName)}`, '_blank');
    });

    markers.push(marker);
    labels.push(label);
}

/*
 * Update all HTML label positions to follow their 3D markers.
 */
function updateLabelPositions() {
    markers.forEach((marker, index) => {
        const vector = marker.position.clone();
        vector.project(camera);

        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;

        labels[index].style.left = `${x}px`;
        labels[index].style.top = `${y}px`;
    });
}

const sheetId = "1a3ffD9pGRO6xu8ujJIWUM9y-YoxzAz61XgRerVWAntU";
const sheetName = "Most Recent";
const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${sheetName}`;

const targetIDs = ['TX1', 'TX3', 'TX7', 'SI1A'];
const positions = {
    TX1: new THREE.Vector3(-2.9, -1, 2),
    TX3: new THREE.Vector3(-2.9, 0.4, 2),
    TX7: new THREE.Vector3(-3.2, 1.6, 3.0),
    SI1A: new THREE.Vector3(2.2, 0, 0.2)
};
const colors = {
    TX1: 0x0099ff,
    TX3: 0x0099ff,
    TX7: 0x0099ff,
    SI1A: 0xffffff
};

fetch(url)
    .then(res => res.text())
    .then(data => {
        const json = JSON.parse(data.substring(47).slice(0, -2));
        const rows = json.table.rows;

        rows.forEach(row => {
            const c = row.c;
            const id = c[4]?.v;

            if (targetIDs.includes(id)) {
                const temp1 = c[5]?.v ?? "N/A";
                const hum1 = c[6]?.v ?? "N/A";
                const date = c[1]?.v;
                const time = c[2]?.v;

                let description = "";
                const tempNum = parseFloat(temp1);
                const humNum = parseFloat(hum1);

                const tempError = !isNaN(tempNum) && (tempNum > 50 || tempNum < -20);
                const humError = !isNaN(humNum) && (humNum > 100 || humNum < 0);

                if (tempError || humError) {
                    description = `<b>Sensor Reading Error</b><br>ID: ${id}<br>Date: ${date}`;
                } else {
                    description = `ID: ${id}, Ambient Temperature: ${temp1}°C, Ambient Humidity: ${hum1}%, Time: ${time}, Date: ${date}`;
                }

                const position = positions[id] || new THREE.Vector3(0, 0, 0);
                const color = colors[id] || 0x0099ff;

                addMarker(id, description, position, color);
            }
        });
    })
    .catch(err => {
        console.error("Error loading data:", err);
    });

scene.add(new THREE.AmbientLight(0xffffff, 0.5));

const loadingScreen = document.getElementById('loading-screen');

let gltfModel = null;
let stlModel = null;
let gnomeModel = null;

const loader = new GLTFLoader().setPath('./');
loader.load(
    './data/models/4_21_2025.glb',
    (gltf) => {
        gltfModel = gltf.scene;
        gltfModel.position.set(0, 1.05, -1);
        scene.add(gltfModel);
        loadingScreen.style.display = 'none';
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
    },
    (error) => {
        console.error('An error happened', error);
    }
);

const manager = new THREE.LoadingManager();
manager.onStart = (url) => { console.log('Started loading file:', url); };
manager.onProgress = (url) => { console.log('Loading:', url); };
manager.onError = (url) => { console.error('There was an error loading', url); };
manager.setURLModifier((url) => {
    if (url.startsWith('data:')) return url;
    const name = url.replace(/^(\.\/|\/)/, '');
    return `./data/${name}`;
});

const gnomeLoader = new GLTFLoader(manager).setPath('./data/');
gnomeLoader.setResourcePath('./data/');
gnomeLoader.load(
    'gnome.gltf',
    (gltf) => {
        gnomeModel = gltf.scene;
        gnomeModel.position.set(0, 1.05, 4);
        scene.add(gnomeModel);
        console.log('gnome.gltf loaded');
    },
    (xhr) => {
        if (xhr.lengthComputable) console.log('gnome load', Math.round((xhr.loaded / xhr.total) * 100) + '%');
    },
    (error) => {
        console.error('gnome load error:', error);
    }
);

const stlLoader = new STLLoader();
stlLoader.load(
    './data/models/climate_battery3D.stl',
    (geometry) => {
        const material = new THREE.MeshStandardMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.5 });
        stlModel = new THREE.Mesh(geometry, material);
        stlModel.position.set(0.20, -0.01, 10);
        stlModel.scale.set(0.001, 0.001, 0.001);
        stlModel.rotateX(-Math.PI / 2);
        stlModel.visible = false;
        scene.add(stlModel);

        const box = new THREE.Box3().setFromObject(stlModel);
        console.log("STL Model bounding box:", box);
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
    },
    (error) => {
        console.error('An error happened', error);
    }
);

const toggleButton = document.getElementById('toggle-model');
toggleButton.addEventListener('click', () => {
    if (gltfModel && stlModel) {
        if (gltfModel.visible) {
            gltfModel.visible = false;
            stlModel.visible = true;
            toggleButton.innerText = 'Switch to GLTF Model';
        } else {
            gltfModel.visible = true;
            stlModel.visible = false;
            toggleButton.innerText = 'Switch to STL Model';
        }
    }
});

/*
 * Return true when the viewport width indicates a mobile device.
 */
function isMobileDevice() {
    return window.innerWidth <= 768;
}

/*
 * Handle window resize: update camera, renderer and controls.
 */
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (isMobileDevice()) {
        camera.fov = 60;
        camera.position.set(0, 50, 150);
    } else {
        camera.fov = 45;
        camera.position.set(0, 15, 25);
    }

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    controls.update();
});

/*
 * Main animation loop: update controls, render scene and refresh labels.
 */
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    updateLabelPositions();
}

renderer.setSize(window.innerWidth, window.innerHeight);

console.log('Renderer size:', renderer.domElement.clientWidth, renderer.domElement.clientHeight);
console.log('Camera aspect ratio:', camera.aspect);
console.log("Screen width:", window.innerWidth);
console.log("Is mobile device:", isMobileDevice());
console.log("Camera position:", camera.position);
animate();
