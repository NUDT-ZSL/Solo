import * as THREE from 'three';

const ROOM_WIDTH = 4;
const ROOM_HEIGHT = 3;
const ROOM_DEPTH = 3;
const WINDOW_WIDTH = 1.5;
const WINDOW_HEIGHT = 1.2;

export function buildRoom(scene: THREE.Scene): void {
  const wallMat = new THREE.MeshStandardMaterial({
    color: 0xF5F0E8,
    roughness: 0.85,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });

  const floorMat = new THREE.MeshStandardMaterial({
    color: 0x8B7355,
    roughness: 0.6,
    metalness: 0.05,
  });

  const ceilingMat = new THREE.MeshStandardMaterial({
    color: 0xF0EDE5,
    roughness: 0.9,
    metalness: 0.0,
  });

  const windowFrameMat = new THREE.MeshStandardMaterial({
    color: 0x5C5C5C,
    roughness: 0.3,
    metalness: 0.6,
  });

  const windowGlassMat = new THREE.MeshStandardMaterial({
    color: 0xADD8E6,
    roughness: 0.05,
    metalness: 0.1,
    transparent: true,
    opacity: 0.25,
  });

  const floor = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM_WIDTH, 0.05, ROOM_DEPTH),
    floorMat
  );
  floor.position.set(0, 0, 0);
  floor.receiveShadow = true;
  scene.add(floor);

  const ceiling = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM_WIDTH, 0.05, ROOM_DEPTH),
    ceilingMat
  );
  ceiling.position.set(0, ROOM_HEIGHT, 0);
  scene.add(ceiling);

  const backWall = new THREE.Mesh(
    new THREE.BoxGeometry(ROOM_WIDTH, ROOM_HEIGHT, 0.05),
    wallMat
  );
  backWall.position.set(0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2);
  backWall.receiveShadow = true;
  scene.add(backWall);

  const leftWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, ROOM_HEIGHT, ROOM_DEPTH),
    wallMat
  );
  leftWall.position.set(-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  const rightWall = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, ROOM_HEIGHT, ROOM_DEPTH),
    wallMat
  );
  rightWall.position.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
  rightWall.receiveShadow = true;
  scene.add(rightWall);

  buildFrontWallWithWindow(scene, wallMat, windowFrameMat, windowGlassMat);

  buildFurniture(scene);
}

function buildFrontWallWithWindow(
  scene: THREE.Scene,
  wallMat: THREE.MeshStandardMaterial,
  frameMat: THREE.MeshStandardMaterial,
  glassMat: THREE.MeshStandardMaterial
): void {
  const wallZ = ROOM_DEPTH / 2;
  const wallThickness = 0.05;
  const winW = WINDOW_WIDTH;
  const winH = WINDOW_HEIGHT;
  const winBottomY = 1.0;
  const winCenterX = 0;
  const winCenterY = winBottomY + winH / 2;

  const leftPartW = ROOM_WIDTH / 2 + winCenterX - winW / 2;
  if (leftPartW > 0.01) {
    const leftPart = new THREE.Mesh(
      new THREE.BoxGeometry(leftPartW, ROOM_HEIGHT, wallThickness),
      wallMat
    );
    leftPart.position.set(
      -ROOM_WIDTH / 2 + leftPartW / 2,
      ROOM_HEIGHT / 2,
      wallZ
    );
    leftPart.receiveShadow = true;
    scene.add(leftPart);
  }

  const rightPartW = ROOM_WIDTH / 2 - winCenterX - winW / 2;
  if (rightPartW > 0.01) {
    const rightPart = new THREE.Mesh(
      new THREE.BoxGeometry(rightPartW, ROOM_HEIGHT, wallThickness),
      wallMat
    );
    rightPart.position.set(
      ROOM_WIDTH / 2 - rightPartW / 2,
      ROOM_HEIGHT / 2,
      wallZ
    );
    rightPart.receiveShadow = true;
    scene.add(rightPart);
  }

  const belowH = winBottomY;
  if (belowH > 0.01) {
    const belowPart = new THREE.Mesh(
      new THREE.BoxGeometry(winW, belowH, wallThickness),
      wallMat
    );
    belowPart.position.set(winCenterX, belowH / 2, wallZ);
    belowPart.receiveShadow = true;
    scene.add(belowPart);
  }

  const aboveH = ROOM_HEIGHT - winBottomY - winH;
  if (aboveH > 0.01) {
    const abovePart = new THREE.Mesh(
      new THREE.BoxGeometry(winW, aboveH, wallThickness),
      wallMat
    );
    abovePart.position.set(
      winCenterX,
      winBottomY + winH + aboveH / 2,
      wallZ
    );
    abovePart.receiveShadow = true;
    scene.add(abovePart);
  }

  const frameThickness = 0.04;
  const frameDepth = 0.12;

  const topFrame = new THREE.Mesh(
    new THREE.BoxGeometry(winW + frameThickness * 2, frameThickness, frameDepth),
    frameMat
  );
  topFrame.position.set(winCenterX, winBottomY + winH, wallZ);
  scene.add(topFrame);

  const bottomFrame = new THREE.Mesh(
    new THREE.BoxGeometry(winW + frameThickness * 2, frameThickness, frameDepth),
    frameMat
  );
  bottomFrame.position.set(winCenterX, winBottomY, wallZ);
  scene.add(bottomFrame);

  const leftFrame = new THREE.Mesh(
    new THREE.BoxGeometry(frameThickness, winH, frameDepth),
    frameMat
  );
  leftFrame.position.set(winCenterX - winW / 2, winCenterY, wallZ);
  scene.add(leftFrame);

  const rightFrame = new THREE.Mesh(
    new THREE.BoxGeometry(frameThickness, winH, frameDepth),
    frameMat
  );
  rightFrame.position.set(winCenterX + winW / 2, winCenterY, wallZ);
  scene.add(rightFrame);

  const midVertFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.02, winH, frameDepth),
    frameMat
  );
  midVertFrame.position.set(winCenterX, winCenterY, wallZ);
  scene.add(midVertFrame);

  const midHorizFrame = new THREE.Mesh(
    new THREE.BoxGeometry(winW, 0.02, frameDepth),
    frameMat
  );
  midHorizFrame.position.set(winCenterX, winCenterY, wallZ);
  scene.add(midHorizFrame);

  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(winW, winH),
    glassMat
  );
  glass.position.set(winCenterX, winCenterY, wallZ + 0.01);
  scene.add(glass);
}

