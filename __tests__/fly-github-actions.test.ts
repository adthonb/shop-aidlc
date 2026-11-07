import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const WORKFLOW_PATH = path.resolve(
  process.cwd(),
  ".github/workflows/fly.yml"
);

describe("Fly.io Continuous Deployment GitHub Actions workflow", () => {
  it("creates .github/workflows/fly.yml", () => {
    expect(fs.existsSync(WORKFLOW_PATH)).toBe(true);
  });

  it("configures Fly Deploy workflow on push to main branch", () => {
    const content = fs.readFileSync(WORKFLOW_PATH, "utf-8");

    expect(content).toMatch(/^name:\s*Fly Deploy/m);
    expect(content).toMatch(/on:\s*\n\s*push:\s*\n\s*branches:\s*\n\s*-\s*main/m);
  });

  it("configures deploy job with setup-flyctl, concurrency group, and FLY_API_TOKEN", () => {
    const content = fs.readFileSync(WORKFLOW_PATH, "utf-8");

    expect(content).toMatch(/jobs:\s*\n\s*deploy:/m);
    expect(content).toMatch(/name:\s*Deploy app/m);
    expect(content).toMatch(/runs-on:\s*ubuntu-latest/m);
    expect(content).toMatch(/concurrency:\s*deploy-group/m);
    expect(content).toMatch(/-\s*uses:\s*actions\/checkout@v7/m);
    expect(content).toMatch(
      /-\s*uses:\s*superfly\/flyctl-actions\/setup-flyctl@master/m
    );
    expect(content).toMatch(/-\s*run:\s*flyctl deploy --remote-only/m);
    expect(content).toMatch(
      /env:\s*\n\s*FLY_API_TOKEN:\s*\$\{\{\s*secrets\.FLY_API_TOKEN\s*\}\}/m
    );
  });
});
