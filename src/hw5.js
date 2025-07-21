import {OrbitControls} from './OrbitControls.js'

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
// Set background color
scene.background = new THREE.Color(0x000000);

// Add lights to the scene
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(10, 20, 15);
scene.add(directionalLight);

// Enable shadows
renderer.shadowMap.enabled = true;
directionalLight.castShadow = true;

function degrees_to_radians(degrees) {
  var pi = Math.PI;
  return degrees * (pi/180);
}

const textureLoader = new THREE.TextureLoader();

// Create basketball court
function createBasketballCourt() {
  // Court floor - just a simple brown surface
  const courtGeometry = new THREE.BoxGeometry(30, 0.2, 15);
  textureLoader.load('resources/CourtTexture.png', // Court texture
    (texture) => {
      const courtMaterial = new THREE.MeshPhongMaterial({ 
        map: texture,
        shininess: 100
       });
      const court = new THREE.Mesh(courtGeometry, courtMaterial);
      court.receiveShadow = true;
      scene.add(court);
    },
    undefined,
    () => {
      // Fallback if texture fails
      const courtMaterial = new THREE.MeshPhongMaterial({ 
        color: 0xc68642,  // Brown wood color
        shininess: 50
      });
      const court = new THREE.Mesh(courtGeometry, courtMaterial);
      court.receiveShadow = true;
      scene.add(court);
    }
  );

  drawCourtMarkings();   // right side
  createBasketballHoop(-15);  // left hoop
  createBasketballHoop(15);   // right hoop

}

function drawCourtMarkings() {
  const whiteLine = new THREE.LineBasicMaterial({ color: 0xffffff });

  // === Center Line === //
  const midLine = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0.11, -7.5),
    new THREE.Vector3(0, 0.11, 7.5),
  ]);
  const halfCourtLine = new THREE.Line(midLine, whiteLine);
  scene.add(halfCourtLine);

  // === Center Circle === //
  const circleRadius = 1.8;
  const circleSegments = 64;
  const circlePoints = [];

  for (let i = 0; i <= Math.PI * 2; i += Math.PI * 2 / circleSegments) {
    circlePoints.push(new THREE.Vector3(
      Math.cos(i) * circleRadius,
      0.11,
      Math.sin(i) * circleRadius
    ));
  }

  const circleLineGeom = new THREE.BufferGeometry().setFromPoints(circlePoints);
  const centerCircle = new THREE.LineLoop(circleLineGeom, whiteLine);
  scene.add(centerCircle);

  // === Three-Point Arcs === //
  const arcDetail = 64;
  const arcDistance = 7;
  const halfLength = 15;
  const leftArcPts = [];
  const rightArcPts = [];

  for (let j = 0; j <= arcDetail; j++) {
    const angle = Math.PI - (j / arcDetail) * Math.PI;
    const px = -halfLength + arcDistance * Math.sin(angle);
    const pz = arcDistance * Math.cos(angle);
    leftArcPts.push(new THREE.Vector3(px, 0.11, pz));
    rightArcPts.push(new THREE.Vector3(-px, 0.11, pz));
  }
  const leftArcShape = new THREE.BufferGeometry().setFromPoints(leftArcPts);
  const leftArc = new THREE.Line(leftArcShape, whiteLine);
  scene.add(leftArc);

  const rightArcShape = new THREE.BufferGeometry().setFromPoints(rightArcPts);
  const rightArc = new THREE.Line(rightArcShape, whiteLine);
  scene.add(rightArc);

  // === Outer Boundary === //
  const edgeVertices = [
    new THREE.Vector3(-15, 0.11, -7.5),
    new THREE.Vector3(-15, 0.11, 7.5),
    new THREE.Vector3(15, 0.11, 7.5),
    new THREE.Vector3(15, 0.11, -7.5),
    new THREE.Vector3(-15, 0.11, -7.5),
  ];
  const boundaryShape = new THREE.BufferGeometry().setFromPoints(edgeVertices);
  const boundaryLines = new THREE.Line(boundaryShape, whiteLine);
  scene.add(boundaryLines);
}

