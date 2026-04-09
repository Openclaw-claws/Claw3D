import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

import {
  buildDoctorJsonReport,
  DOCTOR_STATUSES,
  formatDoctorReport,
  parseDoctorArgs,
  resolveRuntimeContext,
  summarizeChecks,
} from "./lib/claw3doctor-core.mjs";

const require = createRequire(import.meta.url);
const {
  loadUpstreamGatewaySettings,
  resolveStateDir,
  resolveStudioSettingsPath,
} = require("../server/studio-settings.js");

const readJsonFile = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
};

const trim = (value) => (typeof value === "string" ? value.trim() : "");

const checkPass = (category, label, message) => ({
  status: DOCTOR_STATUSES.pass,
  category,
  label,
  message,
});

const checkWarn = (category, label, message) => ({
  status: DOCTOR_STATUSES.warn,
  category,
  label,
  message,
});

async function main() {
  const args = parseDoctorArgs(process.argv.slice(2));
  const env = process.env;
  const stateDir = resolveStateDir(env);
  const settingsPath = resolveStudioSettingsPath(env);
  const upstreamGateway = loadUpstreamGatewaySettings(env);
  const studioSettings = readJsonFile(settingsPath);
  const runtimeContext = resolveRuntimeContext({
    settings: studioSettings,
    upstreamGateway,
    env,
  });

  const checks = [
    runtimeContext.gatewayUrl
      ? checkPass(
          "Runtime profiles",
          "Runtime profile",
          `${runtimeContext.adapterType} selected at ${runtimeContext.gatewayUrl}`,
        )
      : checkWarn("Runtime profiles", "Runtime profile", "No runtime profile configured."),
    checkPass(
      "Runtime profiles",
      "Gateway token",
      runtimeContext.tokenConfigured ? "Configured." : "Missing.",
    ),
    checkPass(
      "Workspace",
      "Studio settings path",
      trim(settingsPath) || "(not found)",
    ),
  ];

  const summary = summarizeChecks(checks);
  const reportInput = {
    summary,
    runtimeContext,
    paths: { stateDir, settingsPath },
    checks,
  };
  if (args.json) {
    console.log(JSON.stringify(buildDoctorJsonReport(reportInput), null, 2));
  } else {
    console.log(formatDoctorReport(reportInput));
  }
}

await main();
