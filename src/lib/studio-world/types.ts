export type StudioWorldStyle =
  | "stylized"
  | "realistic"
  | "cinematic"
  | "low-poly";

export type StudioWorldScale = "small" | "medium" | "large";

export type StudioWorldFocus = "world" | "assets" | "animation";

export type StudioWorldBiome =
  | "creative_plaza"
  | "forest"
  | "desert"
  | "coast"
  | "neo_city"
  | "fantasy";

export type StudioWorldAnimationKind = "none" | "bob" | "spin" | "pulse";

export type StudioWorldAssetKind =
  | "platform"
  | "tower"
  | "arch"
  | "tree"
  | "rock"
  | "beacon"
  | "crate"
  | "portal"
  | "avatar_head"
  | "avatar_hair"
  | "avatar_torso"
  | "avatar_limb"
  | "avatar_accessory"
  | "avatar_orb";

export type StudioWorldGenerationMode =
  | "text_scene"
  | "image_avatar"
  | "image_mesh";

export type StudioSourceImageRecord = {
  id: string;
  fileName: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
  storagePath: string;
  dataUrl: string;
  palette: string[];
};

export type StudioWorldAssetDraft = {
  id: string;
  name: string;
  kind: StudioWorldAssetKind;
  position: [number, number, number];
  scale: [number, number, number];
  rotationY: number;
  color: string;
  emissive?: string | null;
  animation: StudioWorldAnimationKind;
};

export type StudioWorldPalette = {
  ground: string;
  structure: string;
  prop: string;
  accent: string;
  glow: string;
  fog: string;
  sky: string;
};

export type StudioWorldDraft = {
  mode: StudioWorldGenerationMode;
  biome: StudioWorldBiome;
  palette: StudioWorldPalette;
  worldBounds: {
    width: number;
    depth: number;
  };
  camera: {
    position: [number, number, number];
    target: [number, number, number];
  };
  promptSummary: string;
  notes: string[];
  assets: StudioWorldAssetDraft[];
};

export type StudioGenerationInput = {
  name: string;
  prompt: string;
  style: StudioWorldStyle;
  scale: StudioWorldScale;
  focus: StudioWorldFocus;
  seed?: number | null;
  sourceImage?: StudioSourceImageRecord | null;
  imageMode?: "avatar" | "mesh";
};

export type StudioGenerationJobRecord = {
  id: string;
  provider: string;
  status: "completed";
  createdAt: string;
  finishedAt: string;
  summary: string;
  assetCount: number;
  mode: StudioWorldGenerationMode;
};

export type StudioProjectRecord = {
  id: string;
  name: string;
  prompt: string;
  style: StudioWorldStyle;
  scale: StudioWorldScale;
  focus: StudioWorldFocus;
  seed: number;
  mode: StudioWorldGenerationMode;
  createdAt: string;
  updatedAt: string;
  latestJob: StudioGenerationJobRecord;
  sourceImages: StudioSourceImageRecord[];
  sceneDraft: StudioWorldDraft;
};

export type StudioProjectsStore = {
  schemaVersion: number;
  projects: StudioProjectRecord[];
};