function createBasketballHoop(positionX) {
  const isRightSide = positionX === 15;
  const sideMultiplier = isRightSide ? 1 : -1;

  // === Support Pole === //
  const supportPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 4, 32),
    new THREE.MeshPhongMaterial({ color: 0x413DC3 })
  );
  const poleX = isRightSide ? positionX + 0.8 : positionX - 0.8;
  supportPole.position.set(poleX, 1.5, 0);
  supportPole.castShadow = true;
  scene.add(supportPole);
  
  // === Diagonal Support Arm === //
  const armMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.1, 0.1),
    new THREE.MeshPhongMaterial({ color: 0x413DC3 })
  );

  armMesh.position.set(sideMultiplier * -0.4, 1.8, 0);
  armMesh.castShadow = true;
  supportPole.add(armMesh);

  // === Transparent Backboard === //
  const boardShape = new THREE.BoxGeometry(0.05, 1.8, 3.5);
  const boardMaterial = new THREE.MeshPhongMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.5,
    depthWrite: true,
  });
  const board = new THREE.Mesh(boardShape, boardMaterial);
  board.position.set(sideMultiplier * -0.4, 0.5, 0);
  board.castShadow = true;
  board.renderOrder = 0;
  armMesh.add(board);

  // === Backboard Lines === //
  function buildBoxOutline(w, h, shiftX, thickness = 0.05) {
    const frame = new THREE.Group();
    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const horizontal = new THREE.BoxGeometry(thickness, thickness, w + 0.05);
    const vertical = new THREE.BoxGeometry(thickness, h, thickness);

    const topEdge = new THREE.Mesh(horizontal, lineMaterial);
    topEdge.position.set(shiftX, h / 2, 0);
    frame.add(topEdge);

    const bottomEdge = topEdge.clone();
    bottomEdge.position.set(shiftX, -h / 2, 0);
    frame.add(bottomEdge);

    const leftEdge = new THREE.Mesh(vertical, lineMaterial);
    leftEdge.position.set(shiftX, 0, -w / 2);
    frame.add(leftEdge);

    const rightEdge = leftEdge.clone();
    rightEdge.position.set(shiftX, 0, w / 2);
    frame.add(rightEdge);

    return frame;
  }

  const outerBox = buildBoxOutline(3.55, 1.8, 0);
  const innerBox = buildBoxOutline(1.4, 0.8, 0);
  innerBox.position.y = -0.2;
  board.add(outerBox, innerBox);

  // === Rim === //
  const rimX = sideMultiplier * -0.55;
  const ringGeometry = new THREE.TorusGeometry(0.5, 0.04, 16, 100);
  const ringMaterial = new THREE.MeshPhongMaterial({ color: 0xff6600 });
  const rimMesh = new THREE.Mesh(ringGeometry, ringMaterial);
  rimMesh.rotation.x = degrees_to_radians(90);
  rimMesh.position.set(rimX, -0.6, 0);
  rimMesh.castShadow = true;
  rimMesh.receiveShadow = true;
  rimMesh.renderOrder = 2;
  board.add(rimMesh);

  // === Chain Net === //
  const netLines = new THREE.Group();
  const chainMaterial = new THREE.LineBasicMaterial({ color: 0xaaaaaa });
  const totalLines = 20;
  const outerR = 0.5;
  const innerR = 0.25;
  const netDrop = 0.8;

  for (let n = 0; n < totalLines; n++) {
    const angle = (n / totalLines) * Math.PI * 2;
    const [xA, zA] = [outerR * Math.cos(angle), outerR * Math.sin(angle)];
    const [xB, zB] = [innerR * Math.cos(angle), innerR * Math.sin(angle)];
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(xA, 0, zA),
      new THREE.Vector3((xA + xB) / 2, -netDrop * 0.4, (zA + zB) / 2),
      new THREE.Vector3(xB, -netDrop, zB)
    ]);
    const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(10));
    const line = new THREE.Line(geometry, chainMaterial);
    netLines.add(line);
  }
  netLines.rotation.x = degrees_to_radians(-90);
  rimMesh.add(netLines);
}

