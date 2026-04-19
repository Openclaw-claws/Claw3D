import type {
  StudioGenerationInput,
  StudioWorldAnimationKind,
  StudioWorldAssetDraft,
  StudioWorldAssetKind,
  StudioWorldBiome,
  StudioWorldDraft,
  StudioWorldPalette,
  StudioWorldScale,
  StudioWorldStyle,
} from "@/lib/studio-world/types";
import { buildAvatarImageNotes } from "@/lib/studio-world/image-analysis";

const hashString = (value: string) => {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
};

const createSeededRandom = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const pick = <T>(items: readonly T[], random: () => number): T =>
  items[Math.floor(random() * items.length)] ?? items[0];

const round2 = (value: number) => Math.round(value * 100) / 100;

const normalizePrompt = (value: string) =>
  value
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 220);

const STYLE_PALETTES: Record<StudioWorldStyle, StudioWorldPalette> = {
  stylized: {
    ground: "#395b4b",
    structure: "#85b6ff",
    prop: "#d6c38f",
    accent: "#ff8c61",
    glow: "#7be7ff",
    fog: "#7aa7ff",
    sky: "#14233c",
  },
  realistic: {
    ground: "#4f5e46",
    structure: "#9c9388",
    prop: "#726556",
    accent: "#d9974f",
    glow: "#efe4b8",
    fog: "#b0b7c8",
    sky: "#7893b5",
  },
  cinematic: {
    ground: "#2b3146",
    structure: "#6c78a8",
    prop: "#b38d71",
    accent: "#ff5e7a",
    glow: "#8fd9ff",
    fog: "#7568d8",
    sky: "#090d18",
  },
  "low-poly": {
    ground: "#4c6d56",
    structure: "#7bb2a6",
    prop: "#d7a36a",
    accent: "#ffcf5d",
    glow: "#fff1a3",
    fog: "#b9d8ff",
    sky: "#203247",
  },
};

const BIOME_NOTES: Record<StudioWorldBiome, string[]> = {
  creative_plaza: [
    "Central plaza layout supports showcase scenes and collaborative props.",
    "Sight lines stay open so exported assets remain easy to stage in Claw3D.",
  ],
  forest: [
    "Organic prop spacing creates a traversal loop with layered silhouettes.",
    "Trees and rocks remain modular so they can be reused as asset packs.",
  ],
  desert: [
    "Large negative space preserves readability for vehicles and hero props.",
    "Beacon accents define landmarks and work as navigation anchors.",
  ],
  coast: [
    "Shoreline composition balances broad terrain planes with landmark structures.",
    "Accent lighting suggests a path from beach props toward a hub space.",
  ],
  neo_city: [
    "Vertical massing creates skyline depth and supports cinematic camera moves.",
    "Repeated modular towers and portals form a reusable sci-fi kit.",
  ],
  fantasy: [
    "Arches and beacons imply traversal goals and magical interaction points.",
    "Pulse-driven accents help animation previews read at a glance.",
  ],
};

const scaleToBounds = (scale: StudioWorldScale) => {
  if (scale === "small") {
    return { width: 28, depth: 28, assetCount: 12 };
  }
  if (scale === "large") {
    return { width: 58, depth: 58, assetCount: 28 };
  }
  return { width: 40, depth: 40, assetCount: 18 };
};

const avatarScaleToBounds = (scale: StudioWorldScale) => {
  if (scale === "small") {
    return { width: 14, depth: 14 };
  }
  if (scale === "large") {
    return { width: 24, depth: 24 };
  }
  return { width: 18, depth: 18 };
};

