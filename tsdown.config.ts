import { defineConfig } from "tsdown";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "storage-boxes": "src/storageBoxes.ts",
  },
  format: ["esm"],
  platform: "neutral",
  target: "es2022",
  dts: true,
  sourcemap: true,
  clean: true,
  // Keep exports owned by package.json — do not rewrite the manifest at build time.
  exports: false,
  publint: {
    strict: true,
  },
  attw: {
    profile: "esm-only",
    level: "error",
  },
});