function createBasketball() {
  const ballRadius = 0.24;
  const ballGeom = new THREE.SphereGeometry(ballRadius, 32, 32);

  textureLoader.load('resources/BasketballTexture.png', // basketball texture
    (texture) => {
      const basketballMaterial = new THREE.MeshStandardMaterial({ map: texture });
      const basketball = new THREE.Mesh(ballGeom, basketballMaterial);
      basketball.position.set(0, ballRadius + 0.1, 0);
      basketball.castShadow = true;
      scene.add(basketball);
      addBands(basketball);
    },
    undefined,
    () => { // Fallback if texture fails
      const fallbackMaterial = new THREE.MeshStandardMaterial({ color: 0xff8c00 });
      const basketball = new THREE.Mesh(ballGeom, fallbackMaterial);
      basketball.position.set(0, ballRadius + 0.1, 0);
      basketball.castShadow = true;
      scene.add(basketball);
      addBands(basketball);
    }
  );

    // Function to add torus bands
    function addBands(ball) {
      const bandMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });

      const bands = [];

      // Vertical band 1
      const ring1 = new THREE.Mesh(new THREE.TorusGeometry(ballRadius, 0.002, 16, 100), bandMaterial);
      ring1.rotation.y = degrees_to_radians(90);
      bands.push(ring1);

      // Vertical band 2 (offset slightly to simulate real ball curve)
      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(ballRadius, 0.002, 16, 100), bandMaterial);
      //ring3.rotation.y = degrees_to_radians(0);
      bands.push(ring2);

      // Vertical band 3
      const ring3 = new THREE.Mesh(new THREE.TorusGeometry(ballRadius, 0.002, 16, 100), bandMaterial);
      ring3.rotation.y = degrees_to_radians(45);
      bands.push(ring3);

      // Vertical band 3
      const ring4 = new THREE.Mesh(new THREE.TorusGeometry(ballRadius, 0.002, 16, 100), bandMaterial);
      ring4.rotation.y = degrees_to_radians(135);
      bands.push(ring4);

      // Group rings with the basketball
      bands.forEach(b => ball.add(b));
    }
}

function createSideBenches() {
  const benchLength = 6;
  const seatHeight = 0.2;
  const legHeight = 0.5;
  const legWidth = 0.1;
  const red = 0xff0000;

  const seatMat = new THREE.MeshPhongMaterial({ color: red });
  const legMat = new THREE.MeshPhongMaterial({ color: 0x333333 });

  function makeSideBench(xPos, zPos, rotationY) {
    const group = new THREE.Group();

    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(benchLength, seatHeight, 0.4),
      seatMat
    );
    seat.position.set(0, legHeight + seatHeight / 2, 0);
    seat.castShadow = true;
    group.add(seat);

    for (let x = -benchLength / 2 + 0.5; x <= benchLength / 2 - 0.5; x += 2) {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(legWidth, legHeight, legWidth),
        legMat
      );
      leg.position.set(x, legHeight / 2, 0);
      leg.castShadow = true;
      group.add(leg);
    }

    group.rotation.y = rotationY;
    group.position.set(xPos, 0, zPos);
    scene.add(group);
  }

  // Match X positions of hoop poles: ±15.8
  makeSideBench(15.8, 4.5, Math.PI / 2);    // right side bench closer in
  makeSideBench(-15.8, -4.5, -Math.PI / 2); // left side bench closer in
}