const detectBiome = (prompt: string, style: StudioWorldStyle): StudioWorldBiome => {
  const normalized = prompt.toLowerCase();
  if (/\bforest|wood|tree|grove|nature\b/.test(normalized)) return "forest";
  if (/\bdesert|dune|sand|canyon\b/.test(normalized)) return "desert";
  if (/\bcoast|beach|ocean|harbor|shore\b/.test(normalized)) return "coast";
  if (/\bcity|cyber|neon|urban|street\b/.test(normalized)) return "neo_city";
  if (/\bfantasy|magic|ruin|temple|myth\b/.test(normalized)) return "fantasy";
  if (style === "cinematic") return "neo_city";
  return "creative_plaza";
};

const buildAssetKindSet = (
  biome: StudioWorldBiome,
  focus: StudioGenerationInput["focus"],
): StudioWorldAssetKind[] => {
  const base: StudioWorldAssetKind[] = ["platform", "arch", "crate", "beacon"];
  if (biome === "forest") base.push("tree", "rock", "tree");
  if (biome === "desert") base.push("rock", "tower", "arch");
  if (biome === "coast") base.push("rock", "portal", "platform");
  if (biome === "neo_city") base.push("tower", "portal", "tower");
  if (biome === "fantasy") base.push("arch", "portal", "beacon");
  if (focus === "assets") base.push("crate", "tree", "rock", "arch");
  if (focus === "animation") base.push("beacon", "portal", "tower");
  if (focus === "world") base.push("platform", "tower", "arch");
  return base;
};

const resolveAnimation = (
  kind: StudioWorldAssetKind,
  focus: StudioGenerationInput["focus"],
  random: () => number,
): StudioWorldAnimationKind => {
  if (focus === "animation") {
    if (kind === "portal" || kind === "beacon") return "pulse";
    return random() > 0.45 ? "bob" : "spin";
  }
  if (kind === "portal") return "spin";
  if (kind === "beacon") return "pulse";
  return random() > 0.82 ? "bob" : "none";
};

const buildAssetName = (kind: StudioWorldAssetKind, index: number) =>
  `${kind.replace(/_/g, " ")} ${index + 1}`;

const buildAssetColor = (
  kind: StudioWorldAssetKind,
  palette: StudioWorldPalette,
  random: () => number,
) => {
  if (kind === "platform" || kind === "tower" || kind === "arch") return palette.structure;
  if (kind === "portal" || kind === "beacon") return random() > 0.5 ? palette.accent : palette.glow;
  return palette.prop;
};

const buildAssetScale = (kind: StudioWorldAssetKind, random: () => number): [number, number, number] => {
  if (kind === "platform") return [3 + random() * 4, 0.6 + random() * 0.4, 3 + random() * 4];
  if (kind === "tower") return [1.2 + random() * 1.6, 4 + random() * 5, 1.2 + random() * 1.6];
  if (kind === "arch") return [2.4 + random() * 1.8, 2 + random() * 1.3, 0.8 + random() * 0.5];
  if (kind === "tree") return [0.9 + random() * 1.5, 2.8 + random() * 2.8, 0.9 + random() * 1.5];
  if (kind === "rock") return [0.8 + random() * 2.2, 0.6 + random() * 1.4, 0.8 + random() * 2.2];
  if (kind === "beacon") return [0.7 + random() * 0.6, 2 + random() * 1.4, 0.7 + random() * 0.6];
  if (kind === "portal") return [1.6 + random() * 1.2, 2.8 + random() * 1.4, 0.45 + random() * 0.35];
  return [0.9 + random() * 1.2, 0.9 + random() * 1.2, 0.9 + random() * 1.2];
};

const buildAssetPosition = (
  index: number,
  total: number,
  bounds: { width: number; depth: number },
  random: () => number,
): [number, number, number] => {
  const radius = Math.min(bounds.width, bounds.depth) * (0.16 + 0.34 * (index / Math.max(total - 1, 1)));
  const angle = index * 0.74 + random() * 0.9;
  const x = Math.cos(angle) * radius + (random() - 0.5) * 4;
  const z = Math.sin(angle) * radius + (random() - 0.5) * 4;
  return [round2(x), 0, round2(z)];
};

