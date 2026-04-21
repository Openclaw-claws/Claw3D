const MODLY_API_URL = "http://localhost:8765";

export type ModlyModel = {
  id: string;
  name: string;
  description: string;
  tags: string[];
};

export type ModlyStatus = {
  status: "pending" | "running" | "done" | "error" | "cancelled";
  pct?: number;
  step?: string;
  output_path?: string;
  error?: string;
};

export async function checkModlyRunning(): Promise<boolean> {
  try {
    const res = await fetch(`${MODLY_API_URL}/health`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function listModels(): Promise<ModlyModel[]> {
  const res = await fetch(`${MODLY_API_URL}/model/list`);
  if (!res.ok) throw new Error(`Modly: failed to list models (${res.status})`);
  const data = await res.json();
  return Array.isArray(data) ? data : data.models ?? [];
}

export async function startGeneration(
  modelId: string,
  imageBase64: string,
  params: Record<string, unknown> = {}
): Promise<string> {
  const res = await fetch(`${MODLY_API_URL}/generate/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model_id: modelId, image_b64: imageBase64, params }),
  });
  if (!res.ok) throw new Error(`Modly: generation failed to start (${res.status})`);
  const data = await res.json();
  return data.run_id ?? data.id;
}

export async function pollStatus(runId: string): Promise<ModlyStatus> {
  const res = await fetch(`${MODLY_API_URL}/generate/status/${runId}`);
  if (!res.ok) throw new Error(`Modly: status poll failed (${res.status})`);
  return res.json();
}

export function meshUrl(outputPath: string): string {
  const relative = outputPath.replace(/.*\.modly[/\\]workspace[/\\]/, "");
  return `${MODLY_API_URL}/workspace/${relative}`;
}
