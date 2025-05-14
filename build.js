import * as THREE from 'three';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xaaaaaa);
renderer.setPixelRatio(window.devicePixelRatio);

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
controls.target = new THREE.Vector3(0, 1, 0);
controls.update();


const groundGeometry = new THREE.PlaneGeometry(20, 20, 32, 32);
groundGeometry.rotateX(-Math.PI / 2);
const groundMaterial = new THREE.MeshBasicMaterial({ color: 0x555555, side: THREE.DoubleSide });
const groundMesh =  new THREE.Mesh(groundGeometry, groundMaterial);
groundMesh.visible = false; 
scene.add(groundMesh);

// Array to store markers and their corresponding labels
const markers = [];
const labels = [];

// Create a reference to the tooltip element
const tooltip = document.getElementById('tooltip');


// Function to create a marker with a custom color
function addMarker(nodeName, description, location, color) {
    // Create a marker (sphere)
    const markerGeometry = new THREE.SphereGeometry(0.1, 32, 32);
    const markerMaterial = new THREE.MeshBasicMaterial({ color: color }); // Use the color argument
    const marker = new THREE.Mesh(markerGeometry, markerMaterial);
    marker.position.copy(location); // Set the marker's position
    scene.add(marker);

    // Create a label
    const label = document.createElement('div');
    label.style.font = 'Courier New';
    label.style.position = 'absolute';
    label.style.color = 'white';
    label.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    label.style.padding = '4px 8px';
    label.style.borderRadius = '4px';
    label.style.fontSize = '12px';
    label.innerText = nodeName; // Set the label text to the node name
    document.body.appendChild(label);

    // Add hover events for the tooltip
    label.addEventListener('mouseenter', () => {
        tooltip.innerText = description; // Set the tooltip text to the description
        tooltip.style.display = 'block'; // Show the tooltip
    });

    label.addEventListener('mousemove', (event) => {
        tooltip.style.left = `${event.pageX + 10}px`; // Position near the mouse
        tooltip.style.top = `${event.pageY + 10}px`;
    });

    label.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none'; // Hide the tooltip
    });

    // Add the marker and label to their respective arrays
    markers.push(marker);
    labels.push(label);
}

// Function to update all label positions
function updateLabelPositions() {
    markers.forEach((marker, index) => {
        const vector = marker.position.clone();
        vector.project(camera); // Project the marker's position to 2D screen space

        const x = (vector.x * 0.5 + 0.5) * window.innerWidth; // Convert to screen coordinates
        const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;

        labels[index].style.left = `${x}px`;
        labels[index].style.top = `${y}px`;
    });
}

// Add markers and labels with hover information
addMarker('TX7', 'This node is collecting ambient temps.', new THREE.Vector3(-3.2, 1.6, 3), 0x0099ff);
addMarker('TX3', 'This node is collecting ambient temps.',  new THREE.Vector3(-2.9, .4, 2), 0x0099ff);
addMarker('TX1', 'This node is collecting ambient temps.',  new THREE.Vector3(-2.9, -1, 2), 0x0099ff);
addMarker('ST1', 'This node is collecting soil module temps.',  new THREE.Vector3(2.2, 0, .2), 0xffffff);



const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Soft white light
scene.add(ambientLight);

// Show the loading screen
const loadingScreen = document.getElementById('loading-screen');

// Variables to store the models
let gltfModel, stlModel;

// GLTF Loader
const loader = new GLTFLoader().setPath('./');
loader.load(
    './data/4_21_2025.glb',
    (gltf) => {
        gltfModel = gltf.scene;
        gltfModel.position.set(0, 1.05, -1);
        scene.add(gltfModel);

        // Hide the loading screen once the GLTF model is loaded
        loadingScreen.style.display = 'none';
    },
    (xhr) => {

        console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
    },
    (error) => {
        console.error('An error happened', error);
    }
);


// Load the STL model
const stlLoader = new STLLoader();
stlLoader.load(
    './data/climate_battery3D.stl',
    (geometry) => {
        const material = new THREE.MeshStandardMaterial({
            color: 0xaaaaaa,
            transparent: true,
            opacity: 0.5, 
        });
        stlModel = new THREE.Mesh(geometry, material);
        stlModel.position.set(0, 0, 10);
        stlModel.scale.set(0.001, 0.001, 0.001);
        stlModel.rotateX(-Math.PI / 2);
        stlModel.visible = false; // Initially hide the STL model
        scene.add(stlModel);
    },
    (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
    },
    (error) => {
        console.error('An error happened', error);
    }
);

// Add event listener for the toggle button
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

// Function to detect if the user is on a mobile device based on screen size
function isMobileDevice() {
    return window.innerWidth <= 768; // Consider devices with width <= 768px as mobile
}

// Check if the user is on a mobile device
if (isMobileDevice()) {
    // Display a message or disable features
    document.body.innerHTML = `
        <p style="
            text-align: center;
            font-size: 18px;
            margin: 0;
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            font-family: Arial, sans-serif;
        ">
            This feature is not available on mobile devices.
        </p>`;
} else {
    // Proceed with the normal functionality
    animate();
}

// Animate function
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);

    updateLabelPositions(); // Update all label positions
}

animate();