const buildSceneAssets = (params: {
  biome: StudioWorldBiome;
  focus: StudioGenerationInput["focus"];
  palette: StudioWorldPalette;
  bounds: { width: number; depth: number; assetCount: number };
  random: () => number;
}) => {
  const kindSet = buildAssetKindSet(params.biome, params.focus);
  const assets: StudioWorldAssetDraft[] = [];
  for (let index = 0; index < params.bounds.assetCount; index += 1) {
    const kind = pick(kindSet, params.random);
    const animation = resolveAnimation(kind, params.focus, params.random);
    const color = buildAssetColor(kind, params.palette, params.random);
    assets.push({
      id: `asset_${index + 1}`,
      name: buildAssetName(kind, index),
      kind,
      position: buildAssetPosition(index, params.bounds.assetCount, params.bounds, params.random),
      scale: buildAssetScale(kind, params.random),
      rotationY: round2(params.random() * Math.PI * 2),
      color,
      emissive:
        kind === "portal" || kind === "beacon"
          ? (params.random() > 0.5 ? params.palette.glow : params.palette.accent)
          : null,
      animation,
    });
  }
  return assets;
};

export const resolveGenerationSeed = (input: StudioGenerationInput) => {
  if (typeof input.seed === "number" && Number.isFinite(input.seed)) {
    return Math.floor(Math.abs(input.seed));
  }
  return hashString(
    `${input.name}:${input.prompt}:${input.style}:${input.scale}:${input.focus}:${input.sourceImage?.id ?? ""}`,
  );
};

