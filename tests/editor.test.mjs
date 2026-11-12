import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { build } from "esbuild";
import { JSDOM } from "jsdom";
import React, { act } from "react";

const require = createRequire(import.meta.url);
const bundle = await build({
  entryPoints: ["src/editor.tsx"], bundle: true, write: false, format: "esm", platform: "browser", jsx: "automatic",
  plugins: [{ name: "shared-react", setup(build) { build.onResolve({ filter: /^react(?:\/.*)?$/ }, ({ path }) => ({ path: pathToFileURL(require.resolve(path)).href, external: true })); } }],
});
const { LayoutEditor } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);

test("editor previews field changes, drag/drop, keyboard reordering, widths, view isolation, presets, apply and cancel", async () => {
  const dom = new JSDOM('<body><div id="app"></div></body>', { pretendToBeVisual: true });
  const keys = ["window", "document", "HTMLElement", "IS_REACT_ACT_ENVIRONMENT"];
  const saved = new Map(keys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
  const { createRoot } = await import("react-dom/client");
  const root = createRoot(dom.window.document.querySelector("#app"));
  const document = dom.window.document;
  const fields = ["name", "status", "age", "namespace", "cpu", "node", "qos"].map((id) => ({ id, label: ({ name: "Name", status: "Status", age: "Age", namespace: "Namespace", cpu: "CPU", node: "Node", qos: "QoS" })[id] }));
  const tables = [{ id: "pods", fields }, { id: "deployments", fields }];
  const settings = { version: 1, enabled: true, tables: {} };
  let applied;
  let cancelled = false;
  const select = (label) => document.querySelector(`[aria-label="${label}"]`);
  async function change(label, value) {
    await act(async () => {
      const input = select(label);
      const prototype = input.tagName === "SELECT" ? dom.window.HTMLSelectElement.prototype : dom.window.HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, "value").set.call(input, value);
      input.dispatchEvent(new dom.window.Event(input.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
    });
  }
  try {
    await act(async () => root.render(React.createElement(LayoutEditor, { tables, settings, onApply: (value) => { applied = value; }, onCancel: () => { cancelled = true; } })));
    assert.match(document.querySelector(".lwr-preview-primary").textContent, /Name.*Status.*Age/);
    await change("Line for CPU", "primary");
    assert.match(document.querySelector(".lwr-preview-primary").textContent, /CPU/);
    await act(async () => select("Move CPU left").click());
    const beforeWidth = document.querySelector(".lwr-preview-primary").style.gridTemplateColumns;
    await change("Width for CPU", "20");
    assert.notEqual(document.querySelector(".lwr-preview-primary").style.gridTemplateColumns, beforeWidth);
    await change("Line for Node", "hidden");
    assert.doesNotMatch(document.querySelector(".lwr-preview-secondary").textContent, /Node/);
    // Native drag data is checked against current view's fields.
    await act(async () => {
      const drop = new dom.window.Event("drop", { bubbles: true, cancelable: true });
      Object.defineProperty(drop, "dataTransfer", { value: { getData: () => "namespace" } });
      document.querySelector('[aria-label="First line"]').dispatchEvent(drop);
    });
    assert.match(document.querySelector(".lwr-preview-primary").textContent, /Namespace/);
    await change("Workload view", "deployments");
    assert.equal(select("Line for Node").value, "secondary");
    await change("Workload view", "pods");
    assert.equal(select("Line for Node").value, "hidden");
    await act(async () => [...document.querySelectorAll("button")].find((button) => button.textContent === "Apply layout").click());
    assert.equal(applied.tables.pods.fields.find((field) => field.id === "node").line, "hidden");
    assert.equal(applied.tables.pods.fields.find((field) => field.id === "cpu").width, 20);
    await act(async () => select("Auto width for second line").click());
    assert.equal(select("Width for Namespace").disabled, false);
    // Namespace was moved to the first line, so its manual width remains editable.
    await change("Line for Namespace", "secondary");
    assert.equal(select("Width for Namespace").disabled, true);
    assert.ok(document.querySelector(".lwr-preview-secondary").classList.contains("lwr-preview-auto"));
    await act(async () => [...document.querySelectorAll("button")].find((button) => button.textContent === "Apply layout").click());
    assert.equal(applied.tables.pods.autoSecondary, true);
    await act(async () => select("Auto width for second line").click());
    assert.equal(select("Width for Namespace").disabled, false);
    assert.deepEqual(settings.tables, {});
    await act(async () => [...document.querySelectorAll("button")].find((button) => button.textContent === "All fields").click());
    assert.equal(select("Line for Node").value, "secondary");
    await act(async () => [...document.querySelectorAll("button")].find((button) => button.textContent === "Cancel").click());
    assert.equal(cancelled, true);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
