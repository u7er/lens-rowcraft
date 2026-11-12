import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { JSDOM } from "jsdom";
import { Virtualizer } from "@tanstack/virtual-core";
import React, { act, useLayoutEffect, useReducer, useRef, useState } from "react";

const compiled = await build({
  stdin: {
    contents: 'export * from "./src/layout.ts"; export * from "./src/virtualizer.ts"; export * from "./src/controller.ts"; export * from "./src/config.ts"; export * from "./src/auto-width.ts";',
    resolveDir: process.cwd(), loader: "ts",
  },
  bundle: true, format: "esm", platform: "browser", write: false,
});
const { placements, layoutRow, clearLayout, doubleRowHeights, findWorkloadVirtualizer, startLayout, defaultLayout, resolveLayout, moveField, sanitizeSettings, fitNaturalWidths, fieldLabel } =
  await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`);

function fixture(tableId = "pods") {
  const dom = new JSDOM('<body><section><div data-table-head-test><div></div></div><div data-table-container-test><div><div data-row="pod-1"></div></div></div></section></body>', { pretendToBeVisual: true });
  const document = dom.window.document;
  const element = document.querySelector("[data-table-container-test]");
  let scrollCallback;
  const scrollRequests = [];
  const virtualizer = new Virtualizer({
    count: 1000,
    getScrollElement: () => element,
    estimateSize: () => 36,
    initialRect: { width: 1200, height: 400 },
    initialOffset: 360,
    scrollToFn: (offset) => { scrollRequests.push(offset); scrollCallback?.(offset, false); },
    observeElementRect: (_instance, callback) => { callback({ width: 1200, height: 400 }); return () => {}; },
    observeElementOffset: (_instance, callback) => { scrollCallback = callback; callback(360, false); return () => {}; },
  });
  Object.defineProperty(element, "scrollHeight", { get: () => virtualizer.getTotalSize() });
  Object.defineProperty(element, "clientHeight", { get: () => 400 });
  const unmount = virtualizer._didMount();
  virtualizer._willUpdate();
  element.__reactFiber$fixture = {
    return: {
      memoizedProps: { tableId },
      memoizedState: { memoizedState: virtualizer },
    },
  };
  const ids = ["id-0", "name", "namespace", "cpu", "memory", "containers", "restarts", "owners", "node", "qos", "status", "age", "menu"];
  for (const [row, header] of [[document.querySelector("[data-row]"), false], [document.querySelector("[data-table-head-test] > div"), true]]) {
    for (const id of ids) {
      const cell = document.createElement("div");
      if (header && id === "id-0") {
        const checkbox = document.createElement("input");
        checkbox.setAttribute("data-select-all-checkbox-test", "true");
        cell.append(checkbox);
      } else cell.setAttribute(header ? "data-column-id-test" : "data-column-id", id);
      cell.style.width = "120px";
      const link = document.createElement("a");
      link.textContent = id === "name" ? "example-api-very-long-deployment-name-7a6f9b4c9d-abc12" : id;
      cell.append(link);
      row.append(cell);
    }
  }
  return { dom, document, element, virtualizer, scrollRequests, close: () => { unmount(); dom.window.close(); } };
}

test("name, status and controller occupy first line; every remaining field occupies second", () => {
  const ids = ["select", "name", "status", "controlledBy", "namespace", "cpu", "memory", "node", "menu"];
  const positions = placements(ids);
  for (const id of ["name", "status", "controlledBy"]) assert.equal(positions.get(id).line, "1 / 2");
  for (const id of ["namespace", "cpu", "memory", "node"]) assert.equal(positions.get(id).line, "2 / 3");
  for (const id of ["select", "menu"]) assert.equal(positions.get(id).line, "1 / 3");
  assert.equal(positions.size, ids.length);
  assert.ok(Number(positions.get("name").column.split(" / ")[1]) > 70);
});

test("missing or hidden primary columns do not leave gaps; extension columns stay on second line", () => {
  const positions = placements(["name", "cpu", "custom.example/image"]);
  assert.deepEqual(positions.get("name"), { line: "1 / 2", column: "2 / 122" });
  assert.equal(positions.get("custom.example/image").line, "2 / 3");
});

test("real virtualizer doubles total height, row offsets and scroll position; restore is exact", () => {
  const f = fixture();
  try {
    const before = f.virtualizer.getVirtualItems().find((row) => row.index === 10);
    const originalSetOptions = f.virtualizer.setOptions;
    assert.equal(f.virtualizer.getTotalSize(), 36000);
    assert.equal(before.start, 360);
    const restore = doubleRowHeights(f.virtualizer);
    assert.equal(f.virtualizer.getTotalSize(), 72000);
    const after = f.virtualizer.getVirtualItems().find((row) => row.index === 10);
    assert.equal(after.start, 720);
    assert.equal(after.size, 72);
    assert.equal(f.scrollRequests.at(-1), 720);
    assert.ok(f.virtualizer.getVirtualItems().every((row) => row.size === 72));
    // Lens reapplies options on every React render. Scaling must survive without multiplying repeatedly.
    f.virtualizer.setOptions({ ...f.virtualizer.options, estimateSize: () => 36 });
    assert.equal(f.virtualizer.options.estimateSize(0), 72);
    f.virtualizer.setOptions(f.virtualizer.options);
    assert.equal(f.virtualizer.options.estimateSize(0), 72);
    // A host-side filter/count change remains intact after restoring.
    f.virtualizer.setOptions({ ...f.virtualizer.options, count: 200 });
    restore();
    restore();
    assert.equal(f.virtualizer.setOptions, originalSetOptions);
    assert.equal(f.virtualizer.options.count, 200);
    assert.equal(f.virtualizer.getTotalSize(), 7200);
    assert.equal(f.virtualizer.options.estimateSize(0), 36);
    assert.equal(f.scrollRequests.at(-1), 360);
  } finally { f.close(); }
});

test("adapter matches workload owner and scroll element; excludes services", () => {
  const f = fixture();
  try {
    assert.equal(findWorkloadVirtualizer(f.element).virtualizer, f.virtualizer);
    f.element.__reactFiber$fixture.return.memoizedProps.tableId = "services";
    assert.deepEqual(findWorkloadVirtualizer(f.element), { workload: false });
    f.element.__reactFiber$fixture.return.memoizedProps.tableId = "pods";
    f.virtualizer.options.getScrollElement = () => f.document.body;
    assert.deepEqual(findWorkloadVirtualizer(f.element), { workload: true });
  } finally { f.close(); }
});

test("layout preserves original cells, click handlers, widths and DOM parents; cleanup removes only own state", () => {
  const f = fixture();
  try {
    const row = f.document.querySelector("[data-row]");
    const originalChildren = [...row.children];
    let clicks = 0;
    originalChildren[1].firstChild.addEventListener("click", () => clicks++);
    layoutRow(row);
    const header = f.document.querySelector("[data-table-head-test] > div");
    layoutRow(header, true);
    assert.equal(header.getAttribute("data-lwr-row"), "header");
    assert.equal(header.firstChild.style.getPropertyValue("--lwr-line"), "1 / 3");
    assert.equal(row.firstChild.style.getPropertyValue("--lwr-line"), "1 / 3");
    assert.deepEqual([...row.children], originalChildren);
    originalChildren[1].firstChild.click();
    assert.equal(clicks, 1);
    assert.equal(originalChildren[1].style.width, "120px");
    assert.equal(originalChildren[1].style.getPropertyValue("--lwr-line"), "1 / 2");
    clearLayout(f.document.body);
    assert.equal(f.document.querySelector("[data-lwr-row]"), null);
    assert.equal(f.document.querySelector("[data-lwr-cell]"), null);
    assert.equal(originalChildren[1].style.width, "120px");
    assert.equal(originalChildren[1].style.getPropertyValue("--lwr-line"), "");
  } finally { f.close(); }
});

test("controller applies layout to existing and newly rendered rows, then restores", async () => {
  const f = fixture();
  try {
    let status;
    const stop = startLayout(f.document, (value) => { status = value; });
    await new Promise((resolve) => f.dom.window.requestAnimationFrame(resolve));
    assert.deepEqual(status, { active: 1, unsupported: 0 });
    assert.equal(f.virtualizer.getTotalSize(), 72000);
    const row = f.document.querySelector("[data-row]");
    assert.equal(row.getAttribute("data-lwr-row"), "data");
    const next = row.cloneNode(true);
    next.removeAttribute("data-lwr-row");
    for (const cell of next.children) cell.removeAttribute("data-lwr-cell");
    next.setAttribute("data-row", "pod-2");
    row.parentElement.append(next);
    await new Promise((resolve) => f.dom.window.setTimeout(resolve, 40));
    assert.equal(next.getAttribute("data-lwr-row"), "data");
    stop();
    assert.equal(f.virtualizer.getTotalSize(), 36000);
    assert.equal(f.document.querySelector("[data-lwr-row]"), null);
  } finally { f.close(); }
});

test("unsupported workload internals leave the existing layout untouched", async () => {
  const f = fixture();
  try {
    f.element.__reactFiber$fixture.return.memoizedState = null;
    let status;
    const stop = startLayout(f.document, (value) => { status = value; });
    await new Promise((resolve) => f.dom.window.requestAnimationFrame(resolve));
    assert.deepEqual(status, { active: 0, unsupported: 1 });
    assert.equal(f.document.querySelector("[data-lwr-row]"), null);
    assert.equal(f.virtualizer.getTotalSize(), 36000);
    stop();
  } finally { f.close(); }
});

test("saved layouts preserve order, widths and visibility; new columns get defaults and invalid settings are repaired", () => {
  const ids = ["name", "status", "age", "cpu", "node", "qos", "custom"];
  const saved = { labels: false, fields: [
    { id: "age", line: "primary", width: 3 }, { id: "name", line: "primary", width: 40 },
    { id: "status", line: "secondary", width: 9 }, { id: "cpu", line: "hidden", width: 4 },
    { id: "name", line: "hidden", width: 1 }, { id: "foreign", line: "primary", width: 10 },
  ] };
  const layout = resolveLayout(ids, saved);
  assert.deepEqual(layout.fields.slice(0, 4).map((field) => field.id), ["age", "name", "status", "cpu"]);
  assert.equal(layout.fields.find((field) => field.id === "cpu").line, "hidden");
  assert.equal(layout.fields.find((field) => field.id === "custom").line, "secondary");
  assert.equal(layout.labels, false);
  assert.equal(layout.fields.filter((field) => field.id === "name").length, 1);
  const positions = placements(ids, layout);
  assert.equal(positions.get("cpu").hidden, true);
  assert.equal(positions.get("status").line, "2 / 3");
  assert.ok(Number(positions.get("age").column.split(" / ")[0]) < Number(positions.get("name").column.split(" / ")[0]));
  const malformed = resolveLayout(["name", "cpu"], { fields: [{ id: "name", line: "hidden", width: 0 }, { id: "cpu", line: "primary", width: 999 }] });
  assert.equal(malformed.fields[0].line, "primary");
  assert.equal(malformed.fields[0].width, 1);
  assert.equal(malformed.fields[1].width, 48);
  assert.deepEqual(sanitizeSettings(null), { version: 1, enabled: true, tables: {} });
});

test("field movement handles cross-line placement, reordering, hiding and Name protection", () => {
  let layout = defaultLayout(["name", "status", "age", "node", "cpu"]);
  layout = moveField(layout, "node", "primary", "status");
  assert.deepEqual(layout.fields.filter((field) => field.line === "primary").map((field) => field.id), ["name", "node", "status", "age"]);
  layout = moveField(layout, "cpu", "hidden");
  assert.equal(layout.fields.find((field) => field.id === "cpu").line, "hidden");
  assert.equal(moveField(layout, "name", "hidden"), layout);
  assert.equal(moveField(layout, "unknown", "primary"), layout);
});

test("natural widths hug short values and shrink long fields before compact metrics", () => {
  const fields = [{ id: "cpu", preferred: 80, minimum: 80 }, { id: "memory", preferred: 125, minimum: 125 }, { id: "node", preferred: 600, minimum: 120 }];
  assert.deepEqual(fitNaturalWidths(fields, 1200).map((field) => field.width), [80, 125, 600]);
  const squeezed = fitNaturalWidths(fields, 500);
  assert.deepEqual(squeezed.map((field) => field.width), [80, 125, 295]);
  for (const available of [0, 100, 325, 500, 1200]) {
    const fitted = fitNaturalWidths(fields, available);
    assert.ok(fitted.every((field) => Number.isFinite(field.width) && field.width >= 0));
    assert.ok(fitted.at(-1).offset + fitted.at(-1).width <= available + 0.001);
  }
});

test("automatic second-line mode persists, preserves manual widths, adds group boundaries and removes service labels", () => {
  const f = fixture();
  try {
    const ids = ["name", "status-icon", "cpu", "memory", "owners", "node", "qos"];
    let layout = resolveLayout(ids, { ...defaultLayout(ids, "all"), labels: false, autoSecondary: true });
    assert.equal(sanitizeSettings({ tables: { pods: layout } }).tables.pods.autoSecondary, true);
    assert.equal(resolveLayout(ids, { fields: layout.fields, labels: true }).autoSecondary, false);
    assert.equal(fieldLabel("status-icon"), "Warnings");
    const row = f.document.querySelector("[data-row]");
    const icon = f.document.createElement("div");
    icon.setAttribute("data-column-id", "status-icon");
    row.append(icon);
    layoutRow(row, false, layout, undefined, { availableWidth: 1400, index: 1 });
    assert.equal(row.getAttribute("data-lwr-labels"), "true");
    assert.equal(row.getAttribute("data-lwr-stripe"), "odd");
    assert.equal(icon.getAttribute("data-lwr-label"), "");
    assert.equal(icon.hasAttribute("data-lwr-empty-icon"), true);
    const cpu = row.querySelector('[data-column-id="cpu"]');
    assert.equal(cpu.hasAttribute("data-lwr-auto"), true);
    assert.ok(Number.parseFloat(cpu.style.getPropertyValue("--lwr-natural-width")) > 0);
    const button = f.document.createElement("button");
    button.textContent = "!";
    icon.append(button);
    layoutRow(row, false, layout, undefined, { availableWidth: 1400 });
    assert.equal(icon.hasAttribute("data-lwr-empty-icon"), false);
    assert.equal(row.querySelector('[data-column-id="name"]').hasAttribute("data-lwr-has-warning"), true);
    assert.equal(icon.style.getPropertyValue("--lwr-column"), row.querySelector('[data-column-id="name"]').style.getPropertyValue("--lwr-column"));
    assert.equal(row.querySelector('[data-column-id="qos"]').hasAttribute("data-lwr-group-start"), true);
    const weights = layout.fields.map((field) => field.width);
    layout = { ...layout, autoSecondary: false };
    layoutRow(row, false, layout);
    assert.equal(cpu.hasAttribute("data-lwr-auto"), false);
    assert.equal(cpu.style.getPropertyValue("--lwr-natural-width"), "");
    assert.deepEqual(layout.fields.map((field) => field.width), weights);
    clearLayout(f.document.body);
    assert.equal(row.hasAttribute("data-lwr-stripe"), false);
    assert.equal(icon.hasAttribute("data-lwr-warning"), false);
  } finally { f.close(); }
});

test("changing configuration updates existing and new cells without resetting the virtualizer; disable restores hidden cells", async () => {
  const f = fixture();
  try {
    let config = defaultLayout(["name", "status", "age", "namespace", "cpu", "memory", "containers", "restarts", "owners", "node", "qos"]);
    let refresh;
    let catalogs;
    const stop = startLayout(f.document, () => {}, {
      getLayout: () => config,
      subscribe: (callback) => { refresh = callback; return () => {}; },
      onCatalog: (tables) => { catalogs = tables; },
    });
    await new Promise((resolve) => f.dom.window.requestAnimationFrame(resolve));
    assert.equal(catalogs[0].id, "pods");
    const cpu = f.element.querySelector('[data-column-id="cpu"]');
    const originalAdapter = f.virtualizer.setOptions;
    config = moveField(config, "cpu", "hidden");
    config = moveField(config, "node", "primary", "name");
    refresh();
    await new Promise((resolve) => f.dom.window.requestAnimationFrame(resolve));
    assert.equal(cpu.hasAttribute("data-lwr-hidden"), true);
    assert.equal(f.element.querySelector('[data-column-id="node"]').style.getPropertyValue("--lwr-line"), "1 / 2");
    assert.equal(f.virtualizer.setOptions, originalAdapter);
    stop();
    assert.equal(cpu.hasAttribute("data-lwr-hidden"), false);
    assert.equal(cpu.style.width, "120px");
  } finally { f.close(); }
});

test("metric text changes refresh natural widths without replacing the text node or virtualizer", async () => {
  const f = fixture();
  try {
    Object.defineProperty(f.element, "clientWidth", { get: () => 1800 });
    const config = { ...defaultLayout(["name", "status", "age", "cpu", "memory", "node"], "all"), autoSecondary: true };
    const stop = startLayout(f.document, () => {}, { getLayout: () => config });
    await new Promise((resolve) => f.dom.window.requestAnimationFrame(resolve));
    const cell = f.element.querySelector('[data-column-id="cpu"]');
    const width = Number.parseFloat(cell.style.getPropertyValue("--lwr-natural-width"));
    const adapter = f.virtualizer.setOptions;
    cell.firstChild.firstChild.nodeValue = "12345.12345";
    await new Promise((resolve) => f.dom.window.setTimeout(resolve, 40));
    assert.ok(Number.parseFloat(cell.style.getPropertyValue("--lwr-natural-width")) > width);
    assert.equal(f.virtualizer.setOptions, adapter);
    stop();
  } finally { f.close(); }
});

test("real React fibers attach, keep two-line virtual rows through rerenders, scroll to end and restore", async () => {
  const dom = new JSDOM('<body><div id="app"></div></body>', { pretendToBeVisual: true });
  const globals = ["window", "document", "HTMLElement", "IS_REACT_ACT_ENVIRONMENT"];
  const descriptors = new Map(globals.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true });
  const { createRoot } = await import("react-dom/client");
  const root = createRoot(dom.window.document.querySelector("#app"));
  let virtualizer;
  let reportScroll;
  let stop;
  const h = React.createElement;
  function TableContents({ tableId, count = 1000 }) {
    const body = useRef(null);
    const [, render] = useReducer((value) => value + 1, 0);
    const [v] = useState(() => new Virtualizer({
      count, getScrollElement: () => body.current, estimateSize: () => 36,
      initialRect: { width: 1200, height: 400 },
      scrollToFn: (offset) => reportScroll?.(offset, false),
      observeElementRect: (_v, callback) => { callback({ width: 1200, height: 400 }); return () => {}; },
      observeElementOffset: (_v, callback) => { reportScroll = callback; callback(0, false); return () => {}; },
    }));
    v.setOptions({ ...v.options, count, estimateSize: () => 36, onChange: () => render() });
    virtualizer = v;
    useLayoutEffect(() => v._didMount(), [v]);
    useLayoutEffect(() => { v._willUpdate(); });
    const cells = (header) => ["name", "namespace", "status", "controlledBy", "cpu"].map((id) =>
      h("div", { key: id, [header ? "data-column-id-test" : "data-column-id"]: id }, id));
    return h("section", { "data-table-fixture": tableId },
      h("div", { "data-table-head-test": true }, h("div", {}, ...cells(true))),
      h("div", {
        "data-table-container-test": true,
        ref: (element) => {
          body.current = element;
          if (element) {
            Object.defineProperty(element, "scrollHeight", { configurable: true, get: () => v.getTotalSize() });
            Object.defineProperty(element, "clientHeight", { configurable: true, get: () => 400 });
          }
        },
      }, h("div", { style: { height: v.getTotalSize() } }, ...v.getVirtualItems().map((row) =>
        h("div", { key: row.index, "data-row": row.index, style: { height: row.size, transform: `translateY(${row.start}px)` } }, ...cells(false))))),
    );
  }
  try {
    await act(async () => root.render(h(TableContents, { tableId: "pods" })));
    const element = dom.window.document.querySelector("[data-table-container-test]");
    assert.equal(findWorkloadVirtualizer(element).virtualizer, virtualizer);
    await act(async () => {
      stop = startLayout(dom.window.document, () => {});
      await new Promise((resolve) => dom.window.setTimeout(resolve, 60));
    });
    await act(async () => { await new Promise((resolve) => dom.window.setTimeout(resolve, 40)); });
    assert.equal(virtualizer.options.estimateSize(0), 72);
    assert.equal(element.querySelector("[data-row]").style.height, "72px");
    await act(async () => root.render(h(TableContents, { tableId: "pods", count: 200 })));
    assert.equal(virtualizer.getTotalSize(), 14400);
    await act(async () => virtualizer.scrollToOffset(14000));
    assert.ok([...element.querySelectorAll("[data-row]")].some((row) => row.getAttribute("data-row") === "199"));
    await act(async () => { await new Promise((resolve) => dom.window.setTimeout(resolve, 40)); });
    assert.ok([...element.querySelectorAll("[data-row]")].every((row) => row.style.height === "72px" && row.hasAttribute("data-lwr-row")));
    await act(async () => { stop(); stop = undefined; });
    await act(async () => { await new Promise((resolve) => dom.window.setTimeout(resolve, 40)); });
    assert.equal(virtualizer.getTotalSize(), 7200);
    assert.equal(element.querySelector("[data-lwr-row]"), null);
    assert.ok([...element.querySelectorAll("[data-row]")].every((row) => row.style.height === "36px"));
    await act(async () => {
      stop = startLayout(dom.window.document, () => {});
      await new Promise((resolve) => dom.window.setTimeout(resolve, 40));
    });
    assert.equal(virtualizer.options.estimateSize(0), 72);
    await act(async () => root.render(h(TableContents, { tableId: "services", count: 200 })));
    await act(async () => { await new Promise((resolve) => dom.window.setTimeout(resolve, 40)); });
    assert.equal(virtualizer.options.estimateSize(0), 36);
    assert.equal(element.querySelector("[data-lwr-row]"), null);
  } finally {
    await act(async () => { stop?.(); root.unmount(); });
    dom.window.close();
    for (const [key, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  }
});
