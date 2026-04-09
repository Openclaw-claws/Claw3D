import { describe, expect, it } from "vitest";

import {
  buildGatewayWarnings,
  buildProfileWarnings,
  DOCTOR_STATUSES,
  parseDoctorArgs,
  resolveRuntimeContext,
  shouldRunCustomChecks,
  summarizeChecks,
} from "../../scripts/lib/claw3doctor-core.mjs";

describe("claw3doctor core", () => {
  it("resolves selected runtime from settings profiles", () => {
    const runtime = resolveRuntimeContext({
      settings: {
        gateway: {
          adapterType: "hermes",
          url: "ws://localhost:18790",
          token: "",
          profiles: {
            hermes: { url: "ws://localhost:18790", token: "" },
            openclaw: { url: "ws://localhost:18789", token: "file-token" },
          },
        },
      },
      upstreamGateway: {
        url: "ws://localhost:18789",
        token: "file-token",
        adapterType: "openclaw",
      },
      env: process.env,
    });

    expect(runtime).toMatchObject({
      adapterType: "hermes",
      gatewayUrl: "ws://localhost:18790",
      tokenConfigured: false,
    });
  });

  it("supports local and claw3d runtime defaults", () => {
    expect(
      resolveRuntimeContext({
        settings: { gateway: { adapterType: "local" } },
        upstreamGateway: { url: "", token: "", adapterType: "local" },
        env: process.env,
      }).gatewayUrl,
    ).toBe("http://localhost:7770");
    expect(
      resolveRuntimeContext({
        settings: { gateway: { adapterType: "claw3d" } },
        upstreamGateway: { url: "", token: "", adapterType: "claw3d" },
        env: process.env,
      }).gatewayUrl,
    ).toBe("http://localhost:3000/api/runtime/custom");
  });

  it("warns on insecure remote websocket", () => {
    expect(
      buildGatewayWarnings({
        gatewayUrl: "ws://pi5.example.com:18789",
        studioAccessToken: "",
        host: "pi5.example.com",
      }),
    ).toEqual(expect.arrayContaining([expect.stringContaining("ws://")]));
  });

  it("warns when multiple runtime profiles share the same endpoint", () => {
    expect(
      buildProfileWarnings({
        runtimeContext: {
          profiles: {
            openclaw: { url: "ws://localhost:18789", token: "a" },
            hermes: { url: "ws://localhost:18789", token: "" },
          },
        },
      }),
    ).toEqual(expect.arrayContaining([expect.stringContaining("same endpoint")]));
  });

  it("parses args", () => {
    expect(parseDoctorArgs(["--json", "--profile", "openclaw"])).toEqual({
      json: true,
      allProfiles: false,
      profile: "openclaw",
    });
  });

  it("treats local/claw3d as custom-style checks", () => {
    expect(shouldRunCustomChecks({ runtimeContext: { adapterType: "local" } })).toBe(true);
    expect(shouldRunCustomChecks({ runtimeContext: { adapterType: "claw3d" } })).toBe(true);
  });

  it("summarizes checks by worst status", () => {
    expect(
      summarizeChecks([
        { status: DOCTOR_STATUSES.pass },
        { status: DOCTOR_STATUSES.warn },
      ]),
    ).toBe(DOCTOR_STATUSES.warn);
  });
});