function buildFurniture(scene: THREE.Scene): void {
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0xD4A574,
    roughness: 0.55,
    metalness: 0.05,
  });

  const darkWoodMat = new THREE.MeshStandardMaterial({
    color: 0x8B6914,
    roughness: 0.5,
    metalness: 0.05,
  });

  const cushionMat = new THREE.MeshStandardMaterial({
    color: 0x6B4C3B,
    roughness: 0.8,
    metalness: 0.0,
  });

  const metalMat = new THREE.MeshStandardMaterial({
    color: 0x888888,
    roughness: 0.3,
    metalness: 0.8,
  });

  const bookMats = [
    new THREE.MeshStandardMaterial({ color: 0xCC3333, roughness: 0.7, metalness: 0.0 }),
    new THREE.MeshStandardMaterial({ color: 0x3366CC, roughness: 0.7, metalness: 0.0 }),
    new THREE.MeshStandardMaterial({ color: 0x33AA33, roughness: 0.7, metalness: 0.0 }),
    new THREE.MeshStandardMaterial({ color: 0xCCAA33, roughness: 0.7, metalness: 0.0 }),
    new THREE.MeshStandardMaterial({ color: 0x9933CC, roughness: 0.7, metalness: 0.0 }),
  ];

  buildTable(scene, woodMat, metalMat);
  buildChair(scene, woodMat, cushionMat);
  buildBookshelf(scene, darkWoodMat, bookMats);
  buildRug(scene);
}

function buildTable(
  scene: THREE.Scene,
  topMat: THREE.MeshStandardMaterial,
  legMat: THREE.MeshStandardMaterial
): void {
  const tableTop = new THREE.Mesh(
    new THREE.BoxGeometry(1.2, 0.04, 0.7),
    topMat
  );
  tableTop.position.set(-0.5, 0.75, -0.3);
  tableTop.castShadow = true;
  tableTop.receiveShadow = true;
  scene.add(tableTop);

  const legPositions = [
    [-1.05, -0.6],
    [0.05, -0.6],
    [-1.05, 0.0],
    [0.05, 0.0],
  ];

  for (const [lx, lz] of legPositions) {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.73, 0.04),
      legMat
    );
    leg.position.set(lx, 0.365, lz);
    leg.castShadow = true;
    scene.add(leg);
  }
}

