import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const packageJson = JSON.parse(
  readFileSync(join(process.cwd(), "package.json"), "utf8")
) as {
  name?: string;
  scripts?: Record<string, string>;
  exports?: Record<string, unknown>;
};

describe("TypeScript package metadata", () => {
  it("publishes a single isolated ESM entrypoint with build and test scripts", () => {
    expect(packageJson.name).toBe("debugvisualizer");
    expect(packageJson.exports).toHaveProperty(".");
    expect(packageJson.scripts).toMatchObject({
      build: "tsc -p tsconfig.json",
      test: "vitest run",
      typecheck: "tsc -p tsconfig.json --noEmit"
    });
  });
});
