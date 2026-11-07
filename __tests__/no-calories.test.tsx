import fs from "fs";
import path from "path";
import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import CustomerStorefront from "@/components/CustomerStorefront";
import { StoreData } from "@/types/store";

describe("Menu items have no calories field or display", () => {
  afterEach(() => {
    cleanup();
  });

  it("does not reference calories in src/types/store.ts, src/components/CustomerStorefront.tsx, or data/menu.json", () => {
    const filesToCheck = [
      "src/types/store.ts",
      "src/components/CustomerStorefront.tsx",
      "data/menu.json",
    ];
    for (const relPath of filesToCheck) {
      const content = fs.readFileSync(
        path.resolve(process.cwd(), relPath),
        "utf-8"
      );
      expect(content).not.toContain("calories");
    }
  });

  it("does not display kcal on CustomerStorefront menu cards", () => {
    const data = JSON.parse(
      fs.readFileSync(path.resolve(process.cwd(), "data/menu.json"), "utf-8")
    ) as StoreData;

    render(<CustomerStorefront initialData={data} />);

    expect(screen.queryAllByText(/kcal/i)).toHaveLength(0);
  });
});