const buildAvatarDraft = (input: StudioGenerationInput): StudioWorldDraft => {
  const sourceImage = input.sourceImage;
  if (!sourceImage) {
    throw new Error("Image-guided avatar generation requires a source image.");
  }
  const seed = resolveGenerationSeed(input);
  const bounds = avatarScaleToBounds(input.scale);
  const imageNotes = buildAvatarImageNotes(sourceImage);
  const palette: StudioWorldPalette = {
    ground: imageNotes.backdrop,
    structure: imageNotes.outfitMain,
    prop: imageNotes.outfitTrim,
    accent: imageNotes.accessory,
    glow: imageNotes.accessory,
    fog: imageNotes.outfitTrim,
    sky: imageNotes.backdrop,
  };
  const notes = [
    `Image-guided avatar proxy built from ${sourceImage.fileName}.`,
    `Palette sampled from the uploaded reference image.`,
    `Generated with ${input.style} styling and seed ${seed}.`,
  ];
  const ratio = sourceImage.height > 0 ? sourceImage.width / sourceImage.height : 1;
  const shoulderWidth = clamp(1.8 + ratio * 0.8, 1.8, 3.4);
  const headScale = clamp(1.35 + (ratio < 0.9 ? 0.2 : 0), 1.3, 1.7);

  const assets: StudioWorldAssetDraft[] = [
    {
      id: "avatar_base",
      name: "Avatar base",
      kind: "platform",
      position: [0, -0.2, 0],
      scale: [6.5, 0.4, 6.5],
      rotationY: 0,
      color: palette.ground,
      emissive: null,
      animation: "none",
    },
    {
      id: "avatar_torso",
      name: "Avatar torso",
      kind: "avatar_torso",
      position: [0, 2.4, 0],
      scale: [shoulderWidth, 3.2, 1.2],
      rotationY: 0,
      color: imageNotes.outfitMain,
      emissive: null,
      animation: input.focus === "animation" ? "bob" : "none",
    },
    {
      id: "avatar_head",
      name: "Avatar head",
      kind: "avatar_head",
      position: [0, 5.4, 0],
      scale: [headScale, 1.75, 1.4],
      rotationY: 0,
      color: imageNotes.skinLike,
      emissive: null,
      animation: "none",
    },
    {
      id: "avatar_hair",
      name: "Avatar hair",
      kind: "avatar_hair",
      position: [0, 6.6, -0.06],
      scale: [1.65, 1.45, 1.1],
      rotationY: 0,
      color: imageNotes.hairLike,
      emissive: null,
      animation: input.focus === "animation" ? "pulse" : "none",
    },
    {
      id: "avatar_left_arm",
      name: "Avatar left arm",
      kind: "avatar_limb",
      position: [-2.05, 2.8, 0],
      scale: [0.48, 2.2, 0.48],
      rotationY: 0.15,
      color: imageNotes.outfitTrim,
      emissive: null,
      animation: "none",
    },
    {
      id: "avatar_right_arm",
      name: "Avatar right arm",
      kind: "avatar_limb",
      position: [2.05, 2.8, 0],
      scale: [0.48, 2.2, 0.48],
      rotationY: -0.15,
      color: imageNotes.outfitTrim,
      emissive: null,
      animation: "none",
    },
    {
      id: "avatar_left_leg",
      name: "Avatar left leg",
      kind: "avatar_limb",
      position: [-0.65, 0.8, 0],
      scale: [0.58, 2.2, 0.58],
      rotationY: 0,
      color: imageNotes.outfitMain,
      emissive: null,
      animation: "none",
    },
    {
      id: "avatar_right_leg",
      name: "Avatar right leg",
      kind: "avatar_limb",
      position: [0.65, 0.8, 0],
      scale: [0.58, 2.2, 0.58],
      rotationY: 0,
      color: imageNotes.outfitMain,
      emissive: null,
      animation: "none",
    },
    {
      id: "avatar_glasses",
      name: "Avatar glasses",
      kind: "avatar_accessory",
      position: [0, 5.45, 1.02],
      scale: [1.65, 0.5, 0.18],
      rotationY: 0,
      color: imageNotes.accessory,
      emissive: imageNotes.accessory,
      animation: "pulse",
    },
    {
      id: "avatar_companion",
      name: "Avatar companion",
      kind: "avatar_orb",
      position: [4.2, 4.8, -1.2],
      scale: [1.05, 1.05, 1.05],
      rotationY: 0,
      color: imageNotes.outfitTrim,
      emissive: imageNotes.accessory,
      animation: "spin",
    },
  ];

  return {
    mode: "image_avatar",
    biome: "creative_plaza",
    palette,
    worldBounds: {
      width: bounds.width,
      depth: bounds.depth,
    },
    camera: {
      position: [8.8, 6.8, 10.8],
      target: [0, 3.2, 0],
    },
    promptSummary: input.prompt.trim() || `Image-guided avatar from ${sourceImage.fileName}`,
    notes,
    assets,
  };
};

