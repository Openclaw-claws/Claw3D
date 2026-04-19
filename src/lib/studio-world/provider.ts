import type {
  StudioProjectRecord,
  StudioSourceImageRecord,
  StudioProviderAvailability,
  StudioWorldGenerationMode,
} from "@/lib/studio-world/types";

export type StudioAiProviderKind = "none" | "meshy";

export type StudioAiTaskStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELED";

export type StudioAiTaskRecord = {
  id: string;
  provider: StudioAiProviderKind;
  mode: StudioWorldGenerationMode;
  status: StudioAiTaskStatus;
  progress: number;
  modelGlbUrl: string | null;
  thumbnailUrl: string | null;
  taskErrorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

type MeshyCreateResponse = {
  result?: string;
};

type MeshyTaskResponse = {
  id?: string;
  status?: string;
  progress?: number;
  thumbnail_url?: string;
  model_urls?: {
    glb?: string;
  };
  task_error?: {
    message?: string;
  };
};

const MESHY_API_BASE_URL = "https://api.meshy.ai/openapi/v1";

const isEnabled = (value: string | undefined) => {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
};

export const resolveStudioAiProvider = (): StudioAiProviderKind => {
  if (process.env.MESHY_API_KEY?.trim()) {
    return "meshy";
  }
  return "none";
};

export const isRealStudioAiEnabled = () =>
  isEnabled(process.env.CLAW3D_STUDIO_ENABLE_REAL_AI) &&
  resolveStudioAiProvider() !== "none";

export const buildStudioAiProviderAvailability = (): StudioProviderAvailability => {
  const provider = resolveStudioAiProvider();
  if (provider === "meshy") {
    const enabled = isRealStudioAiEnabled();
    const apiKey = process.env.MESHY_API_KEY?.trim() ?? "";
    return {
      provider: "meshy",
      available: enabled,
      configured: Boolean(apiKey),
      usingTestMode: apiKey === "msy_dummy_api_key_for_test_mode_12345678",
      message: enabled
        ? "Real AI image-to-3D is enabled."
        : "Meshy is configured but disabled until CLAW3D_STUDIO_ENABLE_REAL_AI is enabled.",
    };
  }
  return {
    provider: "local",
    available: false,
    configured: false,
    usingTestMode: false,
    message: "No real AI provider is configured. Studio will use local generators.",
  };
};

const assertMeshyConfigured = () => {
  const apiKey = process.env.MESHY_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("MESHY_API_KEY is not configured.");
  }
  return apiKey;
};

const mapStatus = (status: string | undefined): StudioAiTaskStatus => {
  if (
    status === "PENDING" ||
    status === "IN_PROGRESS" ||
    status === "SUCCEEDED" ||
    status === "FAILED" ||
    status === "CANCELED"
  ) {
    return status;
  }
  return "FAILED";
};

const buildDataUri = (image: StudioSourceImageRecord) => image.dataUrl;

export const createMeshyImageTo3dTask = async (params: {
  sourceImage: StudioSourceImageRecord;
  prompt: string;
  mode: StudioWorldGenerationMode;
}) => {
  const apiKey = assertMeshyConfigured();
  const response = await fetch(`${MESHY_API_BASE_URL}/image-to-3d`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image_url: buildDataUri(params.sourceImage),
      model_type: params.mode === "image_mesh" ? "standard" : "lowpoly",
      ai_model: "latest",
      should_texture: true,
      enable_pbr: false,
      remove_lighting: true,
      image_enhancement: true,
      target_formats: ["glb"],
      should_remesh: params.mode === "image_mesh",
      ...(params.mode === "image_mesh"
        ? {
            topology: "triangle",
            target_polycount: 30000,
          }
        : {}),
      ...(params.prompt.trim()
        ? {
            texture_prompt: params.prompt.trim().slice(0, 600),
          }
        : {}),
    }),
  });
  const body = (await response.json()) as MeshyCreateResponse;
  if (!response.ok || !body.result) {
    throw new Error("Failed to create Meshy image-to-3D task.");
  }
  return body.result;
};

export const getMeshyImageTo3dTask = async (
  taskId: string,
): Promise<StudioAiTaskRecord> => {
  const apiKey = assertMeshyConfigured();
  const response = await fetch(`${MESHY_API_BASE_URL}/image-to-3d/${encodeURIComponent(taskId)}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    cache: "no-store",
  });
  const body = (await response.json()) as MeshyTaskResponse;
  if (!response.ok || !body.id) {
    throw new Error("Failed to fetch Meshy task.");
  }
  const now = new Date().toISOString();
  return {
    id: body.id,
    provider: "meshy",
    mode: body.model_urls?.glb ? "image_mesh" : "image_avatar",
    status: mapStatus(body.status),
    progress:
      typeof body.progress === "number" && Number.isFinite(body.progress)
        ? body.progress
        : 0,
    modelGlbUrl: body.model_urls?.glb ?? null,
    thumbnailUrl: body.thumbnail_url ?? null,
    taskErrorMessage: body.task_error?.message?.trim() || null,
    createdAt: now,
    updatedAt: now,
  };
};

export const waitForMeshyImageTo3dTask = async (params: {
  taskId: string;
  timeoutMs?: number;
  pollIntervalMs?: number;
}) => {
  const timeoutAt = Date.now() + (params.timeoutMs ?? 10 * 60_000);
  const pollIntervalMs = params.pollIntervalMs ?? 5000;
  while (Date.now() < timeoutAt) {
    const task = await getMeshyImageTo3dTask(params.taskId);
    if (
      task.status === "SUCCEEDED" ||
      task.status === "FAILED" ||
      task.status === "CANCELED"
    ) {
      return task;
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }
  throw new Error("Timed out waiting for Meshy image-to-3D task.");
};

export const buildRealAiSummary = (params: {
  project: StudioProjectRecord;
  task: StudioAiTaskRecord;
}) =>
  `${params.task.provider} ${params.project.mode} task ${params.task.status.toLowerCase()} at ${params.task.progress}% progress.`;
