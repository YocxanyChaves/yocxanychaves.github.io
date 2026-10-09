let scene, camera, renderer, textMesh, controls;

let isDragging = false;
let previousMousePosition = {
    x: 0,
    y: 0
};
let isClick = true;
let anchoTexto = 0;

// Pantallas táctiles (celular / tablet)
const esTactil = window.matchMedia('(pointer: coarse)').matches;

const myEmail = 'yoc2811@gmail.com';
const copyMessage = document.getElementById('copy-message');

// El correo solo se mueve y se dibuja cuando se ve:
// - en compu, cuando Inicio está en pantalla y el carrusel no está girando
// - en teléfono, cuando el correo está dentro de la pantalla
let correoVisible = true;
new IntersectionObserver(entradas => {
    correoVisible = entradas[0].isIntersecting;
}).observe(document.getElementById('canvas-texto-3d'));

init();
animate();

function init() {
    const container = document.getElementById('canvas-texto-3d');

    if (!container) {
        console.error('Error: No se encontró el elemento con ID "canvas-texto-3d". Las letras 3D no se renderizarán.');
        return;
    }

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 1, 1000);
    camera.position.z = 180;

    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0xffcc66, 1.5);
    pointLight1.position.set(50, 100, 50);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x66ccff, 1.0);
    pointLight2.position.set(-50, -50, 100);
    scene.add(pointLight2);

    // Fuente Righteous (assets/fonts/righteous.js), ya convertida al formato de three.js
    const font = new THREE.FontLoader().parse(window.FUENTE_RIGHTEOUS);

    const geometry = new THREE.TextGeometry('yoc2811@gmail.com', {
        font: font,
        size: 12,
        height: 5,
        curveSegments: 15,
        bevelEnabled: true,
        bevelThickness: 0.7,
        bevelSize: 0.4,
        bevelSegments: 4
    });
    geometry.center();
    geometry.computeBoundingBox();
    anchoTexto = geometry.boundingBox.max.x - geometry.boundingBox.min.x;
    ajustarCamara();

    const material = new THREE.MeshStandardMaterial({
        color: 0xfa4fee,
        metalness: 1.0,
        roughness: 0.4,
        emissive: 0xd1d1d1,
        emissiveIntensity: 0.3
    });

    textMesh = new THREE.Mesh(geometry, material);
    scene.add(textMesh);

    if (controls) controls.target.copy(textMesh.position);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); // nítido en celular
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0); // transparente

    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.maxPolarAngle = Math.PI / 2;
    // Sin zoom con la rueda: si no, la rueda encima del correo hacía zoom
    // en vez de bajar la página
    controls.enableZoom = false;

    // En celular/tablet el control 3D se quedaba con el dedo y no dejaba
    // hacer scroll. Ahí se desactiva: el correo sigue girando solo y
    // se puede tocar para copiarlo.
    if (esTactil) {
        controls.enabled = false;
        renderer.domElement.style.touchAction = 'pan-y';
    }

    renderer.domElement.addEventListener('mousedown', onMouseDown);
    renderer.domElement.addEventListener('mouseup', onMouseUp);
    renderer.domElement.addEventListener('mousemove', onMouseMove);
    renderer.domElement.addEventListener('click', onMouseClick);
    renderer.domElement.addEventListener('mouseout', onMouseUp);

    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    const container = document.getElementById('canvas-texto-3d');
    if (container) {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
        ajustarCamara();
    }
}

// Aleja la cámara lo necesario para que el correo completo quepa a lo ancho
function ajustarCamara() {
    if (!anchoTexto || !camera) return;
    const k = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
    const mitad = (anchoTexto / 2) * 1.08;

    if (window.innerWidth <= 900) {
        // Pantallas angostas: lo más cerca posible para que se vea grande,
        // pero contando que al girar una punta se acerca a la cámara
        // (si no, esa punta se agranda por la perspectiva y se sale del borde)
        camera.position.setLength(mitad * Math.sqrt(1 + 1 / (k * k)));
    } else {
        // Escritorio: igual que antes, con 180 como mínimo
        camera.position.setLength(Math.max(180, mitad / k));
    }
}

function correoEnPantalla() {
    const p = window.paginas;
    if (p && typeof p.activo === 'function' && p.activo()) return !p.girando() && p.actual() === 'inicio';
    return correoVisible;
}

function animate() {
    requestAnimationFrame(animate);

    if (!correoEnPantalla()) return;

    if (textMesh) {
        textMesh.rotation.y += 0.007;
    }

    if (controls) {
        controls.update();
    }

    renderer.render(scene, camera);
}

function onMouseDown(event) {
    isClick = true;
    if (event.button === 0) {
        const mouse = new THREE.Vector2();
        const rect = renderer.domElement.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);

        const intersects = raycaster.intersectObjects([textMesh]);

        if (intersects.length > 0) {
            isDragging = true;
            previousMousePosition = {
                x: event.clientX,
                y: event.clientY
            };
            if (controls) controls.enabled = false;
        } else {
            if (controls && !esTactil) controls.enabled = true;
        }
    }
}

function onMouseUp(event) {
    isDragging = false;
    if (controls && !esTactil) controls.enabled = true;
}

function onMouseMove(event) {
    if (!isDragging || !textMesh) return;

    isClick = false;
    
    const deltaMove = {
        x: event.clientX - previousMousePosition.x,
        y: event.clientY - previousMousePosition.y
    };

    const rotationSpeed = 0.05;

    textMesh.rotation.y += deltaMove.x * rotationSpeed;
    textMesh.rotation.x += deltaMove.y * rotationSpeed;

    previousMousePosition = {
        x: event.clientX,
        y: event.clientY
    };
}

function onMouseClick(event) {
    if (!isClick) return;

    const mouse = new THREE.Vector2();
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObjects([textMesh]);

    if (intersects.length > 0) {
        navigator.clipboard.writeText(myEmail)
            .then(() => {
                if (copyMessage) {
                    copyMessage.style.opacity = '1';
                    setTimeout(() => {
                        copyMessage.style.opacity = '0';
                    }, 2000);
                }
            })
            .catch(err => {
                console.error('Error al copiar el texto: ', err);
            });
    }
}