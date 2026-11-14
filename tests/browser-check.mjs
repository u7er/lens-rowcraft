import assert from "node:assert/strict";
import { build } from "esbuild";
import { launchBrowser } from "../scripts/browser.mjs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const bundle = await build({ entryPoints: ["tests/browser-fixture.ts"], bundle: true, write: false, format: "iife", platform: "browser" });
const browser = await launchBrowser();
try {
  const page = await browser.newPage({ viewport: { width: 1800, height: 420 }, deviceScaleFactor: 1 });
  await page.setContent('<!doctype html><html><head><title>Workload row layout test</title></head><body></body></html>');
  await page.addScriptTag({ content: bundle.outputFiles[0].text });
  for (const width of [1800, 900, 560]) {
    await page.setViewportSize({ width, height: 420 });
    const data = await page.evaluate(() => {
      window.fixture.apply(true);
      return [...document.querySelectorAll('[data-row]')].map((row) => {
        const r = row.getBoundingClientRect();
        return { left: r.left, right: r.right, middle: r.top + r.height / 2,
          fields: [...row.querySelectorAll('[data-lwr-auto]:not([data-lwr-warning])')].map((cell) => {
            const c = cell.getBoundingClientRect();
            return { id: cell.getAttribute('data-column-id'), left: c.left, right: c.right, top: c.top, width: c.width };
          }),
        };
      });
    });
    for (const row of data) {
      const ordered = [...row.fields].sort((a, b) => a.left - b.left);
      for (let index = 0; index < ordered.length; index++) {
        const field = ordered[index];
        assert.ok(field.left >= row.left + 39, `${width}: ${field.id} starts outside content`);
        assert.ok(field.right <= row.right - 39, `${width}: ${field.id} overflows row`);
        assert.ok(Math.abs(field.top - row.middle) < 1, `${width}: ${field.id} is not on second line`);
        if (index) assert.ok(field.left >= ordered[index - 1].right - 0.1, `${width}: overlapping fields`);
      }
    }
    if (width === 1800) {
      const node = (row) => row.fields.find((field) => field.id === 'node');
      assert.ok(node(data[0]).width > node(data[1]).width + 50, 'Node width does not follow each row’s text');
      assert.ok(data[0].fields.at(-1).right < data[0].right - 100, 'Fields stretch instead of hugging content');
    }
  }
  await page.setViewportSize({ width: 1800, height: 420 });
  await page.evaluate(() => window.fixture.apply(true));
  assert.equal(await page.locator('[data-row="1"] [data-lwr-warning]').isVisible(), false);
  const icon = await page.locator('[data-row="0"] [data-lwr-warning]').boundingBox();
  const name = await page.locator('[data-row="0"] [data-column-id="name"] a').boundingBox();
  assert.ok(icon.x + icon.width <= name.x, 'Warning icon overlaps name');
  await page.locator('[data-row="0"] [data-column-id="node"] a').click();
  assert.equal(await page.evaluate(() => window.fixture.clicks()), 1);
  const artifactDirectory = await mkdtemp(path.join(tmpdir(), 'lens-rowcraft-check-'));
  await page.screenshot({ path: path.join(artifactDirectory, 'auto-width.png') });
  await page.evaluate(() => window.fixture.apply(false));
  assert.equal(await page.locator('[data-lwr-auto]').count(), 0);
  await page.evaluate(() => window.fixture.clear());
  assert.equal(await page.locator('[data-lwr-cell]').count(), 0);
  const dialogBundle = await build({
    stdin: { contents: `
      import { createRoot } from "react-dom/client";
      import { LayoutEditorDialog } from "./src/editor-dialog.tsx";
      import { editorCss } from "./src/editor-styles.ts";
      const style = document.createElement("style");
      style.textContent = editorCss;
      document.head.append(style);
      document.body.innerHTML = '<div id="dialog-host" style="display:flex;justify-content:center"></div>';
      createRoot(document.getElementById("dialog-host")).render(<LayoutEditorDialog
        tables={[{ id: "pods", fields: ["name", "cpu", "memory", "node", "status", "age"].map(id => ({ id, label: id })) }]}
        settings={{ version: 1, enabled: true, tables: {} }} onApply={() => {}} onCancel={() => {}} />);
    `, resolveDir: process.cwd(), loader: "tsx" },
    bundle: true, write: false, format: "iife", platform: "browser", jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
  });
  await page.addScriptTag({ content: dialogBundle.outputFiles[0].text });
  await page.getByRole('dialog', { name: 'Workload layout' }).waitFor();
  for (const width of [1800, 900, 560]) {
    await page.setViewportSize({ width, height: 420 });
    const bounds = await page.getByRole('dialog').boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width, `${width}: dialog overflows viewport width`);
    assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= 420, `${width}: dialog overflows viewport height`);
    await page.getByRole('button', { name: 'Apply layout', exact: true }).scrollIntoViewIfNeeded();
    await page.getByRole('button', { name: 'Apply layout', exact: true }).click();
  }
  console.log('Browser checks pass: 1800/900/560px, content widths, no overlap, warning placement, original links, static mode and cleanup.');
  console.log('Dialog checks pass: accessible title, viewport bounds and reachable Apply button at 1800/900/560px.');
} finally { await browser.close(); }
