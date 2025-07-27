import {OrbitControls} from './OrbitControls.js'

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });

const powerBar = document.getElementById('power-bar');
const powerText = document.getElementById('power-text');
const totalScoreText = document.getElementById('total-score');
const shotsAttemptedText = document.getElementById('shots-attempted');
const shotsScoredText = document.getElementById('shots-scored');
const shotsAccuracyText = document.getElementById('shots-accuracy');
const shotStatus = document.getElementById("shot-status");

let basketball;
const moveSpeed = 0.1;
const ballRadius = 0.24;
const groundLevel = ballRadius + 0.1;

const courtBounderies = {
  minX: -14.5,
  maxX: 14.5,
  minZ: -7.5,
  maxZ: 7.5
};

const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    w: false,
    s: false,
    ' ': false
};

const scoreSound = new Audio('resources/score.mp3');
const missSound = new Audio('resources/miss.mp3');
const bounceSound = new Audio('resources/bounce.mp3');

// Optional: make them a bit quieter
scoreSound.volume = 0.5;
missSound.volume = 0.5;
bounceSound.volume = 0.5;


const startingPowerLevel = 50;
const maxPower = 100;
const minPower = 0;
let powerLevel = startingPowerLevel;

const gravity = -9.8; // gravity acceleration
let ballShotVelocity = new THREE.Vector3(0, 0, 0);
let isInAir = false; // prevents shooting again mid-flight
const baseShotSpeed = 15;
const arcAngleDeg = 75;

const bounceDamping = 0.6; // Bounce energy loss (0 = no bounce, 1 = perfect bounce)
const hoopRimsPositions = [];
const rimRadius = 0.5;

let shotsAttempted = 0;
let shotsMade = 0;
let score = 0;

const ballTrail = [];
const maxTrailLength = 30; // adjust for longer trail

const fixedDelta = 1 / 60;
const backspinSpeed = 4; 


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

