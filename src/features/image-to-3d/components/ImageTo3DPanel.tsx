"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  checkModlyRunning,
  listModels,
  meshUrl,
  pollStatus,
  startGeneration,
  type ModlyModel,
  type ModlyStatus,
} from "@/lib/modly/client";

type Phase = "idle" | "generating" | "done" | "error";

export function ImageTo3DPanel() {
  const [modlyOnline, setModlyOnline] = useState<boolean | null>(null);
  const [models, setModels] = useState<ModlyModel[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [status, setStatus] = useState<ModlyStatus | null>(null);
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    checkModlyRunning().then((online) => {
      setModlyOnline(online);
      if (online) listModels().then((m) => { setModels(m); setSelectedModel(m[0]?.id ?? ""); });
    });
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!imageFile || !selectedModel) return;
    setPhase("generating");
    setError(null);
    setOutputUrl(null);
    setStatus({ status: "pending", pct: 0 });

    try {
      const reader = new FileReader();
      const imageB64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(imageFile);
      });

      const runId = await startGeneration(selectedModel, imageB64);

      pollRef.current = setInterval(async () => {
        try {
          const s = await pollStatus(runId);
          setStatus(s);
          if (s.status === "done") {
            clearInterval(pollRef.current!);
            setPhase("done");
            setOutputUrl(s.output_path ? meshUrl(s.output_path) : null);
          } else if (s.status === "error" || s.status === "cancelled") {
            clearInterval(pollRef.current!);
            setPhase("error");
            setError(s.error ?? "Generation failed.");
          }
        } catch {
          clearInterval(pollRef.current!);
          setPhase("error");
          setError("Lost connection to Modly.");
        }
      }, 1500);
    } catch (err) {
      setPhase("error");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, [imageFile, selectedModel]);

  if (modlyOnline === null) {
    return <div className="p-6 text-muted-foreground font-mono text-sm">Checking Modly…</div>;
  }

  if (!modlyOnline) {
    return (
      <div className="p-6 space-y-2">
        <p className="font-mono text-sm text-destructive">Modly not running</p>
        <p className="text-xs text-muted-foreground">
          Open the Modly desktop app, or run{" "}
          <code className="bg-muted px-1 rounded">./launch-macos.sh</code> in the modly repo.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-xl">
      <h2 className="font-display text-xl tracking-wide">Image → 3D Mesh</h2>

      {/* Image upload */}
      <div className="space-y-2">
        <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Image</label>
        <input
          type="file"
          accept="image/*"
          onChange={handleFile}
          className="block w-full text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-muted file:text-foreground hover:file:bg-accent cursor-pointer"
        />
        {imagePreview && (
          <img src={imagePreview} alt="preview" className="mt-2 rounded-md max-h-48 object-contain border border-border" />
        )}
      </div>

      {/* Model selector */}
      <div className="space-y-2">
        <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">Model</label>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="w-full rounded border border-border bg-background px-3 py-1.5 text-sm font-mono"
        >
          {models.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      {/* Generate button */}
      <button
        onClick={handleGenerate}
        disabled={!imageFile || !selectedModel || phase === "generating"}
        className="px-4 py-2 rounded bg-foreground text-background text-sm font-mono disabled:opacity-40 hover:opacity-80 transition-opacity"
      >
        {phase === "generating" ? "Generating…" : "Generate 3D"}
      </button>

      {/* Progress */}
      {phase === "generating" && status && (
        <div className="space-y-1">
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-foreground transition-all duration-500"
              style={{ width: `${status.pct ?? 0}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground font-mono">{status.step || "Processing…"}</p>
        </div>
      )}

      {/* Output */}
      {phase === "done" && outputUrl && (
        <div className="space-y-2 rounded-md border border-border p-3">
          <p className="text-xs font-mono text-muted-foreground">Mesh ready</p>
          <a
            href={outputUrl}
            download
            className="block text-sm font-mono text-foreground underline underline-offset-2"
          >
            Download GLB
          </a>
        </div>
      )}

      {/* Error */}
      {phase === "error" && error && (
        <p className="text-sm font-mono text-destructive">{error}</p>
      )}
    </div>
  );
}
