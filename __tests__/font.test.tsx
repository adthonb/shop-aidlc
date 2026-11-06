import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const tailwindConfig = require("../tailwind.config.js");

describe("Web app font configuration ('Roboto,Arial,sans-serif')", () => {
  it("configures Tailwind fontFamily.sans to Roboto, Arial, sans-serif", () => {
    expect(tailwindConfig.theme.extend.fontFamily.sans).toEqual([
      "Roboto",
      "Arial",
      "sans-serif",
    ]);
  });

  it("sets font-family to Roboto,Arial,sans-serif in globals.css and layout.tsx", () => {
    const globalsCss = fs.readFileSync(
      path.resolve(import.meta.dirname, "../src/app/globals.css"),
      "utf-8"
    );
    const layoutTsx = fs.readFileSync(
      path.resolve(import.meta.dirname, "../src/app/layout.tsx"),
      "utf-8"
    );

    expect(globalsCss).toMatch(/font-family:\s*Roboto,\s*Arial,\s*sans-serif/);
    expect(layoutTsx).not.toContain("--font-prompt");
    expect(layoutTsx).toContain("Roboto,Arial,sans-serif");
  });
});
