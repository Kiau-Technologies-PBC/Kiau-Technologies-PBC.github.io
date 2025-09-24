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

    label.addEventListener('click', (e) => {
        spawnNodeWindow(nodeName, description, () => {
            const payload = { nodeName, description };
            try {
                sessionStorage.setItem('previewData', JSON.stringify(payload));
            } catch (err) {
                console.warn('Session storage error', err);
            }
            window.open(`preview.html?node=${encodeURIComponent(nodeName)}`, '_blank');
        });
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

// Problems right now; 1) the columns and recorded data in the new excel sheet is different
// 2)Might have to sort specific columns to get the data we want since the device IDS are put in
// one column and the data in another. 
// Possible fixes: 1) filter column 'Device ID' for targetIDs and then get the data from the other columns.
// 2) Once filtered, I need to pull the 24hr data from 'Ambient Temp', 'Ambient Humidity', 'Data', and 'Time' columns.
// 3) Put it on a graph and display it. 

// The tooltip is going to stay, it wont display the graph but now I want to add a feature that when when a user clicks
// on a node, it opens another pop up tooltip on the side that you can close that has the graph and more detailed data. If the user clicks another graph it will display both graphs temps and humidity in different colors on the same graph so the user can compare them.
// On the tooltip will also be a button that allows the user to get to the 3D preview page, that displays the nodes 3D scan itself. 

// If a node is down, or not sending valid data, the color of the marker for the node on the 3D model will change colors. I also want the colors of the node to change depending on the battery

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

// collect important load promises so we can wait for everything (including preview)
const modelLoadPromises = [];

// wrap main GLB load in a promise (do not hide loading screen here)
const gltfLoadPromise = new Promise((resolve, reject) => {
    const loader = new GLTFLoader().setPath('./');
    loader.load(
        './data/models/4_21_2025.glb',
        (gltf) => {
            gltfModel = gltf.scene;
            gltfModel.position.set(0, 1.05, -1);
            scene.add(gltfModel);
            resolve();
        },
        (xhr) => {
            console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
        },
        (error) => {
            console.error('An error happened', error);
            reject(error);
        }
    );
});
modelLoadPromises.push(gltfLoadPromise);

// NOTE: removed gnome loader and its LoadingManager per request

// wrap STL load in a promise
const stlLoadPromise = new Promise((resolve, reject) => {
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
            resolve();
        },
        (xhr) => {
            console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
        },
        (error) => {
            console.error('An error happened', error);
            reject(error);
        }
    );
});
modelLoadPromises.push(stlLoadPromise);

// toggle button logic remains unchanged
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

// ensure preview setup and wait for preview model load as well
ensurePreviewSetup();
const previewLoadPromise = loadPreviewModel().then(() => {
    console.log('Preview model loaded');
}).catch((err) => {
    console.warn('Preview failed to load', err);
    // resolve anyway so page doesn't hang; remove this if you want to block on preview failure
    return Promise.resolve();
});

// Wait for all important models (main gltf, stl, preview) before hiding loading UI
Promise.all(modelLoadPromises.concat(previewLoadPromise))
    .then(() => {
        console.log('All models loaded — ready to show page content');
        if (loadingScreen) loadingScreen.style.display = 'none';
        document.body.classList.add('models-ready');
    })
    .catch((err) => {
        console.error('One or more model loads failed:', err);
        // still hide loading screen after a short delay so user can interact
        if (loadingScreen) {
            setTimeout(() => { loadingScreen.style.display = 'none'; }, 1000);
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

function spawnNodeWindow(nodeName, descriptionHtml, previewCallback) {
    // Track open windows for offset
    if (!window._nodeWindowCount) window._nodeWindowCount = 0;
    window._nodeWindowCount += 1;
    const offset = 32 * (window._nodeWindowCount - 1);

    const win = document.createElement('div');
    win.className = 'node-popup-window';
    win.style.position = 'fixed';
    win.style.top = `${24 + offset}px`;
    win.style.right = `${24 + offset}px`;
    win.style.width = '340px';
    win.style.minHeight = '180px';
    win.style.background = '#1a2332';
    win.style.color = '#fff';
    win.style.borderRadius = '10px';
    win.style.boxShadow = '0 8px 32px rgba(0,0,0,0.28)';
    win.style.zIndex = 2000 + window._nodeWindowCount;
    win.style.border = '2px solid #223729';
    win.style.userSelect = 'none';
    win.style.display = 'flex';
    win.style.flexDirection = 'column';

    // Header bar for dragging
    const header = document.createElement('div');
    header.textContent = nodeName;
    header.style.background = '#223729';
    header.style.padding = '10px 14px';
    header.style.cursor = 'move';
    header.style.fontWeight = 'bold';
    header.style.borderTopLeftRadius = '8px';
    header.style.borderTopRightRadius = '8px';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.style.background = 'none';
    closeBtn.style.color = '#fff';
    closeBtn.style.border = 'none';
    closeBtn.style.fontSize = '18px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.marginLeft = '12px';
    closeBtn.onclick = () => {
        win.remove();
        window._nodeWindowCount -= 1;
    };
    header.appendChild(closeBtn);

    win.appendChild(header);

    // Content area
    const content = document.createElement('div');
    content.style.padding = '14px';
    content.style.overflowY = 'auto';
    content.style.flex = '1 1 auto';
    content.innerHTML = descriptionHtml || '';
    win.appendChild(content);

    // Preview button
    const previewBtn = document.createElement('button');
    previewBtn.textContent = 'Show Full 3D Preview';
    previewBtn.style.margin = '14px 0 0 0';
    previewBtn.style.padding = '8px';
    previewBtn.style.width = '100%';
    previewBtn.style.borderRadius = '6px';
    previewBtn.style.background = '#223729';
    previewBtn.style.color = '#fff';
    previewBtn.style.border = 'none';
    previewBtn.style.cursor = 'pointer';
    previewBtn.onclick = previewCallback;
    win.appendChild(previewBtn);

    document.body.appendChild(win);

    // Drag logic
    let dragging = false, startX = 0, startY = 0, winX = 0, winY = 0;
    header.onmousedown = function(e) {
        dragging = true;
        startX = e.clientX;
        startY = e.clientY;
        winX = win.offsetLeft;
        winY = win.offsetTop;
        document.body.style.userSelect = 'none';
    };
    document.addEventListener('mousemove', function(e) {
        if (!dragging) return;
        win.style.left = 'auto';
        win.style.right = 'auto';
        win.style.top = Math.max(8, winY + (e.clientY - startY)) + 'px';
        win.style.left = Math.max(8, winX + (e.clientX - startX)) + 'px';
    });
    document.addEventListener('mouseup', function() {
        dragging = false;
        document.body.style.userSelect = '';
    });
}