function createBleachers() {
  const bleacherGroup = new THREE.Group();
  const courtWidth = 30;
  const rowCount = 4;
  const rowDepth = 0.6;
  const rowHeight = 0.5;
  const seatColor = 0xff6600;
  const supportColor = 0x999999;

  for (let row = 0; row < rowCount; row++) {
    const y = (row + 1) * rowHeight;
    const zOffset = row * rowDepth;

    // Orange seat slab
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(courtWidth, 0.2, 0.5),
      new THREE.MeshPhongMaterial({ color: seatColor })
    );
    seat.position.set(0, y, zOffset);
    seat.castShadow = true;
    seat.receiveShadow = true;
    bleacherGroup.add(seat);

    // Metal legs (every ~5 units)
    for (let x = -courtWidth / 2 + 1.5; x <= courtWidth / 2 - 1.5; x += 3) {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, y, 0.1),
        new THREE.MeshPhongMaterial({ color: supportColor })
      );
      leg.position.set(x, y / 2, zOffset);
      leg.castShadow = true;
      bleacherGroup.add(leg);
    }
  }

  // Clone for both front and back
  const bleacherFront = bleacherGroup.clone();
  const bleacherBack = bleacherGroup.clone();
  bleacherBack.rotation.y = Math.PI;

  bleacherFront.position.z = 8.5;
  bleacherBack.position.z = -8.5;

  scene.add(bleacherFront);
  scene.add(bleacherBack);
}

// Create all elements
createBasketballCourt();
createBasketball();
createSideBenches();
createBleachers();

// Set camera position for better view
const cameraTranslate = new THREE.Matrix4();
cameraTranslate.makeTranslation(0, 15, 30);
camera.applyMatrix4(cameraTranslate);

// Orbit controls
const controls = new OrbitControls(camera, renderer.domElement);
let isOrbitEnabled = true;

// Instructions display
const instructionsElement = document.createElement('div');
instructionsElement.style.position = 'absolute';
instructionsElement.style.bottom = '20px';
instructionsElement.style.left = '20px';
instructionsElement.style.color = 'white';
instructionsElement.style.fontSize = '16px';
instructionsElement.style.fontFamily = 'Arial, sans-serif';
instructionsElement.style.textAlign = 'left';
instructionsElement.innerHTML = `
  <h3>Controls:</h3>
  <p>O - Toggle orbit camera</p>
`;
document.body.appendChild(instructionsElement);


// Score Display Container
const scoreElement = document.createElement('div');
scoreElement.id = 'score-display';
scoreElement.style.position = 'absolute';
scoreElement.style.top = '20px';
scoreElement.style.left = '20px';
scoreElement.style.color = 'white';
scoreElement.style.fontSize = '18px';
scoreElement.style.fontFamily = 'Arial, sans-serif';
scoreElement.style.padding = '10px';
scoreElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
scoreElement.innerHTML = `<strong>Score:</strong> Team A 0 - 0 Team B`;
document.body.appendChild(scoreElement);

// Future Controls Display Container
const controlsContainer = document.createElement('div');
controlsContainer.id = 'controls-display';
controlsContainer.style.position = 'absolute';
controlsContainer.style.top = '60px';
controlsContainer.style.left = '20px';
controlsContainer.style.color = 'white';
controlsContainer.style.fontSize = '14px';
controlsContainer.style.fontFamily = 'Arial, sans-serif';
controlsContainer.style.padding = '8px';
controlsContainer.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
controlsContainer.innerHTML = `<strong>Future Controls:</strong> Coming in HW06`;
document.body.appendChild(controlsContainer);

// Handle key events
function handleKeyDown(e) {
  if (e.key === "o") {
    isOrbitEnabled = !isOrbitEnabled;
  }
}

document.addEventListener('keydown', handleKeyDown);

// Animation function
function animate() {
  requestAnimationFrame(animate);
  
  // Update controls
  controls.enabled = isOrbitEnabled;
  controls.update();
  
  renderer.render(scene, camera);
}

animate();