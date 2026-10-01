import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.186.1/build/three.module.js';

const wasJustCaptured = (die) => Array.isArray(die.properties) &&
  die.properties.includes('WasJustCaptured');

const dieList = (player) => [
  ...(player.activeDieArray || []),
  ...(player.capturedDieArray || [])
    .filter(wasJustCaptured)
    .map((die) => ({ ...die, justCaptured: true })),
];

function sides(die) {
  const size = Number(die.sides ?? die.size ?? die.recipe);
  return Number.isFinite(size) && size > 0 ? size : 6;
}

function geometryFor(size) {
  switch (size) {
    case 4: return new THREE.TetrahedronGeometry(0.72);
    case 6: return new THREE.BoxGeometry(1.05, 1.05, 1.05);
    case 8: return new THREE.OctahedronGeometry(0.76);
    case 12: return new THREE.DodecahedronGeometry(0.76);
    case 20: return new THREE.IcosahedronGeometry(0.76);
    default:
      return new THREE.CylinderGeometry(0.68, 0.68, 0.18, Math.max(8, Math.min(size, 32)));
  }
}

function dieLabel(die, size) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  context.fillStyle = die.justCaptured ? 'rgba(180, 185, 187, 0.96)' : 'rgba(255, 255, 255, 0.96)';
  context.beginPath();
  context.roundRect(8, 8, 240, 112, 20);
  context.fill();
  context.fillStyle = die.justCaptured ? '#50575a' : '#16212a';
  context.textAlign = 'center';
  context.font = 'bold 68px sans-serif';
  context.fillText(String(die.value ?? die.currentValue ?? die.roll ?? '—'), 128, 78);
  if (die.justCaptured) {
    context.strokeStyle = '#50575a';
    context.lineWidth = 5;
    context.beginPath();
    context.moveTo(78, 58);
    context.lineTo(178, 58);
    context.stroke();
  }
  context.font = '24px sans-serif';
  context.fillText(`d${size}`, 128, 108);
  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false });
  const label = new THREE.Sprite(material);
  label.scale.set(1.1, 0.55, 1);
  label.position.y = 0.92;
  return label;
}

function makeDie(die, color) {
  const size = sides(die);
  const mesh = new THREE.Mesh(
    geometryFor(size),
    new THREE.MeshStandardMaterial({
      color: die.justCaptured ? '#737b7d' : color,
      roughness: 0.3,
      metalness: 0.12,
    }),
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.rotation.set(0.25, 0.4, 0.2);
  mesh.add(dieLabel(die, size));
  return mesh;
}

export function renderDiceScene(container, players, bottomPlayerIndex) {
  const width = container.clientWidth;
  const height = container.clientHeight;
  if (!width || !height) throw new Error('The game board has no size');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#182b29');
  const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
  camera.position.set(0, 11, 15);
  camera.lookAt(0, 0, 0);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.append(renderer.domElement);

  scene.add(new THREE.HemisphereLight('#ffffff', '#62746e', 2.1));
  const light = new THREE.DirectionalLight('#ffffff', 3);
  light.position.set(-5, 12, 7);
  light.castShadow = true;
  scene.add(light);

  const felt = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 10),
    new THREE.MeshStandardMaterial({ color: '#31564c', roughness: 0.94 }),
  );
  felt.rotation.x = -Math.PI / 2;
  felt.receiveShadow = true;
  scene.add(felt);

  const railMaterial = new THREE.MeshStandardMaterial({ color: '#70472d', roughness: 0.72 });
  for (const [x, z, width, depth] of [[0, -5.1, 18.3, 0.3], [0, 5.1, 18.3, 0.3], [-9, 0, 0.3, 10], [9, 0, 0.3, 10]]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(width, 0.55, depth), railMaterial);
    rail.position.set(x, 0.2, z);
    rail.castShadow = true;
    scene.add(rail);
  }

  const diceGroups = players.map((player, playerIndex) => {
    const group = new THREE.Group();
    const dice = dieList(player);
    const colors = playerIndex === 0 ? ['#53c8bd', '#298d89'] : ['#f2b562', '#bd713d'];
    dice.forEach((die, index) => {
      const mesh = makeDie(die, colors[index % colors.length]);
      mesh.position.x = (index - (dice.length - 1) / 2) * 1.45;
      mesh.position.y = 0.72;
      group.add(mesh);
    });
    scene.add(group);
    return group;
  });

  const positionPlayers = (bottom) => {
    diceGroups.forEach((group, index) => {
      group.position.z = index === bottom ? 2.1 : -2.1;
    });
    renderer.render(scene, camera);
  };
  positionPlayers(bottomPlayerIndex);

  const resize = () => {
    if (!container.isConnected) return;
    const nextWidth = container.clientWidth;
    const nextHeight = container.clientHeight;
    if (!nextWidth || !nextHeight) return;
    camera.aspect = nextWidth / nextHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(nextWidth, nextHeight);
    renderer.render(scene, camera);
  };
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
  observer?.observe(container);
  if (!observer) window.addEventListener('resize', resize);

  return {
    setBottomPlayerIndex: positionPlayers,
    dispose() {
      observer?.disconnect();
      if (!observer) window.removeEventListener('resize', resize);
      scene.traverse((object) => {
        object.geometry?.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => {
            material.map?.dispose();
            material.dispose();
          });
        } else if (object.material) {
          object.material.map?.dispose();
          object.material.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
