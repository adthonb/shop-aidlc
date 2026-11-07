// @vitest-environment node
import fs from "fs";
import fsp from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import { ensureDataDirs, getOrders, getSlipsDir, getStoreData } from "@/lib/storage";

const ROOT_DIR = process.cwd();
const FLY_TOML_PATH = path.resolve(ROOT_DIR, "fly.toml");
const DOCKERIGNORE_PATH = path.resolve(ROOT_DIR, ".dockerignore");

describe("Fly.io Volume persistence for data directory and deploy exclusion", () => {
  const originalDataDir = process.env.DATA_DIR;
  let tempVolumeDir: string | null = null;

  afterEach(async () => {
    if (originalDataDir === undefined) {
      delete process.env.DATA_DIR;
    } else {
      process.env.DATA_DIR = originalDataDir;
    }
    if (tempVolumeDir && fs.existsSync(tempVolumeDir)) {
      await fsp.rm(tempVolumeDir, { recursive: true, force: true });
      tempVolumeDir = null;
    }
  });

  it("configures fly.toml with [[mounts]] mounting persistent volume to /app/data", () => {
    expect(fs.existsSync(FLY_TOML_PATH)).toBe(true);
    const flyToml = fs.readFileSync(FLY_TOML_PATH, "utf-8");

    expect(flyToml).toMatch(/^app\s*=\s*["']raynue["']/m);
    expect(flyToml).toMatch(/\[\[mounts\]\]/m);
    expect(flyToml).toMatch(/source\s*=\s*["']raynue_data["']/m);
    expect(flyToml).toMatch(/destination\s*=\s*["']\/app\/data["']/m);
    expect(flyToml).toMatch(/\[http_service\]/m);
    expect(flyToml).toMatch(/internal_port\s*=\s*3000/m);
  });

  it("excludes data directory in .dockerignore to prevent deploy from overwriting volume data", () => {
    expect(fs.existsSync(DOCKERIGNORE_PATH)).toBe(true);
    const dockerignore = fs.readFileSync(DOCKERIGNORE_PATH, "utf-8");
    const lines = dockerignore
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));

    const excludesData = lines.some(
      (line) =>
        line === "data" ||
        line === "data/" ||
        line === "/data" ||
        line === "/data/" ||
        line === "data/**"
    );
    expect(excludesData).toBe(true);
    expect(lines).not.toContain("!/data/slips/.gitkeep");
  });

  it("respects DATA_DIR for Fly volume mount and preserves existing volume files without overwriting", async () => {
    tempVolumeDir = await fsp.mkdtemp(path.join(os.tmpdir(), "raynue-fly-vol-"));
    process.env.DATA_DIR = tempVolumeDir;

    // 1. On an empty mounted Fly volume, getStoreData seeds default menu.json without throwing
    const seededStore = await getStoreData();
    expect(seededStore.store.storeName).toContain("เรณู");
    expect(fs.existsSync(path.join(tempVolumeDir, "menu.json"))).toBe(true);
    expect(getSlipsDir()).toBe(path.join(tempVolumeDir, "slips"));

    // 2. Customize menu.json and orders.json on the volume (simulating live production data)
    const customStore = structuredClone(seededStore);
    customStore.store.storeName = "เรณู สาขาพิเศษ (Persisted on Volume)";
    await fsp.writeFile(
      path.join(tempVolumeDir, "menu.json"),
      JSON.stringify(customStore, null, 2),
      "utf-8"
    );
    await fsp.writeFile(
      path.join(tempVolumeDir, "orders.json"),
      JSON.stringify([{ id: "persisted-order-1", queueNumber: "#A099" }], null, 2),
      "utf-8"
    );

    // 3. Re-running ensureDataDirs / getStoreData / getOrders never overwrites existing volume data
    await ensureDataDirs();
    const afterDeployStore = await getStoreData();
    const afterDeployOrders = await getOrders();

    expect(afterDeployStore.store.storeName).toBe(
      "เรณู สาขาพิเศษ (Persisted on Volume)"
    );
    expect(afterDeployOrders).toHaveLength(1);
    expect(afterDeployOrders[0].id).toBe("persisted-order-1");
  });
});
