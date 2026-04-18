import * as THREE from "three";

import type { StudioWorldAssetDraft, StudioWorldDraft } from "@/lib/studio-world/types";

export const buildAssetMaterial = (
  color: string,
  emissive?: string | null,
) =>
  new THREE.MeshStandardMaterial({
    color,
    emissive: emissive ?? "#000000",
    emissiveIntensity: emissive ? 0.85 : 0,
    roughness: 0.62,
    metalness: emissive ? 0.22 : 0.08,
  });

export const buildGlowMaterial = (color: string) =>
  new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 1.2,
    transparent: true,
    opacity: 0.85,
    roughness: 0.18,
    metalness: 0.28,
  });

export const buildAssetGeometry = (kind: StudioWorldAssetDraft["kind"]) => {
  if (kind === "platform" || kind === "crate") {
    return new THREE.BoxGeometry(1, 1, 1);
  }
  if (kind === "tower" || kind === "beacon") {
    return new THREE.CylinderGeometry(0.5, 0.7, 1, 8);
  }
  if (kind === "rock") {
    return new THREE.DodecahedronGeometry(0.8, 0);
  }
  if (kind === "tree") {
    return new THREE.ConeGeometry(0.8, 1.4, 10);
  }
  if (kind === "portal") {
    return new THREE.TorusGeometry(0.6, 0.16, 16, 32);
  }
  if (kind === "avatar_head") {
    return new THREE.SphereGeometry(0.9, 24, 24);
  }
  if (kind === "avatar_hair") {
    return new THREE.ConeGeometry(1, 1.4, 14);
  }
  if (kind === "avatar_torso") {
    return new THREE.BoxGeometry(1, 1, 1);
  }
  if (kind === "avatar_limb") {
    return new THREE.CapsuleGeometry(0.22, 1.1, 8, 14);
  }
  if (kind === "avatar_accessory") {
    return new THREE.BoxGeometry(1, 0.28, 0.12);
  }
  if (kind === "avatar_orb") {
    return new THREE.OctahedronGeometry(0.82, 0);
  }
  return new THREE.BoxGeometry(1, 1, 1);
};

