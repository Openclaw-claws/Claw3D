import { useCallback, useEffect, useRef, useState } from "react";
import type { RootState } from "@react-three/fiber";

type Options = {
  onLost?: () => void;
  onRestored?: () => void;
  pollIntervalMs?: number;
  remountDebounceMs?: number;
  maxRestoreAttempts?: number;
};

export function useCanvasContextLoss(opts: Options = {}) {
  const {
    onLost,
    onRestored,
    pollIntervalMs = 400,
    remountDebounceMs = 1000,
    maxRestoreAttempts = 8,
  } = opts;

  const [generation, setGeneration] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const attemptsRef = useRef(0);
  const remountInFlightRef = useRef(false);
  const lastRemountAtRef = useRef(0);

  const scheduleRemount = useCallback((reason: string) => {
    const now = Date.now();
    if (remountInFlightRef.current) return;
    if (now - lastRemountAtRef.current < remountDebounceMs) return;
    if (attemptsRef.current >= maxRestoreAttempts) {
      if (typeof console !== "undefined") {
        console.error("[claw3d] giving up after max remount attempts");
      }
      return;
    }
    remountInFlightRef.current = true;
    attemptsRef.current += 1;
    lastRemountAtRef.current = now;
    if (typeof console !== "undefined") {
      console.warn(`[claw3d] remount attempt ${attemptsRef.current} (${reason})`);
    }
    setGeneration((g) => g + 1);
  }, [maxRestoreAttempts, remountDebounceMs]);

  const onCreated = useCallback((state: RootState) => {
    canvasRef.current = state.gl.domElement as HTMLCanvasElement;
    remountInFlightRef.current = false;
    const canvas = canvasRef.current;

    const handleLost = (event: Event) => {
      event.preventDefault();
      try { onLost?.(); } catch {}
      if (typeof console !== "undefined") {
        console.warn("[claw3d] webglcontextlost event");
      }
      scheduleRemount("event");
    };
    const handleRestored = () => {
      try { onRestored?.(); } catch {}
      attemptsRef.current = 0;
      if (typeof console !== "undefined") {
        console.info("[claw3d] webglcontextrestored event");
      }
    };
    canvas.addEventListener("webglcontextlost", handleLost, false);
    canvas.addEventListener("webglcontextrestored", handleRestored, false);
  }, [onLost, onRestored, scheduleRemount]);

  // Polling backup in case the event listener gets eaten or lost is internal-only
  useEffect(() => {
    const id = setInterval(() => {
      const canvas = canvasRef.current;
      if (!canvas || !document.contains(canvas)) return;
      let lost = false;
      try {
        const ctx = (canvas.getContext("webgl2") || canvas.getContext("webgl")) as
          | WebGL2RenderingContext
          | WebGLRenderingContext
          | null;
        if (!ctx) return;
        lost = ctx.isContextLost();
      } catch {
        lost = true;
      }
      if (lost) scheduleRemount("poll");
    }, pollIntervalMs);
    return () => clearInterval(id);
  }, [pollIntervalMs, scheduleRemount]);

  // After remount, clear the in-flight flag so polling can detect future losses
  useEffect(() => {
    if (generation === 0) return;
    const t = setTimeout(() => {
      remountInFlightRef.current = false;
    }, 200);
    return () => clearTimeout(t);
  }, [generation]);

  return { canvasKey: generation, onCreated };
}
