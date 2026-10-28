import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { $ } from "bun";

const root = join(import.meta.dir, "..");
const fixture = await mkdtemp(join(tmpdir(), "hetzner-package-"));

try {
  await $`bun pm pack --destination ${fixture} --ignore-scripts`.cwd(root).quiet();

  const tarballs = await Array.fromAsync(new Bun.Glob("*.tgz").scan({ cwd: fixture, absolute: true }));
  if (tarballs.length !== 1) {
    throw new Error(`Expected one package tarball, found ${tarballs.length}`);
  }

  await writeFile(
    join(fixture, "package.json"),
    JSON.stringify({
      private: true,
      type: "module",
      dependencies: {
        "@neonjelly/hetzner-api": `file:${tarballs[0]}`,
      },
    }),
  );
  await writeFile(
    join(fixture, "smoke.mjs"),
    `import { createHetznerClient, HetznerApiError, isHetznerApiError, StorageBoxesClient } from "@neonjelly/hetzner-api";
import { createHetznerClient as createFromAlias } from "@neonjelly/hetzner-api/api";
import {
  HetznerApiError as HetznerApiErrorFromSubpath,
  StorageBoxesClient as StorageBoxesFromSubpath,
} from "@neonjelly/hetzner-api/storage-boxes";

if (typeof createHetznerClient !== "function" || typeof createFromAlias !== "function") {
  throw new Error("Client factory export is missing");
}
if (typeof StorageBoxesClient !== "function" || typeof StorageBoxesFromSubpath !== "function") {
  throw new Error("Storage Boxes client export is missing");
}
if (typeof HetznerApiError !== "function" || typeof isHetznerApiError !== "function") {
  throw new Error("Error exports are missing");
}
if (HetznerApiErrorFromSubpath !== HetznerApiError) {
  throw new Error("The root and storage-boxes entries must share one HetznerApiError class");
}
`,
  );

  await $`bun install`.cwd(fixture).quiet();
  await $`bun smoke.mjs`.cwd(fixture).quiet();
  console.log("Package smoke test passed");
} finally {
  await rm(fixture, { recursive: true, force: true });
}
