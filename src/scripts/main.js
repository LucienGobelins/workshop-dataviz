import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

if(!THREE) throw new Error('THREE is not defined');

const sizes = {
    width: window.innerWidth,
    height: window.innerHeight
}
const bloomParams = {
    bloomStrength: 1,
    bloomThreshold: .25,
    bloomRadius: .25
};
const speedCamera = {
    current: 1000,
    max: 1000,
    min: 0
};

const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer();
const camera = new THREE.PerspectiveCamera( 75, sizes.width / sizes.height, 0.1, 1000 );
const controls = new OrbitControls( camera, renderer.domElement );

let unitList = [];
let lineList = [];
let selectedUnits = [];

let lastMove = Date.now();
window.addEventListener( 'mousemove', (e) => {
    lastMove = Date.now();
})

window.addEventListener( 'resize', ()=>{
    sizes.width = window.innerWidth;
    sizes.height = window.innerHeight;
    camera.aspect = sizes.width / sizes.height;
    camera.updateProjectionMatrix();
    renderer.setSize( sizes.width, sizes.height );
    renderer.setPixelRatio( Math.min( window.devicePixelRatio, 2 ) );
});

renderer.setSize( sizes.width, sizes.height );
document.body.appendChild( renderer.domElement );
renderer.setPixelRatio( window.devicePixelRatio );

fetch('http://localhost:1234/data/data.json').then(response => {
    return response.json();
}).then(json => {
    json.users.forEach(data => {
        generateUnit(data);
    });
});

document.addEventListener('click', (e) => {
    const mouse = new THREE.Vector2();
    mouse.x = ( e.clientX / window.innerWidth ) * 2 - 1;
    mouse.y = - ( e.clientY / window.innerHeight ) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera( mouse, camera );

    const intersects = raycaster.intersectObjects( scene.children );
    if(intersects.length > 0) {
        const unit = intersects[0].object;
        generateLinks(unit);
    }
});

camera.position.z = 5;

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
scene.add(ambientLight)

const light = new THREE.PointLight(0xffffff, 0.5)
light.position.x = 2
light.position.y = 3
light.position.z = 4
scene.add(light)

const renderScene = new RenderPass( scene, camera );
const bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 1.5, 0.4, 0.85 );
bloomPass.threshold = bloomParams.bloomThreshold;
bloomPass.strength = bloomParams.bloomStrength;
bloomPass.radius = bloomParams.bloomRadius;

composer = new EffectComposer( renderer );
composer.addPass( renderScene );
composer.addPass( bloomPass );

let cos = 0;
const animate = function () {
    requestAnimationFrame(animate);

    if (Date.now() - lastMove > 2000) {
        if(speedCamera.current < speedCamera.max) speedCamera.current += 10;
    } else {
        if(speedCamera.current > speedCamera.min) speedCamera.current -= 20;
    }


    const speed = .1+Math.abs((speedCamera.current / 1000));
    cos += speed*.01;

    camera.position.x = Math.cos( cos ) * 40;
    camera.position.z = Math.sin( cos ) * 40;
    camera.position.y = Math.cos( cos ) * 15 + 5;
    
    lineList.forEach(e => {
        if(e.actions.scale < 1) {
            e.actions.scale += 0.02;
            scaleLine(e);
        }
    });

    camera.lookAt( scene.position );
    composer.render();
}
animate();

// ------------------------------//
//           Functions           //
// ------------------------------//

// Generate :
function generateUnit(data, color="lightblue") {
    const geometry = new THREE.DodecahedronGeometry( 1, 0 );
    const material = new THREE.MeshStandardMaterial({
        color: color, 
    });
    const mesh = new THREE.Mesh( geometry, material );

    const limitX = (sizes.width - (sizes.width * .05)) / 20;
    const limitY = (sizes.height - (sizes.height * .05)) / 20;
    
    mesh.position.x = (Math.random() * limitX - limitX / 2) * Math.cos(Math.random() * 360);
    mesh.position.y = (Math.random() * limitY - limitY / 2) * Math.sin(Math.random() * 360);
    mesh.position.z = Math.random() * ((limitY + limitY) / 2) - ((limitY + limitY) / 4);

    for (let i = 0; i < unitList.length; i++) {
        if(checkCollision(mesh, unitList[i])) {
            return generateUnit(data, color);
        }
    }

    mesh.userData = data;

    scene.add( mesh );
    unitList.push(mesh);
}
function generateLinks(mesh) {
    const userGroups = [mesh.userData.gender, mesh.userData.format, mesh.userData.platform];
    userGroups.forEach((group) => {
        const groupList = unitList.filter(e => Object.values(e.userData).includes(group));
        groupList.forEach(f => {
            buildLink(mesh, f, '#ffc9c9');
        })
    })
}
function buildLink(mesh1, mesh2, color="red") {
    const geometry = new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
            mesh1.position,
            mesh2.position
        ]),
        64,
        0.05,
        8,
        false
    );
    let material = new THREE.MeshBasicMaterial({
        color: color,
    });

    const line = new THREE.Mesh(geometry, material);
    
    scene.add(line);
    line.actions = {
        scale: 0,
    };
    line.originPos = mesh1.position;
    lineList.push(line);
}

// Check :
function checkCollision(unit1, unit2) {
    const distance = unit1.position.distanceTo(unit2.position);
    if (distance < 2) {
        return true;
    } else {
        return false;
    }
}

// Actions : 
function scaleLine(line) {
    line.scale.set(line.actions.scale, line.actions.scale, line.actions.scale);
    line.position.set(
        line.originPos.x * (1 - line.actions.scale),
        line.originPos.y * (1 - line.actions.scale),
        line.originPos.z * (1 - line.actions.scale)
    );
}