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

test("applying and editing with a Lens-hidden column preserves its configuration and order", async () => {
  const dom = new JSDOM('<body><div id="app"></div></body>', { pretendToBeVisual: true });
  const keys = ["window", "document", "HTMLElement", "IS_REACT_ACT_ENVIRONMENT"];
  const saved = new Map(keys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
  const { createRoot } = await import("react-dom/client");
  const root = createRoot(dom.window.document.querySelector("#app"));
  const fields = [
    { id: "name", line: "primary", width: 36 },
    { id: "node", line: "secondary", width: 23 },
    { id: "cpu", line: "secondary", width: 5 },
  ];
  const settings = { version: 1, enabled: true, tables: { pods: { fields, labels: true, autoSecondary: false } } };
  let applied;
  const tables = [{ id: "pods", fields: [{ id: "name", label: "Name" }, { id: "cpu", label: "CPU" }] }];
  const apply = () => [...dom.window.document.querySelectorAll("button")].find((button) => button.textContent === "Apply layout").click();
  try {
    await act(async () => root.render(React.createElement(LayoutEditor, { tables, settings, onApply: (value) => { applied = value; }, onCancel: () => {} })));
    await act(async () => apply());
    assert.deepEqual(applied.tables.pods.fields, fields);
    await act(async () => {
      const select = dom.window.document.querySelector('[aria-label="Line for CPU"]');
      Object.getOwnPropertyDescriptor(dom.window.HTMLSelectElement.prototype, "value").set.call(select, "primary");
      select.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
    await act(async () => dom.window.document.querySelector('[aria-label="Move CPU left"]').click());
    await act(async () => apply());
    assert.deepEqual(applied.tables.pods.fields.map((field) => field.id), ["cpu", "node", "name"]);
    assert.deepEqual(applied.tables.pods.fields[1], fields[1]);
    await act(async () => [...dom.window.document.querySelectorAll("button")].find((button) => button.textContent === "Troubleshooting").click());
    await act(async () => apply());
    assert.deepEqual(applied.tables.pods.fields.find((field) => field.id === "node"), fields[1]);
    assert.equal(applied.tables.pods.fields[1].id, "node");
    const restoredTables = [{ id: "pods", fields: [...tables[0].fields, { id: "node", label: "Node" }] }];
    await act(async () => root.render(React.createElement(LayoutEditor, { tables: restoredTables, settings, onApply: (value) => { applied = value; }, onCancel: () => {} })));
    assert.equal(dom.window.document.querySelector('[aria-label="Width for Node"]').value, "23");
    assert.deepEqual(settings.tables.pods.fields.map((field) => ({ ...field })), [
      { id: "name", line: "primary", width: 36 },
      { id: "node", line: "secondary", width: 23 },
      { id: "cpu", line: "secondary", width: 5 },
    ]);
  } finally {
    await act(async () => root.unmount());
    dom.window.close();
    for (const [key, descriptor] of saved) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});

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