// Ghost arc variables
const arcPoints = [];
const arcSegments = 60; // number of points in the arc
const arcGeometry = new THREE.BufferGeometry();
const arcMaterial = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.4 });
const arcLine = new THREE.Line(arcGeometry, arcMaterial);
scene.add(arcLine);

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
  const ringGeometry = new THREE.TorusGeometry(rimRadius, 0.04, 16, 100);
  const ringMaterial = new THREE.MeshPhongMaterial({ color: 0xff6600 });
  const rimMesh = new THREE.Mesh(ringGeometry, ringMaterial);
  rimMesh.rotation.x = degrees_to_radians(90);
  rimMesh.position.set(rimX, -0.6, 0);
  rimMesh.castShadow = true;
  rimMesh.receiveShadow = true;
  rimMesh.renderOrder = 2;
  board.add(rimMesh);
  const rimPos = new THREE.Vector3();
  rimMesh.getWorldPosition(rimPos);
  hoopRimsPositions.push(rimPos.clone());

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
  const ballGeom = new THREE.SphereGeometry(ballRadius, 32, 32);
  
  textureLoader.load('resources/BasketballTexture.png',
    (texture) => {
      const basketballMaterial = new THREE.MeshStandardMaterial({ map: texture });
      basketball = new THREE.Mesh(ballGeom, basketballMaterial);
      basketball.position.set(0, groundLevel, 0);
      basketball.castShadow = true;
      scene.add(basketball);
      addBands(basketball);
    },
    undefined,
    () => {
      const fallbackMaterial = new THREE.MeshStandardMaterial({ color: 0xff8c00 });
      basketball = new THREE.Mesh(ballGeom, fallbackMaterial);
      basketball.position.set(0, groundLevel, 0);
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

document.addEventListener('keydown', (event) => {
  if (!basketball) return;

  if (keys.hasOwnProperty(event.key)) {
        keys[event.key] = true;
  }

  switch (event.key) {
    case 'o':
      isOrbitEnabled = !isOrbitEnabled;
      break;
    case ' ':
      if (!isInAir) {
        shotsAttempted++;
        shootBall();
      } 
      break;
    case 'r':
      reset();
      break;
  }
});

document.addEventListener('keyup', (event) => {
    if (keys.hasOwnProperty(event.key)) {
        keys[event.key] = false;
    }
});

function reset() {
  if (!basketball) return;

  basketball.position.set(0, groundLevel, 0);
  ballShotVelocity.set(0, 0, 0);
  isInAir = false;
  ballTrail.forEach(dot => scene.remove(dot));
  ballTrail.length = 0;
  powerLevel = 50;
}

function shootBall() {
  calculateArc();
  isInAir = true;
}

function calculateArc() {
  const distToHoop1 = basketball.position.distanceTo(hoopRimsPositions[0]);
  const distToHoop2 = basketball.position.distanceTo(hoopRimsPositions[1]);
  const targetHoop = distToHoop1 < distToHoop2 ? hoopRimsPositions[0] : hoopRimsPositions[1];

  const startPos = basketball.position.clone();
  const horizontalDir = new THREE.Vector3(targetHoop.x - startPos.x, 0, targetHoop.z - startPos.z).normalize();

  const arcAngle = degrees_to_radians(arcAngleDeg);
  const arcDir = new THREE.Vector3(
    horizontalDir.x * Math.cos(arcAngle),
    Math.sin(arcAngle),
    horizontalDir.z * Math.cos(arcAngle)
  ).normalize();

  // Scale velocity based on shootPower
  const speed = baseShotSpeed * (powerLevel / maxPower);

  // Final velocity
  ballShotVelocity.copy(arcDir.multiplyScalar(speed));
}

function updateScoreUI() {
  const accuracy = shotsAttempted > 0 ? ((shotsMade / shotsAttempted) * 100).toFixed(1) : 0;
  totalScoreText.textContent = `Total Score: ${score}`;
  shotsAttemptedText.textContent = `Shots Attempted: ${shotsAttempted}`;
  shotsScoredText.textContent = `Shots Scored: ${shotsMade}`;
  shotsAccuracyText.textContent = `Shots Accuracy: ${accuracy}%`;
}

function showMessage(text, color) {
  shotStatus.textContent = text;
  shotStatus.style.color = color || "red";
  shotStatus.style.backgroundColor = "rgba(0, 0, 0, 0.5)";

  setTimeout(() => {
    shotStatus.textContent = "";
    shotStatus.backgroundColor = "rgba(0, 0, 0, 0.0)";
  }, 1500);
}

// Animation function
function animate() {
  requestAnimationFrame(animate);

  if (!basketball) return;

  controls.enabled = isOrbitEnabled;
  controls.update();

  if (!isInAir) {
    const deltaPosition = new THREE.Vector3(0, 0, 0);

    // Move ball based on input
    if (keys.ArrowUp) deltaPosition.z -= moveSpeed;
    if (keys.ArrowDown) deltaPosition.z += moveSpeed;
    if (keys.ArrowLeft) deltaPosition.x -= moveSpeed;
    if (keys.ArrowRight) deltaPosition.x += moveSpeed;

    basketball.position.add(deltaPosition);
    // Boundary clamp to court
    basketball.position.x = THREE.MathUtils.clamp(basketball.position.x, courtBounderies.minX, courtBounderies.maxX);
    basketball.position.z = THREE.MathUtils.clamp(basketball.position.z, courtBounderies.minZ, courtBounderies.maxZ);

    // Roll ball
    const movement = deltaPosition.length();
    if (movement > 0) {
      const moveDir = deltaPosition.clone().normalize();
      const axis = new THREE.Vector3(moveDir.z, 0, -moveDir.x).normalize();
      const angle = movement / ballRadius;
      basketball.rotateOnWorldAxis(axis, angle);
    }

    // Update power level based on input
    if (keys.w) powerLevel += 0.5;
    if (keys.s) powerLevel -= 0.5;

    // Power clamp to min/max
    powerLevel = THREE.MathUtils.clamp(powerLevel, minPower, maxPower);
    const percent = (powerLevel / maxPower) * 100;
    powerBar.style.height = percent + "%";

    // Update power bar accordingly
    if (percent < 50) {
      powerBar.style.background = 'limegreen';
    } else if (percent < 80) {
      powerBar.style.background = 'gold';
    } else {
      powerBar.style.background = 'red';
    }

    powerText.textContent = `Power: ${powerLevel.toFixed(0)} %`;

  } else {
    updateBallPosition();

    // Get closest hoop position
    const distToHoop1 = basketball.position.distanceTo(hoopRimsPositions[0]);
    const distToHoop2 = basketball.position.distanceTo(hoopRimsPositions[1]);
    const targetHoop = distToHoop1 < distToHoop2 ? hoopRimsPositions[0] : hoopRimsPositions[1];

    checkCollisionWithBoard(targetHoop);
    checkCollisionWithHoop(targetHoop);

    // Update trails
    const trailDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffa500, transparent: true, opacity: 0.4 })
    );

    trailDot.position.copy(basketball.position);
    scene.add(trailDot);
    ballTrail.push(trailDot);

    // Remove old trail parts
    if (ballTrail.length > maxTrailLength) {
      const old = ballTrail.shift();
      scene.remove(old);
    }

    ballTrail.forEach((dot, i) => {
      dot.material.opacity = Math.max(0, 0.4 * ((maxTrailLength - i) / maxTrailLength));
    });
  }

  renderer.render(scene, camera);
}

