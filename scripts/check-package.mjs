import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const metadata = JSON.parse(await readFile("package.json", "utf8"));
// Ignore lifecycle scripts here: the caller builds before checking the archive.
const [packed] = JSON.parse(execSync("npm pack --dry-run --json --ignore-scripts", { encoding: "utf8" }));
const files = new Set(packed.files.map((file) => file.path));
for (const required of [metadata.main.replace(/^\.\//, ""), metadata.lensExtension.icon,
  metadata.lensExtension.banner, "assets/screenshots/layout-editor.png", "package.json", "README.md", "LICENSE", "NOTICE", "CHANGELOG.md"]) {
  assert.ok(files.has(required), `Package is missing ${required}`);
}
for (const file of files) {
  assert.ok(!/^(?:src|tests|scripts|preview|node_modules|\.github)\//.test(file), `Unexpected development file: ${file}`);
  assert.ok(!/(?:^|\/)(?:package-lock\.json|\.npmrc|\.env(?:\..*)?)$/.test(file), `Unexpected local file: ${file}`);
}
assert.ok(metadata.keywords.includes("lens-extension"), "Missing Lens Marketplace keyword");
console.log(`Package contents verified: ${files.size} files, ${packed.size} compressed bytes.`);