const buildImageMeshDraft = (input: StudioGenerationInput): StudioWorldDraft => {
  const sourceImage = input.sourceImage;
  if (!sourceImage) {
    throw new Error("Image-guided mesh generation requires a source image.");
  }
  const seed = resolveGenerationSeed(input);
  const bounds = avatarScaleToBounds(input.scale);
  const imageNotes = buildAvatarImageNotes(sourceImage);
  const palette: StudioWorldPalette = {
    ground: imageNotes.backdrop,
    structure: imageNotes.outfitMain,
    prop: imageNotes.outfitTrim,
    accent: imageNotes.accessory,
    glow: imageNotes.accessory,
    fog: imageNotes.outfitTrim,
    sky: imageNotes.backdrop,
  };

  const notes = [
    `Image-guided mesh draft built from ${sourceImage.fileName}.`,
    "Current mode creates a textured relief mesh from the uploaded image silhouette and palette.",
    `Generated with ${input.style} styling and seed ${seed}.`,
  ];

  const aspectRatio = sourceImage.height > 0 ? sourceImage.width / sourceImage.height : 1;
  const panelWidth = clamp(4.6 * aspectRatio, 2.6, 6.8);
  const panelHeight = clamp(5.2 / Math.max(aspectRatio, 0.65), 3.8, 7.2);

  const assets: StudioWorldAssetDraft[] = [
    {
      id: "mesh_base",
      name: "Mesh base",
      kind: "platform",
      position: [0, -0.25, 0],
      scale: [7.6, 0.45, 7.6],
      rotationY: 0,
      color: palette.ground,
      emissive: null,
      animation: "none",
    },
    {
      id: "mesh_panel",
      name: "Image mesh panel",
      kind: "avatar_torso",
      position: [0, 2.7, 0],
      scale: [panelWidth, panelHeight, 0.4],
      rotationY: 0,
      color: palette.structure,
      emissive: null,
      animation: "none",
    },
    {
      id: "mesh_head_form",
      name: "Portrait mass",
      kind: "avatar_head",
      position: [0, 4.15, 0.25],
      scale: [panelWidth * 0.42, panelHeight * 0.28, 0.44],
      rotationY: 0,
      color: imageNotes.skinLike,
      emissive: null,
      animation: "none",
    },
    {
      id: "mesh_hair_form",
      name: "Hair crest",
      kind: "avatar_hair",
      position: [0.05, 5.15, 0.2],
      scale: [panelWidth * 0.36, panelHeight * 0.26, 0.34],
      rotationY: 0,
      color: imageNotes.hairLike,
      emissive: null,
      animation: input.focus === "animation" ? "pulse" : "none",
    },
    {
      id: "mesh_accent_strip",
      name: "Accent strip",
      kind: "avatar_accessory",
      position: [0, 2.8, 0.32],
      scale: [panelWidth * 0.52, 0.8, 0.12],
      rotationY: 0,
      color: imageNotes.accessory,
      emissive: imageNotes.accessory,
      animation: "pulse",
    },
    {
      id: "mesh_companion",
      name: "Floating detail",
      kind: "avatar_orb",
      position: [panelWidth * 0.75, 4.7, -0.8],
      scale: [0.92, 0.92, 0.92],
      rotationY: 0,
      color: imageNotes.outfitTrim,
      emissive: imageNotes.accessory,
      animation: "spin",
    },
  ];

  return {
    mode: "image_mesh",
    biome: "creative_plaza",
    palette,
    worldBounds: {
      width: bounds.width,
      depth: bounds.depth,
    },
    camera: {
      position: [8.2, 6.2, 10.4],
      target: [0, 3.2, 0],
    },
    promptSummary:
      input.prompt.trim() || `Image-guided mesh from ${sourceImage.fileName}`,
    notes,
    assets,
  };
};

export const buildStudioWorldDraft = (input: StudioGenerationInput): StudioWorldDraft => {
  if (input.sourceImage) {
    if (input.imageMode === "mesh") {
      return buildImageMeshDraft(input);
    }
    return buildAvatarDraft(input);
  }
  const seed = resolveGenerationSeed(input);
  const random = createSeededRandom(seed);
  const biome = detectBiome(input.prompt, input.style);
  const bounds = scaleToBounds(input.scale);
  const palette = STYLE_PALETTES[input.style];
  const assets = buildSceneAssets({
    biome,
    focus: input.focus,
    palette,
    bounds,
    random,
  });
  const normalizedPrompt = normalizePrompt(input.prompt);
  const promptSummary = normalizedPrompt || "Untitled generated scene";
  const notes = [
    ...BIOME_NOTES[biome],
    `Primary focus: ${input.focus}.`,
    `Generated with ${input.style} styling and seed ${seed}.`,
  ];

  return {
    mode: "text_scene",
    biome,
    palette,
    worldBounds: {
      width: bounds.width,
      depth: bounds.depth,
    },
    camera: {
      position: [bounds.width * 0.65, clamp(bounds.width * 0.7, 18, 40), bounds.depth * 0.65],
      target: [0, 0, 0],
    },
    promptSummary,
    notes,
    assets,
  };
};