function updateBallPosition() {
  ballShotVelocity.y += gravity * fixedDelta;
  basketball.position.addScaledVector(ballShotVelocity, fixedDelta);

  // Add backspin to ball when thrown
  const spinAxis = new THREE.Vector3(ballShotVelocity.z, 0, -ballShotVelocity.x).normalize();
  basketball.rotateOnWorldAxis(spinAxis, backspinSpeed * fixedDelta);
  
  if (basketball.position.y <= groundLevel) {
    basketball.position.y = groundLevel;
    ballShotVelocity.y *= -bounceDamping;
    bounceSound.play();
      
    if (Math.abs(ballShotVelocity.y) < 0.5) {
      ballShotVelocity.y = 0;
      isInAir = false;
      ballTrail.forEach(dot => scene.remove(dot));
      ballTrail.length = 0;
      showMessage("MISSED SHOT", "red");
      missSound.play();
        
      // Ball went out of bounds so resetting it to the middle of the court
      if (basketball.position.x > courtBounderies.maxX || basketball.position.x < courtBounderies.minX ||
        basketball.position.z > courtBounderies.maxZ || basketball.position.z < courtBounderies.minZ
      ) reset();

      return;
    }
  }
}

function checkCollisionWithBoard(hoopPosition) {
  const backboardX = hoopPosition.x + (hoopPosition.x < 0 ? -0.55 : 0.55);
  const backboardHalfWidth = 1.75;
  const backboardTop = hoopPosition.y + 1.5;
  const backboardBottom = hoopPosition.y -0.3;

  // Check if ball is within the board ZY plane
  const inBackboardZ = Math.abs(basketball.position.z - hoopPosition.z) <= backboardHalfWidth;
  const inBackboardY = basketball.position.y <= backboardTop && basketball.position.y >= backboardBottom;

  if (inBackboardZ && inBackboardY) {
    // Check if ball is Within close range of X plane and moving towards the board
    const movingTowardBoard = (hoopPosition.x > 0 && ballShotVelocity.x > 0) || (hoopPosition.x < 0 && ballShotVelocity.x < 0);
    const crossedPlane = Math.abs(basketball.position.x - backboardX) <= 0.2;
    
    if (movingTowardBoard && crossedPlane) {
      ballShotVelocity.x *= -bounceDamping;
      basketball.position.x = backboardX + (hoopPosition.x > 0 ? -ballRadius : ballRadius);
      bounceSound.play();
    }
  }
}

function checkCollisionWithHoop(hoopPosition) {
  const rimCenterXZ = new THREE.Vector2(hoopPosition.x, hoopPosition.z);
  const ballXZ = new THREE.Vector2(basketball.position.x, basketball.position.z);

  const horizontalDist = rimCenterXZ.distanceTo(ballXZ);
  const nearRimPlane = Math.abs(basketball.position.y - hoopPosition.y) < 0.2;

  // Check if ball is within hoop XZ plane and moving downwards to the hoop
  if (nearRimPlane && horizontalDist <= rimRadius && ballShotVelocity.y < 0 && basketball.position.y >= hoopPosition.y) {
    score += 2;
    shotsMade++;
    updateScoreUI();
    showMessage("SHOT MADE!", "lime");
    scoreSound.play();
    reset();
  } else if (nearRimPlane) { // Check for hoop collision
    const rimCenter = new THREE.Vector3(hoopPosition.x, basketball.position.y, hoopPosition.z);
    const distXZ = basketball.position.clone().setY(0).distanceTo(rimCenter.clone().setY(0));

    if (distXZ <= rimRadius + ballRadius) {
      const pushDir = basketball.position.clone().sub(rimCenter).normalize();
      ballShotVelocity.addScaledVector(pushDir, 2);
      ballShotVelocity.y *= bounceDamping;
      bounceSound.play();
    }
  }
}

animate();