function buildChair(
  scene: THREE.Scene,
  woodMat: THREE.MeshStandardMaterial,
  cushionMat: THREE.MeshStandardMaterial
): void {
  const seat = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.04, 0.45),
    woodMat
  );
  seat.position.set(0.6, 0.45, -0.2);
  seat.castShadow = true;
  scene.add(seat);

  const cushion = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.05, 0.4),
    cushionMat
  );
  cushion.position.set(0.6, 0.495, -0.2);
  scene.add(cushion);

  const back = new THREE.Mesh(
    new THREE.BoxGeometry(0.45, 0.5, 0.04),
    woodMat
  );
  back.position.set(0.6, 0.72, -0.41);
  back.castShadow = true;
  scene.add(back);

  const legPositions = [
    [0.4, -0.4],
    [0.8, -0.4],
    [0.4, 0.0],
    [0.8, 0.0],
  ];

  for (const [lx, lz] of legPositions) {
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.43, 8),
      woodMat
    );
    leg.position.set(lx, 0.215, lz);
    leg.castShadow = true;
    scene.add(leg);
  }
}

function buildBookshelf(
  scene: THREE.Scene,
  woodMat: THREE.MeshStandardMaterial,
  bookMats: THREE.MeshStandardMaterial[]
): void {
  const shelfW = 0.9;
  const shelfH = 1.8;
  const shelfD = 0.3;
  const shelfX = -1.3;
  const shelfZ = -1.2;

  const leftSide = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, shelfH, shelfD),
    woodMat
  );
  leftSide.position.set(shelfX - shelfW / 2 + 0.015, shelfH / 2, shelfZ);
  leftSide.castShadow = true;
  scene.add(leftSide);

  const rightSide = new THREE.Mesh(
    new THREE.BoxGeometry(0.03, shelfH, shelfD),
    woodMat
  );
  rightSide.position.set(shelfX + shelfW / 2 - 0.015, shelfH / 2, shelfZ);
  rightSide.castShadow = true;
  scene.add(rightSide);

  const backBoard = new THREE.Mesh(
    new THREE.BoxGeometry(shelfW, shelfH, 0.02),
    woodMat
  );
  backBoard.position.set(shelfX, shelfH / 2, shelfZ - shelfD / 2 + 0.01);
  scene.add(backBoard);

  const shelfCount = 4;
  for (let i = 0; i <= shelfCount; i++) {
    const y = (shelfH / shelfCount) * i;
    const shelfBoard = new THREE.Mesh(
      new THREE.BoxGeometry(shelfW, 0.025, shelfD),
      woodMat
    );
    shelfBoard.position.set(shelfX, y + 0.0125, shelfZ);
    shelfBoard.castShadow = true;
    shelfBoard.receiveShadow = true;
    scene.add(shelfBoard);

    if (i < shelfCount) {
      const bookCount = 4 + Math.floor(Math.random() * 3);
      let bookX = shelfX - shelfW / 2 + 0.06;
      for (let b = 0; b < bookCount && bookX < shelfX + shelfW / 2 - 0.08; b++) {
        const bookW = 0.03 + Math.random() * 0.04;
        const bookH = 0.25 + Math.random() * 0.15;
        const bookMesh = new THREE.Mesh(
          new THREE.BoxGeometry(bookW, bookH, shelfD * 0.7),
          bookMats[b % bookMats.length]
        );
        const bookY = y + 0.025 + bookH / 2;
        bookMesh.position.set(bookX, bookY, shelfZ);
        bookMesh.castShadow = true;
        scene.add(bookMesh);
        bookX += bookW + 0.01;
      }
    }
  }
}

function buildRug(scene: THREE.Scene): void {
  const rugMat = new THREE.MeshStandardMaterial({
    color: 0x6B3A5A,
    roughness: 0.95,
    metalness: 0.0,
  });

  const rug = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.005, 1.5),
    rugMat
  );
  rug.position.set(-0.3, 0.028, -0.2);
  rug.receiveShadow = true;
  scene.add(rug);

  const rugBorderMat = new THREE.MeshStandardMaterial({
    color: 0x8B5A7A,
    roughness: 0.9,
    metalness: 0.0,
  });

  const borderStrips = [
    { w: 2.0, d: 0.06, x: -0.3, z: -0.2 - 0.72 },
    { w: 2.0, d: 0.06, x: -0.3, z: -0.2 + 0.72 },
    { w: 0.06, d: 1.44, x: -0.3 - 0.97, z: -0.2 },
    { w: 0.06, d: 1.44, x: -0.3 + 0.97, z: -0.2 },
  ];

  for (const strip of borderStrips) {
    const border = new THREE.Mesh(
      new THREE.BoxGeometry(strip.w, 0.006, strip.d),
      rugBorderMat
    );
    border.position.set(strip.x, 0.029, strip.z);
    border.receiveShadow = true;
    scene.add(border);
  }
}