const createAssetMesh = (asset: StudioWorldAssetDraft) => {
  const material = buildAssetMaterial(asset.color, asset.emissive ?? null);

  if (asset.kind === "platform") {
    const mesh = new THREE.Mesh(buildAssetGeometry(asset.kind), material);
    mesh.scale.set(asset.scale[0], asset.scale[1], asset.scale[2]);
    return mesh;
  }

  if (asset.kind === "tower") {
    const mesh = new THREE.Mesh(buildAssetGeometry(asset.kind), material);
    mesh.scale.set(asset.scale[0], asset.scale[1], asset.scale[2]);
    return mesh;
  }

  if (asset.kind === "avatar_head") {
    const mesh = new THREE.Mesh(buildAssetGeometry(asset.kind), material);
    mesh.scale.set(asset.scale[0], asset.scale[1], asset.scale[2]);
    return mesh;
  }

  if (asset.kind === "avatar_hair") {
    const mesh = new THREE.Mesh(buildAssetGeometry(asset.kind), material);
    mesh.scale.set(asset.scale[0], asset.scale[1], asset.scale[2]);
    return mesh;
  }

  if (asset.kind === "avatar_torso") {
    const mesh = new THREE.Mesh(buildAssetGeometry(asset.kind), material);
    mesh.scale.set(asset.scale[0], asset.scale[1], asset.scale[2]);
    return mesh;
  }

  if (asset.kind === "avatar_limb") {
    const mesh = new THREE.Mesh(buildAssetGeometry(asset.kind), material);
    mesh.scale.set(asset.scale[0], asset.scale[1], asset.scale[2]);
    return mesh;
  }

  if (asset.kind === "avatar_accessory") {
    const group = new THREE.Group();
    const bar = new THREE.Mesh(buildAssetGeometry(asset.kind), material);
    const leftLens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.26, 0.1, 22),
      new THREE.MeshStandardMaterial({
        color: asset.color,
        emissive: asset.emissive ?? asset.color,
        emissiveIntensity: 1,
        roughness: 0.15,
        metalness: 0.42,
      }),
    );
    const rightLens = leftLens.clone();
    leftLens.rotation.z = Math.PI / 2;
    rightLens.rotation.z = Math.PI / 2;
    leftLens.position.x = -0.36;
    rightLens.position.x = 0.36;
    group.add(bar, leftLens, rightLens);
    group.scale.set(asset.scale[0], asset.scale[1], asset.scale[2]);
    return group;
  }

  if (asset.kind === "avatar_orb") {
    const group = new THREE.Group();
    const core = new THREE.Mesh(buildAssetGeometry(asset.kind), material);
    const halo = new THREE.Mesh(
      new THREE.TorusGeometry(0.75, 0.06, 12, 30),
      new THREE.MeshStandardMaterial({
        color: asset.emissive ?? asset.color,
        emissive: asset.emissive ?? asset.color,
        emissiveIntensity: 1.2,
        roughness: 0.12,
        metalness: 0.24,
      }),
    );
    halo.rotation.x = Math.PI / 3;
    group.add(core, halo);
    group.scale.set(asset.scale[0], asset.scale[1], asset.scale[2]);
    return group;
  }

  if (asset.kind === "arch") {
    const group = new THREE.Group();
    const legGeometry = new THREE.BoxGeometry(0.24, 1, 0.24);
    const beamGeometry = new THREE.BoxGeometry(1.35, 0.22, 0.3);
    const leftLeg = new THREE.Mesh(legGeometry, material);
    const rightLeg = new THREE.Mesh(legGeometry, material);
    const beam = new THREE.Mesh(beamGeometry, material);
    leftLeg.position.set(-0.42, 0.5, 0);
    rightLeg.position.set(0.42, 0.5, 0);
    beam.position.set(0, 1.02, 0);
    group.add(leftLeg, rightLeg, beam);
    group.scale.set(asset.scale[0], asset.scale[1], asset.scale[2]);
    return group;
  }

  if (asset.kind === "tree") {
    const group = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.2, 1, 8),
      new THREE.MeshStandardMaterial({
        color: "#6a4325",
        roughness: 0.86,
        metalness: 0.02,
      }),
    );
    const canopy = new THREE.Mesh(buildAssetGeometry(asset.kind), material);
    trunk.position.y = 0.5;
    canopy.position.y = 1.5;
    group.add(trunk, canopy);
    group.scale.set(asset.scale[0] * 0.55, asset.scale[1] * 0.65, asset.scale[2] * 0.55);
    return group;
  }

  if (asset.kind === "rock") {
    const mesh = new THREE.Mesh(buildAssetGeometry(asset.kind), material);
    mesh.scale.set(asset.scale[0], asset.scale[1], asset.scale[2]);
    return mesh;
  }

  if (asset.kind === "beacon") {
    const group = new THREE.Group();
    const base = new THREE.Mesh(buildAssetGeometry(asset.kind), material);
    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 18, 18),
      new THREE.MeshStandardMaterial({
        color: asset.emissive ?? asset.color,
        emissive: asset.emissive ?? asset.color,
        emissiveIntensity: 1.2,
        roughness: 0.18,
        metalness: 0.28,
      }),
    );
    base.position.y = 0.55;
    cap.position.y = 1.25;
    group.add(base, cap);
    group.scale.set(asset.scale[0], asset.scale[1], asset.scale[2]);
    return group;
  }

  if (asset.kind === "crate") {
    const mesh = new THREE.Mesh(buildAssetGeometry(asset.kind), material);
    mesh.scale.set(asset.scale[0], asset.scale[1], asset.scale[2]);
    return mesh;
  }

  const ring = new THREE.Mesh(
    buildAssetGeometry(asset.kind),
    new THREE.MeshStandardMaterial({
      color: asset.color,
      emissive: asset.emissive ?? asset.color,
      emissiveIntensity: 1.1,
      roughness: 0.18,
      metalness: 0.32,
    }),
  );
  ring.scale.set(asset.scale[0], asset.scale[1], asset.scale[2]);
  return ring;
};

const applySharedMeshProperties = (root: THREE.Object3D) => {
  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
    }
  });
};

const applyAnimationPose = (object: THREE.Object3D, asset: StudioWorldAssetDraft) => {
  if (asset.animation === "bob") {
    object.position.y += 0.45;
  } else if (asset.animation === "pulse") {
    object.scale.multiplyScalar(1.08);
  } else if (asset.animation === "spin") {
    object.rotation.z += Math.PI * 0.08;
  }
};

export const buildPreviewSceneGroup = (draft: StudioWorldDraft) => {
  const root = new THREE.Group();
  root.name = "claw3d_studio_world";

  const ground = new THREE.Mesh(
    new THREE.CylinderGeometry(
      Math.max(draft.worldBounds.width, draft.worldBounds.depth) * 0.62,
      Math.max(draft.worldBounds.width, draft.worldBounds.depth) * 0.7,
      0.8,
      36,
    ),
    new THREE.MeshStandardMaterial({
      color: draft.palette.ground,
      roughness: 0.95,
      metalness: 0.02,
    }),
  );
  ground.position.y = -0.42;
  ground.receiveShadow = true;
  ground.name = "ground";
  root.add(ground);

  for (const asset of draft.assets) {
    const node = createAssetMesh(asset);
    node.name = asset.id;
    node.position.set(asset.position[0], asset.position[1], asset.position[2]);
    node.rotation.y = asset.rotationY;
    applyAnimationPose(node, asset);
    applySharedMeshProperties(node);
    root.add(node);
  }

  return root;
};
