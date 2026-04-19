import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { DELETE, GET, POST } from "@/app/api/studio-world/route";

const makeTempDir = (name: string) => fs.mkdtempSync(path.join(os.tmpdir(), `${name}-`));

describe("studio world route", () => {
  const priorStateDir = process.env.OPENCLAW_STATE_DIR;
  let tempDir: string | null = null;

  afterEach(() => {
    process.env.OPENCLAW_STATE_DIR = priorStateDir;
    if (tempDir) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  it("creates, lists, exports, applies, and deletes a studio project", async () => {
    tempDir = makeTempDir("studio-world-route");
    process.env.OPENCLAW_STATE_DIR = tempDir;

    const createResponse = await POST({
      text: async () =>
        JSON.stringify({
          action: "generate",
          input: {
            name: "Forest Lab",
            prompt: "A stylized forest lab with modular props and export-ready landmarks.",
            style: "stylized",
            scale: "medium",
            focus: "world",
            seed: 42,
          },
        }),
    } as unknown as Request);
    const createBody = (await createResponse.json()) as {
      project?: {
        id: string;
        name: string;
        sceneDraft: { assets: Array<unknown> };
      };
    };

    expect(createResponse.status).toBe(200);
    expect(createBody.project?.name).toBe("Forest Lab");
    expect(createBody.project?.sceneDraft.assets.length).toBeGreaterThan(0);

    const projectId = createBody.project?.id ?? "";
    expect(projectId.length).toBeGreaterThan(0);

    const listResponse = await GET(
      new Request("http://localhost/api/studio-world"),
    );
    const listBody = (await listResponse.json()) as {
      projects?: Array<{ id: string }>;
    };
    expect(listResponse.status).toBe(200);
    expect(listBody.projects?.some((project) => project.id === projectId)).toBe(true);

    const exportResponse = await GET(
      new Request(`http://localhost/api/studio-world?action=export&projectId=${encodeURIComponent(projectId)}`),
    );
    const exportBody = (await exportResponse.json()) as {
      exportManifest?: {
        project?: { id?: string };
        export?: { format?: string };
      };
    };
    expect(exportResponse.status).toBe(200);
    expect(exportBody.exportManifest?.project?.id).toBe(projectId);
    expect(exportBody.exportManifest?.export?.format).toBe("glb_manifest");

    const applyResponse = await POST({
      text: async () =>
        JSON.stringify({
          action: "apply_to_office",
          projectId,
        }),
    } as unknown as Request);
    const applyBody = (await applyResponse.json()) as {
      office?: { officeId?: string; officeVersionId?: string };
    };
    expect(applyResponse.status).toBe(200);
    expect(applyBody.office?.officeId).toBe("studio-world");
    expect((applyBody.office?.officeVersionId ?? "").length).toBeGreaterThan(0);

    const deleteResponse = await DELETE(
      new Request(`http://localhost/api/studio-world?projectId=${encodeURIComponent(projectId)}`),
    );
    const deleteBody = (await deleteResponse.json()) as { deleted?: boolean };
    expect(deleteResponse.status).toBe(200);
    expect(deleteBody.deleted).toBe(true);
  });

  it("uploads an image and creates an image-guided avatar project", async () => {
    tempDir = makeTempDir("studio-world-image-route");
    process.env.OPENCLAW_STATE_DIR = tempDir;

    const pngBytes = Uint8Array.from([
      137, 80, 78, 71, 13, 10, 26, 10,
      0, 0, 0, 13, 73, 72, 68, 82,
      0, 0, 0, 1, 0, 0, 0, 1,
      8, 6, 0, 0, 0, 31, 21, 196, 137,
      0, 0, 0, 1, 73, 68, 65, 84,
      120, 156, 99, 0, 0, 0, 2, 0, 1,
      229, 39, 212, 162, 0, 0, 0, 0,
      73, 69, 78, 68, 174, 66, 96, 130,
    ]);

    const formData = new FormData();
    formData.append(
      "image",
      new File([pngBytes], "avatar.png", { type: "image/png" }),
    );

    const uploadResponse = await POST(
      new Request("http://localhost/api/studio-world", {
        method: "POST",
        body: formData,
      }),
    );
    const uploadBody = (await uploadResponse.json()) as {
      sourceImage?: {
        id?: string;
        fileName?: string;
        width?: number;
        height?: number;
        palette?: string[];
      };
    };

    expect(uploadResponse.status).toBe(200);
    expect((uploadBody.sourceImage?.fileName ?? "").length).toBeGreaterThan(0);
    expect(uploadBody.sourceImage?.id).toBeTruthy();
    expect(uploadBody.sourceImage?.width).toBe(1);
    expect(uploadBody.sourceImage?.height).toBe(1);
    expect((uploadBody.sourceImage?.palette ?? []).length).toBeGreaterThan(0);

    const imageProjectResponse = await POST({
      text: async () =>
        JSON.stringify({
          action: "generate",
          input: {
            name: "Avatar Test",
            prompt: "Stylized cyber avatar inspired by the uploaded reference.",
            style: "stylized",
            scale: "medium",
            focus: "assets",
            sourceImage: uploadBody.sourceImage,
          },
        }),
    } as unknown as Request);

    const imageProjectBody = (await imageProjectResponse.json()) as {
      project?: {
        mode?: string;
        sourceImages?: Array<{ fileName?: string }>;
        sceneDraft?: { mode?: string; assets?: Array<{ kind?: string }> };
      };
    };

    expect(imageProjectResponse.status).toBe(200);
    expect(imageProjectBody.project?.mode).toBe("image_avatar");
    expect((imageProjectBody.project?.sourceImages?.[0]?.fileName ?? "").length).toBeGreaterThan(0);
    expect(imageProjectBody.project?.sceneDraft?.mode).toBe("image_avatar");
    expect(
      imageProjectBody.project?.sceneDraft?.assets?.some(
        (asset) => asset.kind === "avatar_head",
      ),
    ).toBe(true);
  });

  it("creates an image-guided mesh project", async () => {
    tempDir = makeTempDir("studio-world-image-mesh-route");
    process.env.OPENCLAW_STATE_DIR = tempDir;

    const pngBytes = Uint8Array.from([
      137, 80, 78, 71, 13, 10, 26, 10,
      0, 0, 0, 13, 73, 72, 68, 82,
      0, 0, 0, 1, 0, 0, 0, 1,
      8, 6, 0, 0, 0, 31, 21, 196, 137,
      0, 0, 0, 1, 73, 68, 65, 84,
      120, 156, 99, 0, 0, 0, 2, 0, 1,
      229, 39, 212, 162, 0, 0, 0, 0,
      73, 69, 78, 68, 174, 66, 96, 130,
    ]);

    const formData = new FormData();
    formData.append(
      "image",
      new File([pngBytes], "mesh.png", { type: "image/png" }),
    );

    const uploadResponse = await POST(
      new Request("http://localhost/api/studio-world", {
        method: "POST",
        body: formData,
      }),
    );
    const uploadBody = (await uploadResponse.json()) as {
      sourceImage?: Record<string, unknown>;
    };

    expect(uploadResponse.status).toBe(200);

    const meshProjectResponse = await POST({
      text: async () =>
        JSON.stringify({
          action: "generate",
          input: {
            name: "Mesh Test",
            prompt: "Portrait relief mesh from uploaded image.",
            style: "stylized",
            scale: "medium",
            focus: "assets",
            imageMode: "mesh",
            sourceImage: uploadBody.sourceImage,
          },
        }),
    } as unknown as Request);

    const meshProjectBody = (await meshProjectResponse.json()) as {
      project?: {
        mode?: string;
        sceneDraft?: { mode?: string; assets?: Array<{ id?: string }> };
      };
    };

    expect(meshProjectResponse.status).toBe(200);
    expect(meshProjectBody.project?.mode).toBe("image_mesh");
    expect(meshProjectBody.project?.sceneDraft?.mode).toBe("image_mesh");
    expect(
      meshProjectBody.project?.sceneDraft?.assets?.some(
        (asset) => asset.id === "mesh_panel",
      ),
    ).toBe(true);
  });
});
