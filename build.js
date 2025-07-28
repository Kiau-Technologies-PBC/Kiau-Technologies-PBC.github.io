import * as THREE from 'three';

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.outputColorSpace = THREE.SRGBColorSpace;

if (isMobileDevice()) {
    renderer.setPixelRatio(1); // Reduce pixel ratio for better performance
    renderer.setSize(window.innerWidth / 2, window.innerHeight / 2); // Lower resolution
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
        tooltip.innerHTML = description; // Set the tooltip text to the description
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
// addMarker('TX7', 'This node is collecting ambient temps.', new THREE.Vector3(-3.2, 1.6, 3), 0x0099ff);
// addMarker('TX3', 'This node is collecting ambient temps.',  new THREE.Vector3(-2.9, .4, 2), 0x0099ff);
// addMarker('TX1', 'This node is collecting ambient temps.',  new THREE.Vector3(-2.9, -1, 2), 0x0099ff);
// addMarker('ST1', 'This node is collecting soil module temps.',  new THREE.Vector3(2.2, 0, .2), 0xffffff);

// START: Add markers and labels with hover information from Google Sheets Live Data 06/16/2025
const sheetId = "1a3ffD9pGRO6xu8ujJIWUM9y-YoxzAz61XgRerVWAntU";
const sheetName = "Most Recent";
const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${sheetName}`;

const targetIDs = ['TX1', 'TX3', 'TX7', 'SI1A']; // The IDs you want to pull data for
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

                // Temperature and humidity checks
                let warning = "";
                const tempNum = parseFloat(temp1);
                const humNum = parseFloat(hum1);

                let description = "";
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

// END: Markers

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

        // Hide the loading screen and start the spin animation
        loadingScreen.style.display = 'none';
        // setTimeout(() => {
        //     startSpin(); // Start the spin animation after a short delay
        // }, 500); // 500 milliseconds delay
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
        stlModel.position.set(0.20, -0.01, 10);

        // Dynamically adjust the scale based on the device
        if (isMobileDevice()) {
            stlModel.scale.set(0.001, 0.001, 0.001); // Smaller scale for mobile
        } else {
            stlModel.scale.set(0.001, 0.001, 0.001); // Default scale for desktop
        }

        stlModel.rotateX(-Math.PI / 2);
        stlModel.visible = false; // Initially hide the STL model
        scene.add(stlModel);

        // Log the bounding box for debugging
        const box = new THREE.Box3().setFromObject(stlModel);
        console.log("STL Model bounding box:", box);
        console.log("STL Model size:", box.getSize(new THREE.Vector3()));
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
    return window.innerWidth <= 768; // Adjust threshold if needed
}

// Adjust camera settings based on the device
if (camera) {
    if (isMobileDevice()) {
        console.log("Mobile device detected. Adjusting camera settings...");
        camera.fov = 90; // Increase FOV for mobile
        camera.position.set(0, 15, 25); // Move the camera farther away for mobile
        
    } else {
        camera.fov = 45; // Default FOV for desktop
        camera.position.set(0, 15, 25); // Default position for desktop
    }
    camera.aspect = window.innerWidth / window.innerHeight; // Update aspect ratio
    camera.updateProjectionMatrix(); // Apply the changes
    controls.update(); // Update controls to reflect the new camera settings
}

// Add resize event listener
window.addEventListener('resize', () => {
    console.log("Resize event triggered");
    const width = window.innerWidth;
    const height = window.innerHeight;

    camera.aspect = width / height;

    if (isMobileDevice()) {
        camera.fov = 60; // Keep the wider FOV for mobile
        camera.position.set(0, 50, 150); // Adjust for mobile
    } else {
        camera.fov = 45; // Default FOV for desktop
        camera.position.set(0, 15, 25); // Adjust for desktop
    }

    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    controls.update(); // Update controls to reflect the new camera settings
});

const clock = new THREE.Clock(); // Create a clock to manage time

let spinDuration = 2; // Duration of the spin in seconds
let spinStartTime = null; // Track when the spin starts
let spinning = false; // Flag to indicate if the model is spinning

function startSpin() {
    spinning = true;
    spinStartTime = clock.getElapsedTime(); // Record the start time of the spin
}

// Animate function
function animate() {
    requestAnimationFrame(animate);

    const elapsedTime = clock.getElapsedTime();

    if (spinning) {
        const spinElapsedTime = elapsedTime - spinStartTime;

        if (spinElapsedTime < spinDuration) {
            // Calculate easing progress (ease-out effect)
            const progress = spinElapsedTime / spinDuration; // Normalized progress (0 to 1)
            const easedProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease-out

            // Spin the model smoothly
            const spinAngle = easedProgress * Math.PI * 2.5; // Full rotation (360 degrees)
            if (gltfModel) {
                gltfModel.rotation.y = spinAngle;
            }
        } else {
            // Ensure the model completes a full rotation at the end
            if (gltfModel) {
                gltfModel.rotation.y = Math.PI * 2.5; // Final position
            }
            spinning = false; // Stop spinning
        }
    }

    controls.update(); // Update camera controls
    renderer.render(scene, camera); // Render the scene
    updateLabelPositions(); // Update all label positions
}


// Set the initial size
renderer.setSize(window.innerWidth, window.innerHeight);

console.log('Renderer size:', renderer.domElement.clientWidth, renderer.domElement.clientHeight);
console.log('Camera aspect ratio:', camera.aspect);
console.log("Screen width:", window.innerWidth);
console.log("Is mobile device:", isMobileDevice());
console.log("Camera position:", camera.position);
animate();
