"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  workloadRowsFeature: () => workloadRowsFeature
});
module.exports = __toCommonJS(index_exports);
var import_feature_core = require("@k8slens/feature-core");
var import_stylesheet_contracts = require("@k8slens/stylesheet-contracts");

// src/config.ts
var emptySettings = { version: 1, enabled: true, tables: {} };
var normalize = (id) => id.replace(/[^a-z0-9]/gi, "").toLowerCase();
var isWarningIcon = (id) => normalize(id) === "statusicon";
var isControl = (id) => ["selection", "select", "checkbox", "id0", "menu", "actions", "contextmenu"].includes(normalize(id));
var isName = (id) => normalize(id) === "name";
var isOwner = (id) => ["controlledby", "owner", "owners", "ownerreferences"].includes(normalize(id));
var isStatus = (id) => ["status", "phase"].includes(normalize(id));
function fieldLabel(id) {
  const labels = {
    name: "Name",
    namespace: "Namespace",
    cpu: "CPU",
    memory: "Memory",
    containers: "Containers",
    restarts: "Restarts",
    node: "Node",
    qos: "QoS",
    age: "Age",
    status: "Status",
    phase: "Status",
    owners: "Controlled By",
    owner: "Controlled By",
    controlledby: "Controlled By",
    warning: "Warnings",
    warnings: "Warnings",
    statusicon: "Warnings"
  };
  return labels[normalize(id)] ?? id.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[-_]/g, " ");
}
function defaultLayout(ids, preset = "balanced") {
  const fields = ids.filter((id) => !isControl(id)).map((id) => {
    const key = normalize(id);
    let line = "secondary";
    let width = /namespace|node/i.test(id) ? 10 : 5;
    if (isName(id)) {
      line = "primary";
      width = 36;
    }
    if (isStatus(id)) {
      line = "primary";
      width = 7;
    }
    if (key === "age") {
      line = "primary";
      width = 5;
    }
    if (isWarningIcon(id)) {
      line = "primary";
      width = 1;
    }
    if (preset !== "all" && ["qos", "containers"].includes(key)) line = "hidden";
    if (preset === "all") {
      if (key === "age") line = "secondary";
      if (isOwner(id)) {
        line = "primary";
        width = 10;
      }
    }
    if (preset === "troubleshooting") {
      if (key === "restarts" || /warning/.test(key)) {
        line = "primary";
        width = 5;
      }
      if (key === "containers") line = "secondary";
    }
    return { id, line, width };
  });
  fields.sort((a, b) => Number(isName(b.id)) - Number(isName(a.id)));
  return { fields, labels: true, autoSecondary: false };
}
function resolveLayout(ids, value) {
  const defaults = defaultLayout(ids);
  if (!value || typeof value !== "object") return defaults;
  const raw = value;
  if (!Array.isArray(raw.fields)) return defaults;
  const allowed = new Set(defaults.fields.map((field) => field.id));
  const seen = /* @__PURE__ */ new Set();
  const fields = [];
  for (const field of raw.fields) {
    if (!field || typeof field.id !== "string" || !allowed.has(field.id) || seen.has(field.id)) continue;
    if (!["primary", "secondary", "hidden"].includes(field.line)) continue;
    seen.add(field.id);
    fields.push({
      id: field.id,
      line: isName(field.id) && field.line === "hidden" || isWarningIcon(field.id) && field.line !== "hidden" ? "primary" : field.line,
      width: Number.isFinite(field.width) ? Math.max(1, Math.min(48, Math.round(field.width))) : 5
    });
  }
  fields.push(...defaults.fields.filter((field) => !seen.has(field.id)));
  return { fields, labels: raw.labels !== false, autoSecondary: raw.autoSecondary === true };
}
function sanitizeSettings(value) {
  if (!value || typeof value !== "object") return { ...emptySettings, tables: {} };
  const raw = value;
  const tables = {};
  if (raw.tables && typeof raw.tables === "object" && !Array.isArray(raw.tables)) {
    for (const [id, layout] of Object.entries(raw.tables)) {
      if (!layout || !Array.isArray(layout.fields)) continue;
      const ids = layout.fields.filter((field) => field && typeof field.id === "string").map((field) => field.id);
      tables[id] = resolveLayout(ids, layout);
    }
  }
  return { version: 1, enabled: raw.enabled !== false, tables };
}
function moveField(layout, id, line, before) {
  const field = layout.fields.find((candidate) => candidate.id === id);
  if (!field || isName(id) && line === "hidden") return layout;
  if (id === before && field.line === line) return layout;
  const fields = layout.fields.filter((candidate) => candidate.id !== id);
  let position = before ? fields.findIndex((candidate) => candidate.id === before && candidate.line === line) : -1;
  if (position < 0) {
    const last = fields.findLastIndex((candidate) => candidate.line === line);
    position = last < 0 ? fields.length : last + 1;
  }
  fields.splice(position, 0, { ...field, line: isWarningIcon(id) && line !== "hidden" ? "primary" : line });
  return { ...layout, fields };
}
function detailGroup(id) {
  const key = normalize(id);
  if (["cpu", "memory", "containers", "restarts"].includes(key)) return "resources";
  if (isOwner(id) || ["node", "namespace"].includes(key)) return "relations";
  if (key === "qos") return "quality";
  return "other";
}

// src/auto-width.ts
function fitNaturalWidths(fields, available) {
  available = Math.max(0, Number.isFinite(available) ? available : 0);
  const preferred = fields.map((field) => Math.max(0, field.preferred));
  const minimum = fields.map((field, index) => Math.max(0, Math.min(preferred[index], field.minimum)));
  const total = preferred.reduce((sum, width) => sum + width, 0);
  const floor = minimum.reduce((sum, width) => sum + width, 0);
  let widths = preferred;
  if (total > available) {
    widths = floor >= available ? minimum.map((width) => floor ? width * available / floor : 0) : preferred.map((width, index) => width - (width - minimum[index]) * (total - available) / (total - floor));
  }
  let offset = 0;
  return fields.map((field, index) => {
    const result = { id: field.id, offset, width: widths[index] };
    offset += widths[index];
    return result;
  });
}
var contexts = /* @__PURE__ */ new WeakMap();
function measureText(document2, text, font) {
  var _a, _b;
  let state = contexts.get(document2);
  if (!state) {
    const supported = typeof ((_a = document2.defaultView) == null ? void 0 : _a.CanvasRenderingContext2D) === "function";
    state = { context: supported ? document2.createElement("canvas").getContext("2d") : null, cache: /* @__PURE__ */ new Map() };
    contexts.set(document2, state);
  }
  const key = `${font}
${text}`;
  const cached = state.cache.get(key);
  if (cached !== void 0) return cached;
  let width;
  if (state.context) {
    state.context.font = font;
    width = state.context.measureText(text).width;
  } else width = text.length * (Number.parseFloat(((_b = font.match(/[\d.]+px/)) == null ? void 0 : _b[0]) ?? "13") * 0.55);
  if (state.cache.size > 2048) state.cache.clear();
  state.cache.set(key, width);
  return width;
}

// src/layout.ts
function placements(ids, layout = defaultLayout(ids, "all")) {
  const result = /* @__PURE__ */ new Map();
  const find = (...names) => ids.find((id) => names.includes(normalize(id)));
  const selection = find("selection", "select", "checkbox", "id0");
  const menu = find("menu", "actions", "contextmenu");
  if (selection) result.set(selection, { column: "1 / 2", line: "1 / 3" });
  if (menu) result.set(menu, { column: "122 / 123", line: "1 / 3" });
  const fields = resolveLayout(ids, layout).fields;
  function distribute(items, line, secondary = false) {
    const total = items.reduce((sum, item) => sum + item.width, 0);
    let used = 0;
    let start = 2;
    items.forEach((item, index) => {
      used += item.width;
      const end = index === items.length - 1 ? 122 : Math.max(
        start + 1,
        Math.min(122 - (items.length - index - 1), 2 + Math.round(120 * used / total))
      );
      result.set(item.id, { column: `${start} / ${end}`, line, ...secondary ? { secondary: true } : {} });
      start = end;
    });
  }
  distribute(fields.filter((field) => field.line === "primary" && !isWarningIcon(field.id)), "1 / 2");
  distribute(fields.filter((field) => field.line === "secondary" && !isWarningIcon(field.id)), "2 / 3", true);
  for (const field of fields.filter((field2) => field2.line === "hidden")) {
    result.set(field.id, { column: "2 / 122", line: "2 / 3", hidden: true });
  }
  const name = fields.find((field) => normalize(field.id) === "name");
  const warning = fields.find((field) => isWarningIcon(field.id) && field.line !== "hidden");
  const namePosition = name && result.get(name.id);
  if (warning && namePosition) result.set(warning.id, { ...namePosition, warning: true });
  return result;
}
var rowAttribute = "data-lwr-row";
var cellAttribute = "data-lwr-cell";
function layoutRow(row, header = false, layout, labels, context = {}) {
  var _a, _b;
  const cells = Array.from(row.children).filter((child) => child instanceof row.ownerDocument.defaultView.HTMLElement);
  const getId = (cell) => cell.getAttribute(header ? "data-column-id-test" : "data-column-id") ?? (header && cell.querySelector("[data-select-all-checkbox-test]") ? "id-0" : "");
  const ids = cells.map(getId);
  if (ids.some((id) => !id) || !ids.some((id) => normalize(id) === "name")) {
    clearLayout(row);
    return;
  }
  const positions = placements(ids, layout);
  const resolved = resolveLayout(ids, layout ?? defaultLayout(ids, "all"));
  const showLabels = Boolean(layout == null ? void 0 : layout.labels) || resolved.autoSecondary;
  const details = resolved.fields.filter((field) => field.line === "secondary" && !isWarningIcon(field.id));
  const groupStarts = new Set(details.filter((field, index) => index > 0 && detailGroup(field.id) !== detailGroup(details[index - 1].id)).map((field) => field.id));
  const warningCell = cells.find((cell) => isWarningIcon(getId(cell)));
  const warningVisible = warningCell && !((_a = positions.get(getId(warningCell))) == null ? void 0 : _a.hidden) && Boolean(warningCell.querySelector("button, svg, input") || ((_b = warningCell.textContent) == null ? void 0 : _b.trim()));
  row.setAttribute(rowAttribute, header ? "header" : "data");
  row.setAttribute("data-lwr-labels", showLabels ? "true" : "false");
  row.setAttribute("data-lwr-stripe", (context.index ?? 0) % 2 ? "odd" : "even");
  for (const cell of cells) {
    const placement = positions.get(getId(cell));
    if (!placement) continue;
    cell.setAttribute(cellAttribute, "");
    cell.style.setProperty("--lwr-column", placement.column);
    cell.style.setProperty("--lwr-line", placement.line);
    cell.toggleAttribute("data-lwr-hidden", placement.hidden === true);
    cell.toggleAttribute("data-lwr-secondary", placement.secondary === true);
    cell.toggleAttribute("data-lwr-name", normalize(getId(cell)) === "name");
    cell.toggleAttribute("data-lwr-status", ["status", "phase"].includes(normalize(getId(cell))));
    if (cell.hasAttribute("data-lwr-status")) {
      const value = cell.querySelector("span, a") ?? cell.firstElementChild;
      if (value) cell.style.setProperty("--lwr-status-color", row.ownerDocument.defaultView.getComputedStyle(value).color);
    }
    cell.toggleAttribute("data-lwr-group-start", groupStarts.has(getId(cell)));
    cell.toggleAttribute("data-lwr-warning", placement.warning === true);
    cell.toggleAttribute("data-lwr-empty-icon", placement.warning === true && !warningVisible);
    cell.toggleAttribute("data-lwr-has-warning", normalize(getId(cell)) === "name" && Boolean(warningVisible));
    cell.toggleAttribute("data-lwr-auto", !header && placement.secondary === true && resolved.autoSecondary);
    cell.setAttribute("data-lwr-label", isWarningIcon(getId(cell)) ? "" : (labels == null ? void 0 : labels.get(getId(cell))) ?? fieldLabel(getId(cell)));
    cell.style.removeProperty("--lwr-offset");
    cell.style.removeProperty("--lwr-natural-width");
  }
  if (!header && resolved.autoSecondary) {
    const available = Math.max(0, (context.availableWidth ?? row.clientWidth) - 80);
    const natural = details.map((field) => {
      var _a2;
      const cell = cells.find((candidate) => getId(candidate) === field.id);
      const value = ((_a2 = cell.textContent) == null ? void 0 : _a2.trim()) ?? "";
      const style = row.ownerDocument.defaultView.getComputedStyle(cell);
      const fontSize = Number.parseFloat(style.fontSize) || 13;
      const font = `${style.fontWeight || "400"} ${fontSize}px ${style.fontFamily || "system-ui"}`;
      const label = cell.getAttribute("data-lwr-label") ?? "";
      const labelWidth = showLabels ? measureText(row.ownerDocument, label, `400 ${fontSize * 0.85}px ${style.fontFamily || "system-ui"}`) + 6 : 0;
      const controls = value ? 0 : Math.max(16, cell.querySelectorAll("svg, input, button").length * 18);
      const padding = 12 + (groupStarts.has(field.id) ? 13 : 0) + (cell.hasAttribute("data-lwr-has-warning") ? 26 : 0);
      const preferred = Math.ceil(measureText(row.ownerDocument, value, font) + controls + labelWidth + padding + 2);
      return { id: field.id, preferred, minimum: Math.min(preferred, labelWidth + padding + 40) };
    });
    for (const fitted of fitNaturalWidths(natural, available)) {
      const cell = cells.find((candidate) => getId(candidate) === fitted.id);
      cell.style.setProperty("--lwr-offset", `${fitted.offset.toFixed(2)}px`);
      cell.style.setProperty("--lwr-natural-width", `${fitted.width.toFixed(2)}px`);
      if (cell.hasAttribute("data-lwr-name") && warningCell && warningVisible) {
        warningCell.setAttribute("data-lwr-auto", "");
        warningCell.style.setProperty("--lwr-offset", `${fitted.offset.toFixed(2)}px`);
        warningCell.style.setProperty("--lwr-natural-width", "24px");
      }
    }
  }
}
function clearLayout(root) {
  for (const row of [...root.matches(`[${rowAttribute}]`) ? [root] : [], ...root.querySelectorAll(`[${rowAttribute}]`)]) {
    row.removeAttribute(rowAttribute);
    row.removeAttribute("data-lwr-labels");
    row.removeAttribute("data-lwr-stripe");
  }
  for (const cell of root.querySelectorAll(`[${cellAttribute}]`)) {
    cell.removeAttribute(cellAttribute);
    for (const attribute of ["data-lwr-hidden", "data-lwr-secondary", "data-lwr-name", "data-lwr-label", "data-lwr-auto", "data-lwr-group-start", "data-lwr-status", "data-lwr-warning", "data-lwr-empty-icon", "data-lwr-has-warning"]) cell.removeAttribute(attribute);
    cell.style.removeProperty("--lwr-column");
    cell.style.removeProperty("--lwr-line");
    cell.style.removeProperty("--lwr-offset");
    cell.style.removeProperty("--lwr-natural-width");
    cell.style.removeProperty("--lwr-status-color");
  }
}
var layoutCss = `
[data-lwr-row] {
  display: grid !important;
  grid-template-columns: 40px repeat(120, minmax(0, 1fr)) 40px !important;
  grid-template-rows: repeat(2, minmax(0, 1fr)) !important;
  width: 100% !important;
  min-width: 0 !important;
  box-sizing: border-box;
}
[data-lwr-row="header"] { height: 56px !important; transform: none !important; }
[data-lwr-row="header"][data-lwr-labels="true"] { height: 30px !important; }
[data-lwr-row="header"][data-lwr-labels="true"] [data-lwr-cell] { grid-row: 1 / 3 !important; }
[data-lwr-row="header"][data-lwr-labels="true"] [data-lwr-secondary] { display: none !important; }
[data-lwr-row="header"] [data-lwr-group-start] { border: 0; }
[data-table-head-test]:has([data-lwr-row]) { padding-inline: 0 !important; }
[data-lwr-cell] {
  grid-column: var(--lwr-column) !important;
  grid-row: var(--lwr-line) !important;
  width: auto !important;
  min-width: 0 !important;
  max-width: none !important;
  overflow: hidden;
  white-space: nowrap !important;
  align-items: center;
  padding-inline: 6px !important;
  box-sizing: border-box;
}
[data-lwr-cell] > * { min-width: 0; max-width: 100%; }
[data-lwr-hidden] { display: none !important; }
[data-lwr-empty-icon] { display: none !important; }
[data-lwr-name] { font-weight: 600; }
[data-lwr-has-warning] { padding-inline-start: 32px !important; }
[data-lwr-warning] { width: 24px !important; justify-self: start; align-self: center; z-index: 3; padding: 0 !important; margin-inline-start: 6px; }
[data-lwr-warning]::before { content: none !important; }
[data-lwr-warning] > * { max-width: 24px; }
[data-lwr-row="data"] {
  border-bottom: 1px solid var(--borderColor, #cbd5e1);
  --lwr-row-tint: color-mix(in srgb, var(--textColorPrimary, #64748b) 3%, transparent);
  background-image: linear-gradient(to bottom, var(--lwr-row-tint) 50%, transparent 50%);
}
[data-lwr-row="data"][data-lwr-stripe="odd"]:not([data-selected="true"]):not(:hover):not(:focus-within) {
  --lwr-row-tint: color-mix(in srgb, var(--textColorPrimary, #64748b) 5.5%, transparent);
}
[data-lwr-row="data"] [data-lwr-secondary] { font-size: .92em; }
[data-lwr-row="data"] [data-lwr-group-start] { border-inline-start: 1px solid var(--borderColor, #cbd5e1); padding-inline-start: 18px !important; }
[data-lwr-row="data"] [data-lwr-has-warning] { padding-inline-start: 32px !important; }
[data-lwr-auto] {
  position: absolute !important; grid-column: 2 / 122 !important; grid-row: 2 / 3 !important;
  left: var(--lwr-offset); top: 0; bottom: 0;
  width: var(--lwr-natural-width) !important; justify-self: start;
}
[data-lwr-row="data"][data-lwr-labels="true"] [data-lwr-secondary]::before {
  content: attr(data-lwr-label);
  position: static; inset: auto; border: 0; background: none; flex-shrink: 0;
  font-size: 0.85em; font-weight: 400; color: var(--textColorSecondary, #788393);
  margin-right: 6px; width: auto; height: auto;
}
[data-lwr-cell] .TableCell { padding: 0 !important; }
[data-lwr-cell][data-lwr-status] > * {
  display: inline-flex; align-items: center; padding: 2px 8px !important; border-radius: 999px;
  background: color-mix(in srgb, var(--lwr-status-color, currentColor) 9%, transparent); font-weight: 500;
}
[data-lwr-cell] [data-column-resizer-test],
[data-lwr-cell] [class*="th-module__separator"] { display: none !important; }
[data-lwr-cell] [class*="selection-header-module__ToggleSelectAll"] {
  margin: 0 !important; padding: 0 !important; width: 100%;
}
.lwr-toggle {
  font: inherit; color: inherit; border: 1px solid var(--borderColor, #888);
  border-radius: 4px; padding: 0 6px; background: transparent; cursor: pointer;
}
`;

// src/status.injectable.tsx
var import_injectable3 = require("@k8slens/injectable");
var import_status_bar_contracts = require("@k8slens/status-bar-contracts");
var import_react3 = require("react");
var import_use_inject = require("@k8slens/use-inject");
var import_mobx = require("mobx");

// src/virtualizer.ts
function doubleRowHeights(virtualizer, afterRender = (callback) => callback()) {
  const originalSetOptions = virtualizer.setOptions;
  let baseOptions = virtualizer.options;
  let baseEstimate = baseOptions.estimateSize;
  let active = true;
  const scaledEstimate = (index) => baseEstimate(index) * 2;
  const setOptions = (options) => {
    if (options.estimateSize !== scaledEstimate) baseEstimate = options.estimateSize;
    baseOptions = { ...options, estimateSize: baseEstimate };
    originalSetOptions.call(virtualizer, { ...options, estimateSize: scaledEstimate });
  };
  const originalOffset = virtualizer.scrollOffset ?? 0;
  virtualizer.setOptions = setOptions;
  try {
    setOptions(baseOptions);
    virtualizer.measure();
    afterRender(() => {
      if (active) virtualizer.scrollToOffset(originalOffset * 2);
    });
  } catch (error) {
    virtualizer.setOptions = originalSetOptions;
    originalSetOptions.call(virtualizer, baseOptions);
    virtualizer.measure();
    throw error;
  }
  return () => {
    if (!active) return;
    active = false;
    const offset = (virtualizer.scrollOffset ?? 0) / 2;
    if (virtualizer.setOptions !== setOptions) return;
    virtualizer.setOptions = originalSetOptions;
    originalSetOptions.call(virtualizer, baseOptions);
    virtualizer.measure();
    afterRender(() => {
      if (virtualizer.setOptions === originalSetOptions) virtualizer.scrollToOffset(offset);
    });
  };
}
var workloads = /* @__PURE__ */ new Set([
  "pods",
  "deployments",
  "daemon-sets",
  "stateful-sets",
  "replica-sets",
  "replication-controllers",
  "jobs",
  "cron-jobs"
]);
function isVirtualizer(value, element) {
  var _a;
  if (!value || typeof value !== "object") return false;
  const v = value;
  return typeof v.setOptions === "function" && typeof v.measure === "function" && typeof v.getVirtualItems === "function" && typeof v.scrollToOffset === "function" && typeof ((_a = v.options) == null ? void 0 : _a.estimateSize) === "function" && v.options.getScrollElement() === element;
}
function findWorkloadVirtualizer(element) {
  var _a, _b;
  const key = Object.keys(element).find((name) => name.startsWith("__reactFiber$"));
  if (!key) return { workload: false };
  const node = element;
  let fiber = node[key];
  let root = fiber;
  for (let depth = 0; (root == null ? void 0 : root.return) && depth < 128; depth++) root = root.return;
  if (((_a = root == null ? void 0 : root.stateNode) == null ? void 0 : _a.current) && root.stateNode.current !== root && (fiber == null ? void 0 : fiber.alternate)) fiber = fiber.alternate;
  for (let depth = 0; fiber && depth < 64; depth++, fiber = fiber.return) {
    const tableId = (_b = fiber.memoizedProps) == null ? void 0 : _b.tableId;
    if (typeof tableId !== "string") continue;
    if (!workloads.has(tableId)) return { workload: false };
    for (const owner of [fiber, fiber.alternate]) {
      let hook = owner == null ? void 0 : owner.memoizedState;
      for (let count = 0; hook && count < 128; count++, hook = hook.next) {
        const state = hook.memoizedState;
        const candidates = [state];
        if (state && typeof state === "object" && "current" in state) candidates.push(state.current);
        for (const candidate of candidates) {
          if (isVirtualizer(candidate, element)) return { workload: true, virtualizer: candidate, tableId };
        }
      }
    }
    return { workload: true };
  }
  return { workload: false };
}

// src/controller.ts
function startLayout(document2, report, options = {}) {
  var _a, _b;
  const window = document2.defaultView;
  const attached = /* @__PURE__ */ new Map();
  let frame = 0;
  let stopped = false;
  let lastReport = "";
  let lastCatalog = "";
  const resizeObserver = typeof window.ResizeObserver === "function" ? new window.ResizeObserver(() => schedule()) : void 0;
  function scan() {
    var _a2, _b2;
    frame = 0;
    if (stopped) return;
    for (const [element, entry] of attached) {
      if (!element.isConnected) {
        resizeObserver == null ? void 0 : resizeObserver.unobserve(element);
        entry.restore();
        clearLayout(entry.root);
        attached.delete(element);
      }
    }
    let unsupported = 0;
    const catalogs = /* @__PURE__ */ new Map();
    for (const element of document2.querySelectorAll("[data-table-container-test]")) {
      let entry = attached.get(element);
      try {
        const found = findWorkloadVirtualizer(element);
        if (entry && (!found.workload || found.virtualizer !== entry.virtualizer)) {
          entry.restore();
          clearLayout(entry.root);
          attached.delete(element);
          resizeObserver == null ? void 0 : resizeObserver.unobserve(element);
          entry = void 0;
        }
        if (!entry) {
          if (!found.workload) continue;
          if (!found.virtualizer) {
            unsupported++;
            continue;
          }
          const root = element.parentElement;
          if (!(root == null ? void 0 : root.querySelector("[data-table-head-test]"))) {
            unsupported++;
            continue;
          }
          entry = {
            tableId: found.tableId,
            virtualizer: found.virtualizer,
            restore: doubleRowHeights(found.virtualizer, (callback) => {
              window.requestAnimationFrame(callback);
            }),
            root
          };
          attached.set(element, entry);
          resizeObserver == null ? void 0 : resizeObserver.observe(element);
        }
      } catch {
        unsupported++;
        continue;
      }
      const row = element.querySelector("[data-row]");
      const headerCells = Array.from(entry.root.querySelectorAll("[data-table-head-test] [data-column-id-test]"));
      const fields = headerCells.map((cell) => {
        var _a3, _b3, _c;
        const id = cell.getAttribute("data-column-id-test");
        const sample = (_b3 = (_a3 = Array.from((row == null ? void 0 : row.children) ?? []).find((child) => child.getAttribute("data-column-id") === id)) == null ? void 0 : _a3.textContent) == null ? void 0 : _b3.trim().slice(0, 256);
        return { id, label: ((_c = cell.textContent) == null ? void 0 : _c.trim()) || fieldLabel(id), sample };
      }).filter((field) => !isControl(field.id));
      catalogs.set(entry.tableId, { id: entry.tableId, fields });
      const layout = ((_a2 = options.getLayout) == null ? void 0 : _a2.call(options, entry.tableId, fields.map((field) => field.id))) ?? defaultLayout(fields.map((field) => field.id));
      const labels = new Map(fields.map((field) => [field.id, field.label]));
      const virtualRows = entry.virtualizer.getVirtualItems();
      Array.from(element.querySelectorAll("[data-row]")).forEach((row2, index) => {
        var _a3;
        return layoutRow(row2, false, layout, labels, { index: ((_a3 = virtualRows[index]) == null ? void 0 : _a3.index) ?? index, availableWidth: element.clientWidth });
      });
      for (const header of entry.root.querySelectorAll("[data-table-head-test] > div")) layoutRow(header, true, layout, labels);
    }
    const status = { active: attached.size, unsupported };
    const signature = JSON.stringify(status);
    if (signature !== lastReport) {
      lastReport = signature;
      report(status);
    }
    const tables = [...catalogs.values()];
    const catalogSignature = JSON.stringify(tables.map((table) => ({ ...table, fields: table.fields.map(({ id, label }) => ({ id, label })) })));
    if (catalogSignature !== lastCatalog) {
      lastCatalog = catalogSignature;
      (_b2 = options.onCatalog) == null ? void 0 : _b2.call(options, tables);
    }
  }
  function schedule() {
    if (!stopped && !frame) frame = window.requestAnimationFrame(scan);
  }
  const observer = new window.MutationObserver(schedule);
  observer.observe(document2.body, { subtree: true, childList: true, characterData: true });
  (_a = document2.fonts) == null ? void 0 : _a.ready.then(schedule).catch(() => {
  });
  const retry = window.setInterval(schedule, 1e3);
  const unsubscribe = (_b = options.subscribe) == null ? void 0 : _b.call(options, schedule);
  schedule();
  return () => {
    stopped = true;
    observer.disconnect();
    resizeObserver == null ? void 0 : resizeObserver.disconnect();
    unsubscribe == null ? void 0 : unsubscribe();
    window.clearInterval(retry);
    window.cancelAnimationFrame(frame);
    for (const { restore, root } of attached.values()) {
      restore();
      clearLayout(root);
    }
    attached.clear();
  };
}

// src/settings.injectable.ts
var import_injectable = require("@k8slens/injectable");
var import_persistable_contracts = require("@k8slens/persistable-contracts");
var layoutSettingsBunch = (0, import_persistable_contracts.getPersistableValueInjectableBunch)()({
  id: "layout-settings",
  defaultValue: { instantiate: () => async () => emptySettings }
});
var loadSettingsInjectable = (0, import_injectable.getInjectable2)({
  id: "lens-workload-rows.load-settings",
  instantiate: (di) => {
    const load = di.inject(layoutSettingsBunch.persistable);
    const loadSettings = () => load();
    return () => loadSettings;
  }
});

// src/editor-modal.injectable.tsx
var import_injectable2 = require("@k8slens/injectable");
var import_modal_contracts = require("@k8slens/modal-contracts");

// src/editor-dialog.tsx
var import_react2 = require("react");

// src/editor.tsx
var import_react = require("react");
var import_jsx_runtime = require("react/jsx-runtime");
var lineNames = { primary: "First line", secondary: "Second line", hidden: "Hidden" };
var examples = {
  name: "example-api-65df569ff6-abc12",
  namespace: "example-app",
  status: "Running",
  phase: "Running",
  owners: "ReplicaSet",
  controlledby: "ReplicaSet",
  age: "19h",
  cpu: "0.010",
  memory: "141.1 MiB",
  restarts: "6",
  node: "worker-node-01",
  qos: "Burstable",
  containers: "1/1"
};
var LayoutEditor = ({ tables, settings, onApply, onCancel }) => {
  var _a;
  const [tableId, setTableId] = (0, import_react.useState)(((_a = tables[0]) == null ? void 0 : _a.id) ?? "pods");
  const [drafts, setDrafts] = (0, import_react.useState)(settings.tables);
  const [dragged, setDragged] = (0, import_react.useState)(null);
  const table = tables.find((candidate) => candidate.id === tableId) ?? tables[0];
  if (!table) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "lwr-editor", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "Open a workload list first." }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: onCancel, children: "Close" })
  ] });
  const ids = table.fields.map((field) => field.id);
  const layout = resolveLayout(ids, drafts[table.id]);
  const info = new Map(table.fields.map((field) => [field.id, field]));
  const preserveUnavailable = (next, previous) => {
    const visible = new Set(ids);
    const remaining = [...next.fields];
    const fields = ((previous == null ? void 0 : previous.fields) ?? []).flatMap((field) => {
      if (!visible.has(field.id)) return [field];
      const replacement = remaining.shift();
      return replacement ? [replacement] : [];
    });
    return { ...next, fields: [...fields, ...remaining] };
  };
  const update = (next) => setDrafts((previous) => ({ ...previous, [table.id]: preserveUnavailable(next, previous[table.id]) }));
  const move = (id, line, before) => update(moveField(layout, id, line, before));
  function drop(event, line, before) {
    event.preventDefault();
    event.stopPropagation();
    const id = event.dataTransfer.getData("text/plain") || dragged;
    if (id && ids.includes(id)) move(id, line, before);
    setDragged(null);
  }
  function nudge(field, direction) {
    var _a2;
    const peers = layout.fields.filter((candidate) => candidate.line === field.line);
    const index = peers.findIndex((candidate) => candidate.id === field.id);
    if (direction === -1 && index > 0) move(field.id, field.line, peers[index - 1].id);
    if (direction === 1 && index < peers.length - 1) move(field.id, field.line, (_a2 = peers[index + 2]) == null ? void 0 : _a2.id);
  }
  function fieldCard(field) {
    var _a2;
    const label = ((_a2 = info.get(field.id)) == null ? void 0 : _a2.label) ?? field.id;
    const peers = layout.fields.filter((candidate) => candidate.line === field.line);
    const index = peers.findIndex((candidate) => candidate.id === field.id);
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "div",
      {
        className: `lwr-field ${dragged === field.id ? "lwr-dragging" : ""}`,
        draggable: true,
        onDragStart: (event) => {
          event.dataTransfer.setData("text/plain", field.id);
          event.dataTransfer.effectAllowed = "move";
          setDragged(field.id);
        },
        onDragEnd: () => setDragged(null),
        onDragOver: (event) => event.preventDefault(),
        onDrop: (event) => drop(event, field.line, field.id),
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "lwr-field-title", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "lwr-grip", "aria-hidden": "true", children: "\u22EE\u22EE" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: label })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "lwr-field-actions", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", "aria-label": `Move ${label} left`, disabled: index === 0, onClick: () => nudge(field, -1), children: "\u2190" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", "aria-label": `Move ${label} right`, disabled: index === peers.length - 1, onClick: () => nudge(field, 1), children: "\u2192" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { "aria-label": `Line for ${label}`, value: field.line, onChange: (event) => move(field.id, event.target.value), children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "primary", children: isWarningIcon(field.id) ? "Beside name" : "First line" }),
              !isWarningIcon(field.id) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "secondary", children: "Second line" }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "hidden", disabled: normalize(field.id) === "name", children: "Hidden" })
            ] })
          ] }),
          field.line !== "hidden" && !isWarningIcon(field.id) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "lwr-width", children: [
            layout.autoSecondary && field.line === "secondary" ? "Automatic width" : "Width",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
              "input",
              {
                type: "range",
                min: "1",
                max: "48",
                value: field.width,
                disabled: layout.autoSecondary && field.line === "secondary",
                "aria-label": `Width for ${label}`,
                onChange: (event) => update({ ...layout, fields: layout.fields.map((candidate) => candidate.id === field.id ? { ...candidate, width: Number(event.target.value) } : candidate) })
              }
            ),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("output", { children: field.width })
          ] })
        ]
      },
      field.id
    );
  }
  function previewLine(line) {
    const fields = layout.fields.filter((field) => field.line === line && !isWarningIcon(field.id));
    const auto = line === "secondary" && layout.autoSecondary;
    return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `lwr-preview-line lwr-preview-${line} ${auto ? "lwr-preview-auto" : ""}`, style: { gridTemplateColumns: auto ? void 0 : fields.map((field) => `minmax(0, ${field.width}fr)`).join(" ") }, children: [
      fields.map((field, index) => {
        const column = info.get(field.id);
        const sample = (column == null ? void 0 : column.sample) || examples[normalize(field.id)] || "\u2014";
        const statusClass = ["status", "phase"].includes(normalize(field.id)) ? /failed|error|crash|backoff/i.test(sample) ? "lwr-preview-error" : /running|ready|healthy|succeeded/i.test(sample) ? "lwr-preview-status" : "" : "";
        const groupStart = line === "secondary" && index > 0 && detailGroup(field.id) !== detailGroup(fields[index - 1].id);
        return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: `lwr-preview-value ${groupStart ? "lwr-preview-group" : ""}`, title: `${column == null ? void 0 : column.label}: ${sample}`, children: [
          (line === "primary" || layout.labels || auto) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "lwr-preview-label", children: column == null ? void 0 : column.label }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `${normalize(field.id) === "name" ? "lwr-preview-name" : ""} ${statusClass}`, children: sample })
        ] }, field.id);
      }),
      !fields.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "lwr-empty-line", children: "No fields on this line" })
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "lwr-editor", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "lwr-editor-toolbar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        "View ",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", { "aria-label": "Workload view", value: table.id, onChange: (event) => {
          setTableId(event.target.value);
          setDragged(null);
        }, children: tables.map((candidate) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: candidate.id, children: candidate.id.replace(/-/g, " ") }, candidate.id)) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "lwr-presets", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Start from" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => update(defaultLayout(ids, "balanced")), children: "Balanced" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => update(defaultLayout(ids, "troubleshooting")), children: "Troubleshooting" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: () => update(defaultLayout(ids, "all")), children: "All fields" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "lwr-preview", "aria-label": "Layout preview", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "lwr-section-label", children: "Live preview" }),
      previewLine("primary"),
      previewLine("secondary")
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "lwr-help", children: "Drag fields between lines or change their dropdown. Arrows change order. Width shares space within each line." }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "lwr-lanes", children: ["primary", "secondary"].map((line) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "section",
      {
        className: `lwr-lane ${dragged ? "lwr-drop-ready" : ""}`,
        "aria-label": lineNames[line],
        onDragOver: (event) => event.preventDefault(),
        onDrop: (event) => drop(event, line),
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { children: [
            lineNames[line],
            " ",
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: layout.fields.filter((field) => field.line === line).length })
          ] }),
          layout.fields.filter((field) => field.line === line).map(fieldCard),
          !layout.fields.some((field) => field.line === line) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "lwr-empty-line", children: "Drop a field here" })
        ]
      },
      line
    )) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "lwr-hidden", "aria-label": "Hidden fields", onDragOver: (event) => event.preventDefault(), onDrop: (event) => drop(event, "hidden"), children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", { children: [
        "Hidden ",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: layout.fields.filter((field) => field.line === "hidden").length })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "lwr-hidden-list", children: layout.fields.filter((field) => field.line === "hidden").map(fieldCard) }),
      !layout.fields.some((field) => field.line === "hidden") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "lwr-empty-line", children: "Drop fields here to hide them" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "lwr-editor-options", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", "aria-label": "Auto width for second line", checked: layout.autoSecondary, onChange: (event) => update({ ...layout, autoSecondary: event.target.checked }) }),
        " Auto width for second line"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: layout.labels || layout.autoSecondary, disabled: layout.autoSecondary, onChange: (event) => update({ ...layout, labels: event.target.checked }) }),
        " Label detail values"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Layouts save per workload type. Fields hidden in Lens\u2019s column menu stay hidden." })
    ] }),
    layout.autoSecondary && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "lwr-help", children: "Detail fields fit their text in each row. Long values shrink when space is limited. Manual widths are kept for when you switch this off." }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "lwr-editor-footer", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: onCancel, children: "Cancel" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "lwr-apply", type: "button", onClick: () => onApply({ ...settings, tables: { ...drafts, [table.id]: preserveUnavailable(layout, drafts[table.id]) } }), children: "Apply layout" })
    ] })
  ] });
};

// src/editor-dialog.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var LayoutEditorDialog = (props) => {
  const titleId = (0, import_react2.useId)();
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { className: "lwr-modal", role: "dialog", "aria-modal": "true", "aria-labelledby": titleId, children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("header", { className: "lwr-modal-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("h2", { id: titleId, children: "Workload layout" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", "aria-label": "Close layout editor", onClick: props.onCancel, children: "\xD7" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "lwr-modal-content", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LayoutEditor, { ...props }) })
  ] });
};

// src/editor-modal.injectable.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
var layoutEditorKind = (0, import_modal_contracts.getModalKind)()("layout-editor");
var EditorModal = ({ input: [tables, settings] }) => {
  const respond = (0, import_modal_contracts.useRespondFromModal)(layoutEditorKind);
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(LayoutEditorDialog, { tables, settings, onApply: (value) => respond(value), onCancel: () => respond(null) });
};
var layoutEditorModalBunch = (0, import_modal_contracts.getModalInjectableBunch)({ kind: layoutEditorKind, Component: EditorModal, onClose: () => null });
var openEditorInjectable = (0, import_injectable2.getInjectable2)({
  id: "lens-workload-rows.open-editor",
  consumptions: [import_modal_contracts.openModalInjectionToken],
  instantiate: (di) => {
    const open = di.inject(import_modal_contracts.openModalInjectionToken.for(layoutEditorKind).for(di.scopeIds))();
    return () => open;
  }
});

// src/status.injectable.tsx
var import_jsx_runtime4 = require("react/jsx-runtime");
var Toggle = () => {
  const loadSettings = (0, import_use_inject.useSyncInject)(loadSettingsInjectable);
  const openEditor = (0, import_use_inject.useSyncInject)(openEditorInjectable);
  const [settings, setSettings] = (0, import_react3.useState)(emptySettings);
  const [box, setBox] = (0, import_react3.useState)(null);
  const [error, setError] = (0, import_react3.useState)("");
  const [editing, setEditing] = (0, import_react3.useState)(false);
  const [tables, setTables] = (0, import_react3.useState)([]);
  const settingsRef = (0, import_react3.useRef)(settings);
  const refresh = (0, import_react3.useRef)(() => {
  });
  const [status, setStatus] = (0, import_react3.useState)({ active: 0, unsupported: 0 });
  (0, import_react3.useEffect)(() => {
    let cancelled = false;
    let dispose;
    loadSettings().then((value) => {
      if (cancelled) return;
      setBox(value);
      setSettings(sanitizeSettings(value.get()));
      dispose = (0, import_mobx.reaction)(() => value.get(), (next) => setSettings(sanitizeSettings(next)));
    }).catch(() => {
      if (!cancelled) setError("Could not load layout settings. Reload the extension to retry.");
    });
    return () => {
      cancelled = true;
      dispose == null ? void 0 : dispose();
    };
  }, [loadSettings]);
  (0, import_react3.useEffect)(() => {
    settingsRef.current = settings;
    refresh.current();
  }, [settings]);
  (0, import_react3.useEffect)(() => {
    if (!box || !settings.enabled) return;
    return startLayout(document, setStatus, {
      getLayout: (tableId, ids) => resolveLayout(ids, settingsRef.current.tables[tableId]),
      onCatalog: setTables,
      subscribe: (callback) => {
        refresh.current = callback;
        return () => {
          refresh.current = () => {
          };
        };
      }
    });
  }, [box, settings.enabled]);
  function save(value) {
    if (!box) return;
    (0, import_mobx.runInAction)(() => box.set(sanitizeSettings(value)));
  }
  async function edit() {
    if (editing) return;
    setEditing(true);
    try {
      const result = await openEditor(tables, settings);
      if (result) save(result);
    } catch {
      setError("Could not open the layout editor. Reload the extension to retry.");
    } finally {
      setEditing(false);
    }
  }
  const label = error ? "Rows: error" : !box ? "Rows: loading" : !settings.enabled ? "Rows: normal" : status.unsupported ? "Rows: unsupported" : "Rows: 2 lines";
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("span", { style: { display: "inline-flex", gap: "5px" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      "button",
      {
        className: "lwr-toggle",
        type: "button",
        disabled: !box,
        "aria-pressed": settings.enabled,
        title: error || (settings.enabled ? `Two-line layout on ${status.active} workload table(s). Click to restore normal rows.` : "Click to enable the two-line workload layout."),
        onClick: () => save({ ...settings, enabled: !settings.enabled }),
        children: label
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      "button",
      {
        className: "lwr-toggle",
        type: "button",
        disabled: !box || !tables.length || editing || !settings.enabled,
        title: "Configure field placement, order, widths and visibility",
        onClick: edit,
        children: "Layout\u2026"
      }
    )
  ] });
};
var workloadRowsToggle = (0, import_injectable3.getInjectable2)({
  id: "lens-workload-rows.toggle",
  instantiate: () => () => ({ Component: Toggle, position: "right", orderNumber: 90 }),
  injectionToken: import_status_bar_contracts.statusBarItemInjectionToken
});

// src/editor-styles.ts
var editorCss = `
.lwr-modal { width: min(1020px, calc(100vw - 48px)); max-height: calc(100vh - 48px); display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box; background: var(--contentColor, #fff); color: var(--textColorPrimary, #263548); border: 1px solid var(--borderColor, #cad4df); border-radius: 10px; }
.lwr-modal-header { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--borderColor, #cad4df); flex-shrink: 0; }
.lwr-modal-header h2 { flex: 1; margin: 0; font: 600 14px/1.4 system-ui, sans-serif; text-align: center; }
.lwr-modal-header button { border: 0; padding: 0 4px; background: transparent; color: inherit; font: 24px/1 system-ui, sans-serif; cursor: pointer; }
.lwr-modal-header button:focus-visible { outline: 2px solid var(--primary, #2874d0); outline-offset: 2px; }
.lwr-modal-content { min-height: 0; padding: 24px; overflow: auto; }
.lwr-editor { color: var(--textColorPrimary, #263548); font: 13px/1.45 system-ui, sans-serif; }
.lwr-editor *, .lwr-editor *::before, .lwr-editor *::after { box-sizing: border-box; }
.lwr-editor button, .lwr-editor select { font: inherit; color: inherit; background: var(--contentColor, #fff); border: 1px solid var(--borderColor, #cad4df); border-radius: 6px; padding: 5px 9px; cursor: pointer; }
.lwr-editor button:hover { background: var(--tableBgcSelected, #eaf1fa); }
.lwr-editor button:disabled { opacity: .35; cursor: default; }
.lwr-editor button:focus-visible, .lwr-editor select:focus-visible, .lwr-editor input:focus-visible { outline: 2px solid var(--primary, #2874d0); outline-offset: 2px; }
.lwr-editor-toolbar { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 16px; }
.lwr-editor-toolbar label { display: flex; align-items: center; gap: 8px; font-weight: 600; }
.lwr-presets { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.lwr-presets > span, .lwr-help, .lwr-empty-line { color: var(--textColorSecondary, #758399); }
.lwr-preview { border: 1px solid var(--borderColor, #cad4df); border-radius: 10px; overflow: hidden; background: var(--contentColor, #fff); }
.lwr-section-label { text-transform: uppercase; letter-spacing: .08em; font-size: 10px; font-weight: 700; color: var(--textColorSecondary, #758399); padding: 10px 14px 0; }
.lwr-preview-line { display: grid; gap: 14px; padding: 10px 14px; min-height: 45px; }
.lwr-preview-primary { background: color-mix(in srgb, var(--textColorPrimary, #64748b) 3%, var(--contentColor, #fff)); }
.lwr-preview-secondary { border-top: 1px solid var(--borderColor, #e4eaf1); background: var(--contentColor, #fff); }
.lwr-preview-secondary .lwr-preview-value { flex-direction: row; align-items: center; gap: 6px; }
.lwr-preview-secondary .lwr-preview-label { flex-shrink: 0; margin-bottom: 0; }
.lwr-preview-secondary .lwr-preview-group { border-inline-start: 1px solid var(--borderColor, #cbd5e1); padding-inline-start: 14px; }
.lwr-preview-auto { display: flex; gap: 12px; overflow: hidden; }
.lwr-preview-auto .lwr-preview-value { flex: 0 1 auto; }
.lwr-preview-auto .lwr-preview-value:has(.lwr-preview-name) { min-width: 80px; }
.lwr-preview-secondary .lwr-preview-status, .lwr-preview-primary .lwr-preview-status,
.lwr-preview-secondary .lwr-preview-error, .lwr-preview-primary .lwr-preview-error { align-self: flex-start; border-radius: 999px; padding: 1px 7px; background: color-mix(in srgb, currentColor 9%, transparent); }
.lwr-preview-value { min-width: 0; overflow: hidden; display: flex; flex-direction: column; }
.lwr-preview-value > span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lwr-preview-label { color: var(--textColorSecondary, #758399); font-size: 10px; margin-bottom: 3px; }
.lwr-preview-name { font-weight: 650; }
.lwr-preview-status { color: var(--colorOk, #25824f); }
.lwr-preview-error { color: var(--colorError, #cf3f4b); }
.lwr-help { margin: 12px 0; font-size: 12px; }
.lwr-lanes { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; max-height: 37vh; min-height: 120px; overflow-y: auto; padding: 2px; }
.lwr-lane, .lwr-hidden { border: 1px solid var(--borderColor, #dce3ec); border-radius: 9px; padding: 10px; min-width: 0; }
.lwr-lane h3, .lwr-hidden h3 { font: 600 12px/1.4 system-ui; margin: 0 0 8px; display: flex; gap: 7px; align-items: center; }
.lwr-lane h3 > span, .lwr-hidden h3 > span { color: var(--textColorSecondary, #758399); font-weight: 400; }
.lwr-drop-ready { border-style: dashed; }
.lwr-field { border: 1px solid var(--borderColor, #dce3ec); border-radius: 7px; padding: 8px 10px; margin-top: 7px; background: var(--contentColor, #fff); display: grid; grid-template-columns: minmax(80px, 1fr) auto; gap: 6px 8px; }
.lwr-field-title { display: flex; gap: 6px; align-items: center; min-width: 0; }
.lwr-field-title strong { font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.lwr-grip { color: var(--textColorSecondary, #758399); cursor: grab; }
.lwr-field-actions { display: flex; gap: 3px; align-items: center; }
.lwr-field-actions button { padding: 2px 5px; }
.lwr-field-actions select { max-width: 104px; padding: 3px; font-size: 11px; }
.lwr-width { grid-column: 1 / -1; display: flex; gap: 8px; align-items: center; font-size: 10px; color: var(--textColorSecondary, #758399); }
.lwr-width input { flex: 1; min-width: 0; accent-color: var(--primary, #2874d0); height: 13px; }
.lwr-width input:disabled { opacity: .35; }
.lwr-width output { min-width: 18px; text-align: right; }
.lwr-dragging { opacity: .4; }
.lwr-hidden { margin-top: 12px; }
.lwr-hidden-list { display: flex; flex-wrap: wrap; gap: 6px; }
.lwr-hidden-list .lwr-field { margin: 0; }
.lwr-empty-line { font-size: 11px; margin: 6px 0; }
.lwr-editor-options { display: flex; flex-wrap: wrap; gap: 8px 20px; align-items: center; margin: 12px 0; font-size: 11px; }
.lwr-editor-options label { display: flex; gap: 6px; align-items: center; }
.lwr-editor-options > span { color: var(--textColorSecondary, #758399); }
.lwr-editor-footer { display: flex; justify-content: flex-end; gap: 8px; border-top: 1px solid var(--borderColor, #dce3ec); padding-top: 12px; }
.lwr-editor button.lwr-apply { background: var(--primary, #2874d0); color: white; border-color: transparent; }
@media (max-width: 650px) { .lwr-lanes { grid-template-columns: 1fr; } .lwr-field { grid-template-columns: 1fr; } .lwr-field-actions { justify-content: flex-end; } }
`;

// src/index.ts
var stylesheet = (0, import_stylesheet_contracts.asStylesheet)({ id: "lens-workload-rows/layout", css: layoutCss + editorCss });
var workloadRowsFeature = (0, import_feature_core.getFeature)({
  id: "lens-workload-rows",
  register: (di) => di.register(stylesheet, workloadRowsToggle, layoutSettingsBunch, loadSettingsInjectable, layoutEditorModalBunch, openEditorInjectable)
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  workloadRowsFeature
});
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL2luZGV4LnRzIiwgIi4uL3NyYy9jb25maWcudHMiLCAiLi4vc3JjL2F1dG8td2lkdGgudHMiLCAiLi4vc3JjL2xheW91dC50cyIsICIuLi9zcmMvc3RhdHVzLmluamVjdGFibGUudHN4IiwgIi4uL3NyYy92aXJ0dWFsaXplci50cyIsICIuLi9zcmMvY29udHJvbGxlci50cyIsICIuLi9zcmMvc2V0dGluZ3MuaW5qZWN0YWJsZS50cyIsICIuLi9zcmMvZWRpdG9yLW1vZGFsLmluamVjdGFibGUudHN4IiwgIi4uL3NyYy9lZGl0b3ItZGlhbG9nLnRzeCIsICIuLi9zcmMvZWRpdG9yLnRzeCIsICIuLi9zcmMvZWRpdG9yLXN0eWxlcy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiaW1wb3J0IHsgZ2V0RmVhdHVyZSB9IGZyb20gXCJAazhzbGVucy9mZWF0dXJlLWNvcmVcIjtcbmltcG9ydCB7IGFzU3R5bGVzaGVldCB9IGZyb20gXCJAazhzbGVucy9zdHlsZXNoZWV0LWNvbnRyYWN0c1wiO1xuaW1wb3J0IHsgbGF5b3V0Q3NzIH0gZnJvbSBcIi4vbGF5b3V0LnRzXCI7XG5pbXBvcnQgeyB3b3JrbG9hZFJvd3NUb2dnbGUgfSBmcm9tIFwiLi9zdGF0dXMuaW5qZWN0YWJsZVwiO1xuaW1wb3J0IHsgZWRpdG9yQ3NzIH0gZnJvbSBcIi4vZWRpdG9yLXN0eWxlcy50c1wiO1xuaW1wb3J0IHsgbGF5b3V0U2V0dGluZ3NCdW5jaCwgbG9hZFNldHRpbmdzSW5qZWN0YWJsZSB9IGZyb20gXCIuL3NldHRpbmdzLmluamVjdGFibGVcIjtcbmltcG9ydCB7IGxheW91dEVkaXRvck1vZGFsQnVuY2gsIG9wZW5FZGl0b3JJbmplY3RhYmxlIH0gZnJvbSBcIi4vZWRpdG9yLW1vZGFsLmluamVjdGFibGVcIjtcblxuY29uc3Qgc3R5bGVzaGVldCA9IGFzU3R5bGVzaGVldCh7IGlkOiBcImxlbnMtd29ya2xvYWQtcm93cy9sYXlvdXRcIiwgY3NzOiBsYXlvdXRDc3MgKyBlZGl0b3JDc3MgfSk7XG5cbmV4cG9ydCBjb25zdCB3b3JrbG9hZFJvd3NGZWF0dXJlID0gZ2V0RmVhdHVyZSh7XG4gIGlkOiBcImxlbnMtd29ya2xvYWQtcm93c1wiLFxuICByZWdpc3RlcjogKGRpKSA9PiBkaS5yZWdpc3RlcihzdHlsZXNoZWV0LCB3b3JrbG9hZFJvd3NUb2dnbGUsIGxheW91dFNldHRpbmdzQnVuY2gsIGxvYWRTZXR0aW5nc0luamVjdGFibGUsIGxheW91dEVkaXRvck1vZGFsQnVuY2gsIG9wZW5FZGl0b3JJbmplY3RhYmxlKSxcbn0pO1xuIiwgImV4cG9ydCB0eXBlIEZpZWxkTGluZSA9IFwicHJpbWFyeVwiIHwgXCJzZWNvbmRhcnlcIiB8IFwiaGlkZGVuXCI7XG5leHBvcnQgdHlwZSBGaWVsZENvbmZpZyA9IHsgaWQ6IHN0cmluZzsgbGluZTogRmllbGRMaW5lOyB3aWR0aDogbnVtYmVyIH07XG5leHBvcnQgdHlwZSBUYWJsZUxheW91dCA9IHsgZmllbGRzOiBGaWVsZENvbmZpZ1tdOyBsYWJlbHM6IGJvb2xlYW47IGF1dG9TZWNvbmRhcnk6IGJvb2xlYW4gfTtcbmV4cG9ydCB0eXBlIExheW91dFNldHRpbmdzID0geyB2ZXJzaW9uOiAxOyBlbmFibGVkOiBib29sZWFuOyB0YWJsZXM6IFJlY29yZDxzdHJpbmcsIFRhYmxlTGF5b3V0PiB9O1xuZXhwb3J0IHR5cGUgRmllbGRJbmZvID0geyBpZDogc3RyaW5nOyBsYWJlbDogc3RyaW5nOyBzYW1wbGU/OiBzdHJpbmcgfTtcbmV4cG9ydCB0eXBlIFRhYmxlQ2F0YWxvZyA9IHsgaWQ6IHN0cmluZzsgZmllbGRzOiBGaWVsZEluZm9bXSB9O1xuZXhwb3J0IHR5cGUgUHJlc2V0ID0gXCJiYWxhbmNlZFwiIHwgXCJhbGxcIiB8IFwidHJvdWJsZXNob290aW5nXCI7XG5cbmV4cG9ydCBjb25zdCBlbXB0eVNldHRpbmdzOiBMYXlvdXRTZXR0aW5ncyA9IHsgdmVyc2lvbjogMSwgZW5hYmxlZDogdHJ1ZSwgdGFibGVzOiB7fSB9O1xuZXhwb3J0IGNvbnN0IG5vcm1hbGl6ZSA9IChpZDogc3RyaW5nKSA9PiBpZC5yZXBsYWNlKC9bXmEtejAtOV0vZ2ksIFwiXCIpLnRvTG93ZXJDYXNlKCk7XG5leHBvcnQgY29uc3QgaXNXYXJuaW5nSWNvbiA9IChpZDogc3RyaW5nKSA9PiBub3JtYWxpemUoaWQpID09PSBcInN0YXR1c2ljb25cIjtcbmV4cG9ydCBjb25zdCBpc0NvbnRyb2wgPSAoaWQ6IHN0cmluZykgPT4gW1wic2VsZWN0aW9uXCIsIFwic2VsZWN0XCIsIFwiY2hlY2tib3hcIiwgXCJpZDBcIiwgXCJtZW51XCIsIFwiYWN0aW9uc1wiLCBcImNvbnRleHRtZW51XCJdLmluY2x1ZGVzKG5vcm1hbGl6ZShpZCkpO1xuY29uc3QgaXNOYW1lID0gKGlkOiBzdHJpbmcpID0+IG5vcm1hbGl6ZShpZCkgPT09IFwibmFtZVwiO1xuY29uc3QgaXNPd25lciA9IChpZDogc3RyaW5nKSA9PiBbXCJjb250cm9sbGVkYnlcIiwgXCJvd25lclwiLCBcIm93bmVyc1wiLCBcIm93bmVycmVmZXJlbmNlc1wiXS5pbmNsdWRlcyhub3JtYWxpemUoaWQpKTtcbmNvbnN0IGlzU3RhdHVzID0gKGlkOiBzdHJpbmcpID0+IFtcInN0YXR1c1wiLCBcInBoYXNlXCJdLmluY2x1ZGVzKG5vcm1hbGl6ZShpZCkpO1xuXG5leHBvcnQgZnVuY3Rpb24gZmllbGRMYWJlbChpZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3QgbGFiZWxzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICAgIG5hbWU6IFwiTmFtZVwiLCBuYW1lc3BhY2U6IFwiTmFtZXNwYWNlXCIsIGNwdTogXCJDUFVcIiwgbWVtb3J5OiBcIk1lbW9yeVwiLCBjb250YWluZXJzOiBcIkNvbnRhaW5lcnNcIixcbiAgICByZXN0YXJ0czogXCJSZXN0YXJ0c1wiLCBub2RlOiBcIk5vZGVcIiwgcW9zOiBcIlFvU1wiLCBhZ2U6IFwiQWdlXCIsIHN0YXR1czogXCJTdGF0dXNcIiwgcGhhc2U6IFwiU3RhdHVzXCIsXG4gICAgb3duZXJzOiBcIkNvbnRyb2xsZWQgQnlcIiwgb3duZXI6IFwiQ29udHJvbGxlZCBCeVwiLCBjb250cm9sbGVkYnk6IFwiQ29udHJvbGxlZCBCeVwiLCB3YXJuaW5nOiBcIldhcm5pbmdzXCIsIHdhcm5pbmdzOiBcIldhcm5pbmdzXCIsXG4gICAgc3RhdHVzaWNvbjogXCJXYXJuaW5nc1wiLFxuICB9O1xuICByZXR1cm4gbGFiZWxzW25vcm1hbGl6ZShpZCldID8/IGlkLnJlcGxhY2UoLyhbYS16XSkoW0EtWl0pL2csIFwiJDEgJDJcIikucmVwbGFjZSgvWy1fXS9nLCBcIiBcIik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZWZhdWx0TGF5b3V0KGlkczogc3RyaW5nW10sIHByZXNldDogUHJlc2V0ID0gXCJiYWxhbmNlZFwiKTogVGFibGVMYXlvdXQge1xuICBjb25zdCBmaWVsZHM6IEZpZWxkQ29uZmlnW10gPSBpZHMuZmlsdGVyKChpZCkgPT4gIWlzQ29udHJvbChpZCkpLm1hcCgoaWQpID0+IHtcbiAgICBjb25zdCBrZXkgPSBub3JtYWxpemUoaWQpO1xuICAgIGxldCBsaW5lOiBGaWVsZExpbmUgPSBcInNlY29uZGFyeVwiO1xuICAgIGxldCB3aWR0aCA9IC9uYW1lc3BhY2V8bm9kZS9pLnRlc3QoaWQpID8gMTAgOiA1O1xuICAgIGlmIChpc05hbWUoaWQpKSB7IGxpbmUgPSBcInByaW1hcnlcIjsgd2lkdGggPSAzNjsgfVxuICAgIGlmIChpc1N0YXR1cyhpZCkpIHsgbGluZSA9IFwicHJpbWFyeVwiOyB3aWR0aCA9IDc7IH1cbiAgICBpZiAoa2V5ID09PSBcImFnZVwiKSB7IGxpbmUgPSBcInByaW1hcnlcIjsgd2lkdGggPSA1OyB9XG4gICAgaWYgKGlzV2FybmluZ0ljb24oaWQpKSB7IGxpbmUgPSBcInByaW1hcnlcIjsgd2lkdGggPSAxOyB9XG4gICAgaWYgKHByZXNldCAhPT0gXCJhbGxcIiAmJiBbXCJxb3NcIiwgXCJjb250YWluZXJzXCJdLmluY2x1ZGVzKGtleSkpIGxpbmUgPSBcImhpZGRlblwiO1xuICAgIGlmIChwcmVzZXQgPT09IFwiYWxsXCIpIHtcbiAgICAgIGlmIChrZXkgPT09IFwiYWdlXCIpIGxpbmUgPSBcInNlY29uZGFyeVwiO1xuICAgICAgaWYgKGlzT3duZXIoaWQpKSB7IGxpbmUgPSBcInByaW1hcnlcIjsgd2lkdGggPSAxMDsgfVxuICAgIH1cbiAgICBpZiAocHJlc2V0ID09PSBcInRyb3VibGVzaG9vdGluZ1wiKSB7XG4gICAgICBpZiAoa2V5ID09PSBcInJlc3RhcnRzXCIgfHwgL3dhcm5pbmcvLnRlc3Qoa2V5KSkgeyBsaW5lID0gXCJwcmltYXJ5XCI7IHdpZHRoID0gNTsgfVxuICAgICAgaWYgKGtleSA9PT0gXCJjb250YWluZXJzXCIpIGxpbmUgPSBcInNlY29uZGFyeVwiO1xuICAgIH1cbiAgICByZXR1cm4geyBpZCwgbGluZSwgd2lkdGggfTtcbiAgfSk7XG4gIC8vIFByZXNlcnZlIGNvbHVtbiBvcmRlciB3aXRoaW4gZWFjaCBsaW5lLCB3aXRoIE5hbWUgYWx3YXlzIGxlYWRpbmcgdGhlIGRlZmF1bHQgbGF5b3V0LlxuICBmaWVsZHMuc29ydCgoYSwgYikgPT4gTnVtYmVyKGlzTmFtZShiLmlkKSkgLSBOdW1iZXIoaXNOYW1lKGEuaWQpKSk7XG4gIHJldHVybiB7IGZpZWxkcywgbGFiZWxzOiB0cnVlLCBhdXRvU2Vjb25kYXJ5OiBmYWxzZSB9O1xufVxuXG4vKiogVmFsaWRhdGUgcGVyc2lzdGVkIG9yIGltcG9ydGVkIHZhbHVlcyBhbmQgbWVyZ2UgY29sdW1ucyBhZGRlZCBhZnRlciBhIGxheW91dCB3YXMgc2F2ZWQuICovXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZUxheW91dChpZHM6IHN0cmluZ1tdLCB2YWx1ZT86IHVua25vd24pOiBUYWJsZUxheW91dCB7XG4gIGNvbnN0IGRlZmF1bHRzID0gZGVmYXVsdExheW91dChpZHMpO1xuICBpZiAoIXZhbHVlIHx8IHR5cGVvZiB2YWx1ZSAhPT0gXCJvYmplY3RcIikgcmV0dXJuIGRlZmF1bHRzO1xuICBjb25zdCByYXcgPSB2YWx1ZSBhcyBQYXJ0aWFsPFRhYmxlTGF5b3V0PjtcbiAgaWYgKCFBcnJheS5pc0FycmF5KHJhdy5maWVsZHMpKSByZXR1cm4gZGVmYXVsdHM7XG4gIGNvbnN0IGFsbG93ZWQgPSBuZXcgU2V0KGRlZmF1bHRzLmZpZWxkcy5tYXAoKGZpZWxkKSA9PiBmaWVsZC5pZCkpO1xuICBjb25zdCBzZWVuID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IGZpZWxkczogRmllbGRDb25maWdbXSA9IFtdO1xuICBmb3IgKGNvbnN0IGZpZWxkIG9mIHJhdy5maWVsZHMpIHtcbiAgICBpZiAoIWZpZWxkIHx8IHR5cGVvZiBmaWVsZC5pZCAhPT0gXCJzdHJpbmdcIiB8fCAhYWxsb3dlZC5oYXMoZmllbGQuaWQpIHx8IHNlZW4uaGFzKGZpZWxkLmlkKSkgY29udGludWU7XG4gICAgaWYgKCFbXCJwcmltYXJ5XCIsIFwic2Vjb25kYXJ5XCIsIFwiaGlkZGVuXCJdLmluY2x1ZGVzKGZpZWxkLmxpbmUpKSBjb250aW51ZTtcbiAgICBzZWVuLmFkZChmaWVsZC5pZCk7XG4gICAgZmllbGRzLnB1c2goe1xuICAgICAgaWQ6IGZpZWxkLmlkLFxuICAgICAgbGluZTogKGlzTmFtZShmaWVsZC5pZCkgJiYgZmllbGQubGluZSA9PT0gXCJoaWRkZW5cIikgfHwgKGlzV2FybmluZ0ljb24oZmllbGQuaWQpICYmIGZpZWxkLmxpbmUgIT09IFwiaGlkZGVuXCIpID8gXCJwcmltYXJ5XCIgOiBmaWVsZC5saW5lLFxuICAgICAgd2lkdGg6IE51bWJlci5pc0Zpbml0ZShmaWVsZC53aWR0aCkgPyBNYXRoLm1heCgxLCBNYXRoLm1pbig0OCwgTWF0aC5yb3VuZChmaWVsZC53aWR0aCkpKSA6IDUsXG4gICAgfSk7XG4gIH1cbiAgZmllbGRzLnB1c2goLi4uZGVmYXVsdHMuZmllbGRzLmZpbHRlcigoZmllbGQpID0+ICFzZWVuLmhhcyhmaWVsZC5pZCkpKTtcbiAgcmV0dXJuIHsgZmllbGRzLCBsYWJlbHM6IHJhdy5sYWJlbHMgIT09IGZhbHNlLCBhdXRvU2Vjb25kYXJ5OiByYXcuYXV0b1NlY29uZGFyeSA9PT0gdHJ1ZSB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2FuaXRpemVTZXR0aW5ncyh2YWx1ZTogdW5rbm93bik6IExheW91dFNldHRpbmdzIHtcbiAgaWYgKCF2YWx1ZSB8fCB0eXBlb2YgdmFsdWUgIT09IFwib2JqZWN0XCIpIHJldHVybiB7IC4uLmVtcHR5U2V0dGluZ3MsIHRhYmxlczoge30gfTtcbiAgY29uc3QgcmF3ID0gdmFsdWUgYXMgUGFydGlhbDxMYXlvdXRTZXR0aW5ncz47XG4gIGNvbnN0IHRhYmxlczogUmVjb3JkPHN0cmluZywgVGFibGVMYXlvdXQ+ID0ge307XG4gIGlmIChyYXcudGFibGVzICYmIHR5cGVvZiByYXcudGFibGVzID09PSBcIm9iamVjdFwiICYmICFBcnJheS5pc0FycmF5KHJhdy50YWJsZXMpKSB7XG4gICAgZm9yIChjb25zdCBbaWQsIGxheW91dF0gb2YgT2JqZWN0LmVudHJpZXMocmF3LnRhYmxlcykpIHtcbiAgICAgIGlmICghbGF5b3V0IHx8ICFBcnJheS5pc0FycmF5KGxheW91dC5maWVsZHMpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGlkcyA9IGxheW91dC5maWVsZHMuZmlsdGVyKChmaWVsZCkgPT4gZmllbGQgJiYgdHlwZW9mIGZpZWxkLmlkID09PSBcInN0cmluZ1wiKS5tYXAoKGZpZWxkKSA9PiBmaWVsZC5pZCk7XG4gICAgICB0YWJsZXNbaWRdID0gcmVzb2x2ZUxheW91dChpZHMsIGxheW91dCk7XG4gICAgfVxuICB9XG4gIHJldHVybiB7IHZlcnNpb246IDEsIGVuYWJsZWQ6IHJhdy5lbmFibGVkICE9PSBmYWxzZSwgdGFibGVzIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBtb3ZlRmllbGQobGF5b3V0OiBUYWJsZUxheW91dCwgaWQ6IHN0cmluZywgbGluZTogRmllbGRMaW5lLCBiZWZvcmU/OiBzdHJpbmcpOiBUYWJsZUxheW91dCB7XG4gIGNvbnN0IGZpZWxkID0gbGF5b3V0LmZpZWxkcy5maW5kKChjYW5kaWRhdGUpID0+IGNhbmRpZGF0ZS5pZCA9PT0gaWQpO1xuICBpZiAoIWZpZWxkIHx8IChpc05hbWUoaWQpICYmIGxpbmUgPT09IFwiaGlkZGVuXCIpKSByZXR1cm4gbGF5b3V0O1xuICBpZiAoaWQgPT09IGJlZm9yZSAmJiBmaWVsZC5saW5lID09PSBsaW5lKSByZXR1cm4gbGF5b3V0O1xuICBjb25zdCBmaWVsZHMgPSBsYXlvdXQuZmllbGRzLmZpbHRlcigoY2FuZGlkYXRlKSA9PiBjYW5kaWRhdGUuaWQgIT09IGlkKTtcbiAgbGV0IHBvc2l0aW9uID0gYmVmb3JlID8gZmllbGRzLmZpbmRJbmRleCgoY2FuZGlkYXRlKSA9PiBjYW5kaWRhdGUuaWQgPT09IGJlZm9yZSAmJiBjYW5kaWRhdGUubGluZSA9PT0gbGluZSkgOiAtMTtcbiAgaWYgKHBvc2l0aW9uIDwgMCkge1xuICAgIGNvbnN0IGxhc3QgPSBmaWVsZHMuZmluZExhc3RJbmRleCgoY2FuZGlkYXRlKSA9PiBjYW5kaWRhdGUubGluZSA9PT0gbGluZSk7XG4gICAgcG9zaXRpb24gPSBsYXN0IDwgMCA/IGZpZWxkcy5sZW5ndGggOiBsYXN0ICsgMTtcbiAgfVxuICBmaWVsZHMuc3BsaWNlKHBvc2l0aW9uLCAwLCB7IC4uLmZpZWxkLCBsaW5lOiBpc1dhcm5pbmdJY29uKGlkKSAmJiBsaW5lICE9PSBcImhpZGRlblwiID8gXCJwcmltYXJ5XCIgOiBsaW5lIH0pO1xuICByZXR1cm4geyAuLi5sYXlvdXQsIGZpZWxkcyB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGV0YWlsR3JvdXAoaWQ6IHN0cmluZyk6IHN0cmluZyB7XG4gIGNvbnN0IGtleSA9IG5vcm1hbGl6ZShpZCk7XG4gIGlmIChbXCJjcHVcIiwgXCJtZW1vcnlcIiwgXCJjb250YWluZXJzXCIsIFwicmVzdGFydHNcIl0uaW5jbHVkZXMoa2V5KSkgcmV0dXJuIFwicmVzb3VyY2VzXCI7XG4gIGlmIChpc093bmVyKGlkKSB8fCBbXCJub2RlXCIsIFwibmFtZXNwYWNlXCJdLmluY2x1ZGVzKGtleSkpIHJldHVybiBcInJlbGF0aW9uc1wiO1xuICBpZiAoa2V5ID09PSBcInFvc1wiKSByZXR1cm4gXCJxdWFsaXR5XCI7XG4gIHJldHVybiBcIm90aGVyXCI7XG59XG4iLCAiZXhwb3J0IHR5cGUgTmF0dXJhbFdpZHRoID0geyBpZDogc3RyaW5nOyBwcmVmZXJyZWQ6IG51bWJlcjsgbWluaW11bTogbnVtYmVyIH07XG5leHBvcnQgdHlwZSBGaXR0ZWRXaWR0aCA9IHsgaWQ6IHN0cmluZzsgb2Zmc2V0OiBudW1iZXI7IHdpZHRoOiBudW1iZXIgfTtcblxuLyoqIEtlZXAgc2hvcnQgZmllbGRzIGF0IHRoZWlyIG5hdHVyYWwgd2lkdGg7IHNocmluayBsb25nIGZpZWxkcyBvbmx5IHdoZW4gc3BhY2UgcnVucyBvdXQuICovXG5leHBvcnQgZnVuY3Rpb24gZml0TmF0dXJhbFdpZHRocyhmaWVsZHM6IE5hdHVyYWxXaWR0aFtdLCBhdmFpbGFibGU6IG51bWJlcik6IEZpdHRlZFdpZHRoW10ge1xuICBhdmFpbGFibGUgPSBNYXRoLm1heCgwLCBOdW1iZXIuaXNGaW5pdGUoYXZhaWxhYmxlKSA/IGF2YWlsYWJsZSA6IDApO1xuICBjb25zdCBwcmVmZXJyZWQgPSBmaWVsZHMubWFwKChmaWVsZCkgPT4gTWF0aC5tYXgoMCwgZmllbGQucHJlZmVycmVkKSk7XG4gIGNvbnN0IG1pbmltdW0gPSBmaWVsZHMubWFwKChmaWVsZCwgaW5kZXgpID0+IE1hdGgubWF4KDAsIE1hdGgubWluKHByZWZlcnJlZFtpbmRleF0sIGZpZWxkLm1pbmltdW0pKSk7XG4gIGNvbnN0IHRvdGFsID0gcHJlZmVycmVkLnJlZHVjZSgoc3VtLCB3aWR0aCkgPT4gc3VtICsgd2lkdGgsIDApO1xuICBjb25zdCBmbG9vciA9IG1pbmltdW0ucmVkdWNlKChzdW0sIHdpZHRoKSA9PiBzdW0gKyB3aWR0aCwgMCk7XG4gIGxldCB3aWR0aHMgPSBwcmVmZXJyZWQ7XG4gIGlmICh0b3RhbCA+IGF2YWlsYWJsZSkge1xuICAgIHdpZHRocyA9IGZsb29yID49IGF2YWlsYWJsZVxuICAgICAgPyBtaW5pbXVtLm1hcCgod2lkdGgpID0+IGZsb29yID8gd2lkdGggKiBhdmFpbGFibGUgLyBmbG9vciA6IDApXG4gICAgICA6IHByZWZlcnJlZC5tYXAoKHdpZHRoLCBpbmRleCkgPT4gd2lkdGggLSAod2lkdGggLSBtaW5pbXVtW2luZGV4XSkgKiAodG90YWwgLSBhdmFpbGFibGUpIC8gKHRvdGFsIC0gZmxvb3IpKTtcbiAgfVxuICBsZXQgb2Zmc2V0ID0gMDtcbiAgcmV0dXJuIGZpZWxkcy5tYXAoKGZpZWxkLCBpbmRleCkgPT4ge1xuICAgIGNvbnN0IHJlc3VsdCA9IHsgaWQ6IGZpZWxkLmlkLCBvZmZzZXQsIHdpZHRoOiB3aWR0aHNbaW5kZXhdIH07XG4gICAgb2Zmc2V0ICs9IHdpZHRoc1tpbmRleF07XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfSk7XG59XG5cbmNvbnN0IGNvbnRleHRzID0gbmV3IFdlYWtNYXA8RG9jdW1lbnQsIHsgY29udGV4dDogQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEIHwgbnVsbDsgY2FjaGU6IE1hcDxzdHJpbmcsIG51bWJlcj4gfT4oKTtcblxuZXhwb3J0IGZ1bmN0aW9uIG1lYXN1cmVUZXh0KGRvY3VtZW50OiBEb2N1bWVudCwgdGV4dDogc3RyaW5nLCBmb250OiBzdHJpbmcpOiBudW1iZXIge1xuICBsZXQgc3RhdGUgPSBjb250ZXh0cy5nZXQoZG9jdW1lbnQpO1xuICBpZiAoIXN0YXRlKSB7XG4gICAgLy8gVGVzdHMgYW5kIG5vbi1icm93c2VyIGVudmlyb25tZW50cyBjYW4gbGFjayBjYW52YXMgc3VwcG9ydC5cbiAgICBjb25zdCBzdXBwb3J0ZWQgPSB0eXBlb2YgZG9jdW1lbnQuZGVmYXVsdFZpZXc/LkNhbnZhc1JlbmRlcmluZ0NvbnRleHQyRCA9PT0gXCJmdW5jdGlvblwiO1xuICAgIHN0YXRlID0geyBjb250ZXh0OiBzdXBwb3J0ZWQgPyBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpLmdldENvbnRleHQoXCIyZFwiKSA6IG51bGwsIGNhY2hlOiBuZXcgTWFwKCkgfTtcbiAgICBjb250ZXh0cy5zZXQoZG9jdW1lbnQsIHN0YXRlKTtcbiAgfVxuICBjb25zdCBrZXkgPSBgJHtmb250fVxcbiR7dGV4dH1gO1xuICBjb25zdCBjYWNoZWQgPSBzdGF0ZS5jYWNoZS5nZXQoa2V5KTtcbiAgaWYgKGNhY2hlZCAhPT0gdW5kZWZpbmVkKSByZXR1cm4gY2FjaGVkO1xuICBsZXQgd2lkdGg6IG51bWJlcjtcbiAgaWYgKHN0YXRlLmNvbnRleHQpIHtcbiAgICBzdGF0ZS5jb250ZXh0LmZvbnQgPSBmb250O1xuICAgIHdpZHRoID0gc3RhdGUuY29udGV4dC5tZWFzdXJlVGV4dCh0ZXh0KS53aWR0aDtcbiAgfSBlbHNlIHdpZHRoID0gdGV4dC5sZW5ndGggKiAoTnVtYmVyLnBhcnNlRmxvYXQoZm9udC5tYXRjaCgvW1xcZC5dK3B4Lyk/LlswXSA/PyBcIjEzXCIpICogMC41NSk7XG4gIGlmIChzdGF0ZS5jYWNoZS5zaXplID4gMjA0OCkgc3RhdGUuY2FjaGUuY2xlYXIoKTtcbiAgc3RhdGUuY2FjaGUuc2V0KGtleSwgd2lkdGgpO1xuICByZXR1cm4gd2lkdGg7XG59XG4iLCAiaW1wb3J0IHsgZGVmYXVsdExheW91dCwgZGV0YWlsR3JvdXAsIGZpZWxkTGFiZWwsIGlzV2FybmluZ0ljb24sIG5vcm1hbGl6ZSwgcmVzb2x2ZUxheW91dCwgdHlwZSBUYWJsZUxheW91dCB9IGZyb20gXCIuL2NvbmZpZy50c1wiO1xuaW1wb3J0IHsgZml0TmF0dXJhbFdpZHRocywgbWVhc3VyZVRleHQgfSBmcm9tIFwiLi9hdXRvLXdpZHRoLnRzXCI7XG50eXBlIFBsYWNlbWVudCA9IHsgY29sdW1uOiBzdHJpbmc7IGxpbmU6IHN0cmluZzsgaGlkZGVuPzogYm9vbGVhbjsgc2Vjb25kYXJ5PzogYm9vbGVhbjsgd2FybmluZz86IGJvb2xlYW4gfTtcblxuLyoqIE9uZSBjb21tb24gZ3JpZCBsZXRzIHRoZSB0d28gbGluZXMgdXNlIGRpZmZlcmVudCBjb2x1bW4gd2lkdGhzIHdpdGhvdXQgbW92aW5nIERPTSBub2Rlcy4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwbGFjZW1lbnRzKGlkczogc3RyaW5nW10sIGxheW91dDogVGFibGVMYXlvdXQgPSBkZWZhdWx0TGF5b3V0KGlkcywgXCJhbGxcIikpOiBNYXA8c3RyaW5nLCBQbGFjZW1lbnQ+IHtcbiAgY29uc3QgcmVzdWx0ID0gbmV3IE1hcDxzdHJpbmcsIFBsYWNlbWVudD4oKTtcbiAgY29uc3QgZmluZCA9ICguLi5uYW1lczogc3RyaW5nW10pID0+IGlkcy5maW5kKChpZCkgPT4gbmFtZXMuaW5jbHVkZXMobm9ybWFsaXplKGlkKSkpO1xuICBjb25zdCBzZWxlY3Rpb24gPSBmaW5kKFwic2VsZWN0aW9uXCIsIFwic2VsZWN0XCIsIFwiY2hlY2tib3hcIiwgXCJpZDBcIik7XG4gIGNvbnN0IG1lbnUgPSBmaW5kKFwibWVudVwiLCBcImFjdGlvbnNcIiwgXCJjb250ZXh0bWVudVwiKTtcbiAgaWYgKHNlbGVjdGlvbikgcmVzdWx0LnNldChzZWxlY3Rpb24sIHsgY29sdW1uOiBcIjEgLyAyXCIsIGxpbmU6IFwiMSAvIDNcIiB9KTtcbiAgaWYgKG1lbnUpIHJlc3VsdC5zZXQobWVudSwgeyBjb2x1bW46IFwiMTIyIC8gMTIzXCIsIGxpbmU6IFwiMSAvIDNcIiB9KTtcblxuICBjb25zdCBmaWVsZHMgPSByZXNvbHZlTGF5b3V0KGlkcywgbGF5b3V0KS5maWVsZHM7XG4gIGZ1bmN0aW9uIGRpc3RyaWJ1dGUoaXRlbXM6IHsgaWQ6IHN0cmluZzsgd2lkdGg6IG51bWJlciB9W10sIGxpbmU6IHN0cmluZywgc2Vjb25kYXJ5ID0gZmFsc2UpIHtcbiAgICBjb25zdCB0b3RhbCA9IGl0ZW1zLnJlZHVjZSgoc3VtLCBpdGVtKSA9PiBzdW0gKyBpdGVtLndpZHRoLCAwKTtcbiAgICBsZXQgdXNlZCA9IDA7XG4gICAgbGV0IHN0YXJ0ID0gMjtcbiAgICBpdGVtcy5mb3JFYWNoKChpdGVtLCBpbmRleCkgPT4ge1xuICAgICAgdXNlZCArPSBpdGVtLndpZHRoO1xuICAgICAgLy8gUmVzZXJ2ZSBhdCBsZWFzdCBvbmUgdHJhY2sgZm9yIHRoaXMgZmllbGQgYW5kIGV2ZXJ5IHJlbWFpbmluZyBmaWVsZC5cbiAgICAgIGNvbnN0IGVuZCA9IGluZGV4ID09PSBpdGVtcy5sZW5ndGggLSAxID8gMTIyIDogTWF0aC5tYXgoc3RhcnQgKyAxLFxuICAgICAgICBNYXRoLm1pbigxMjIgLSAoaXRlbXMubGVuZ3RoIC0gaW5kZXggLSAxKSwgMiArIE1hdGgucm91bmQoMTIwICogdXNlZCAvIHRvdGFsKSkpO1xuICAgICAgcmVzdWx0LnNldChpdGVtLmlkLCB7IGNvbHVtbjogYCR7c3RhcnR9IC8gJHtlbmR9YCwgbGluZSwgLi4uKHNlY29uZGFyeSA/IHsgc2Vjb25kYXJ5OiB0cnVlIH0gOiB7fSkgfSk7XG4gICAgICBzdGFydCA9IGVuZDtcbiAgICB9KTtcbiAgfVxuICBkaXN0cmlidXRlKGZpZWxkcy5maWx0ZXIoKGZpZWxkKSA9PiBmaWVsZC5saW5lID09PSBcInByaW1hcnlcIiAmJiAhaXNXYXJuaW5nSWNvbihmaWVsZC5pZCkpLCBcIjEgLyAyXCIpO1xuICBkaXN0cmlidXRlKGZpZWxkcy5maWx0ZXIoKGZpZWxkKSA9PiBmaWVsZC5saW5lID09PSBcInNlY29uZGFyeVwiICYmICFpc1dhcm5pbmdJY29uKGZpZWxkLmlkKSksIFwiMiAvIDNcIiwgdHJ1ZSk7XG4gIGZvciAoY29uc3QgZmllbGQgb2YgZmllbGRzLmZpbHRlcigoZmllbGQpID0+IGZpZWxkLmxpbmUgPT09IFwiaGlkZGVuXCIpKSB7XG4gICAgcmVzdWx0LnNldChmaWVsZC5pZCwgeyBjb2x1bW46IFwiMiAvIDEyMlwiLCBsaW5lOiBcIjIgLyAzXCIsIGhpZGRlbjogdHJ1ZSB9KTtcbiAgfVxuICBjb25zdCBuYW1lID0gZmllbGRzLmZpbmQoKGZpZWxkKSA9PiBub3JtYWxpemUoZmllbGQuaWQpID09PSBcIm5hbWVcIik7XG4gIGNvbnN0IHdhcm5pbmcgPSBmaWVsZHMuZmluZCgoZmllbGQpID0+IGlzV2FybmluZ0ljb24oZmllbGQuaWQpICYmIGZpZWxkLmxpbmUgIT09IFwiaGlkZGVuXCIpO1xuICBjb25zdCBuYW1lUG9zaXRpb24gPSBuYW1lICYmIHJlc3VsdC5nZXQobmFtZS5pZCk7XG4gIGlmICh3YXJuaW5nICYmIG5hbWVQb3NpdGlvbikgcmVzdWx0LnNldCh3YXJuaW5nLmlkLCB7IC4uLm5hbWVQb3NpdGlvbiwgd2FybmluZzogdHJ1ZSB9KTtcbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuY29uc3Qgcm93QXR0cmlidXRlID0gXCJkYXRhLWx3ci1yb3dcIjtcbmNvbnN0IGNlbGxBdHRyaWJ1dGUgPSBcImRhdGEtbHdyLWNlbGxcIjtcblxuZXhwb3J0IGZ1bmN0aW9uIGxheW91dFJvdyhyb3c6IEhUTUxFbGVtZW50LCBoZWFkZXIgPSBmYWxzZSwgbGF5b3V0PzogVGFibGVMYXlvdXQsIGxhYmVscz86IE1hcDxzdHJpbmcsIHN0cmluZz4sIGNvbnRleHQ6IHsgaW5kZXg/OiBudW1iZXI7IGF2YWlsYWJsZVdpZHRoPzogbnVtYmVyIH0gPSB7fSk6IHZvaWQge1xuICBjb25zdCBjZWxscyA9IEFycmF5LmZyb20ocm93LmNoaWxkcmVuKS5maWx0ZXIoKGNoaWxkKTogY2hpbGQgaXMgSFRNTEVsZW1lbnQgPT5cbiAgICBjaGlsZCBpbnN0YW5jZW9mIHJvdy5vd25lckRvY3VtZW50LmRlZmF1bHRWaWV3IS5IVE1MRWxlbWVudCk7XG4gIGNvbnN0IGdldElkID0gKGNlbGw6IEhUTUxFbGVtZW50KSA9PlxuICAgIGNlbGwuZ2V0QXR0cmlidXRlKGhlYWRlciA/IFwiZGF0YS1jb2x1bW4taWQtdGVzdFwiIDogXCJkYXRhLWNvbHVtbi1pZFwiKSA/P1xuICAgIChoZWFkZXIgJiYgY2VsbC5xdWVyeVNlbGVjdG9yKFwiW2RhdGEtc2VsZWN0LWFsbC1jaGVja2JveC10ZXN0XVwiKSA/IFwiaWQtMFwiIDogXCJcIik7XG4gIGNvbnN0IGlkcyA9IGNlbGxzLm1hcChnZXRJZCk7XG4gIC8vIFJlZnVzZSBhbiB1bmtub3duIHN0cnVjdHVyZSByYXRoZXIgdGhhbiBtaXNwbGFjaW5nIGNvbnRyb2xzLlxuICBpZiAoaWRzLnNvbWUoKGlkKSA9PiAhaWQpIHx8ICFpZHMuc29tZSgoaWQpID0+IG5vcm1hbGl6ZShpZCkgPT09IFwibmFtZVwiKSkge1xuICAgIGNsZWFyTGF5b3V0KHJvdyk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHBvc2l0aW9ucyA9IHBsYWNlbWVudHMoaWRzLCBsYXlvdXQpO1xuICBjb25zdCByZXNvbHZlZCA9IHJlc29sdmVMYXlvdXQoaWRzLCBsYXlvdXQgPz8gZGVmYXVsdExheW91dChpZHMsIFwiYWxsXCIpKTtcbiAgY29uc3Qgc2hvd0xhYmVscyA9IEJvb2xlYW4obGF5b3V0Py5sYWJlbHMpIHx8IHJlc29sdmVkLmF1dG9TZWNvbmRhcnk7XG4gIGNvbnN0IGRldGFpbHMgPSByZXNvbHZlZC5maWVsZHMuZmlsdGVyKChmaWVsZCkgPT4gZmllbGQubGluZSA9PT0gXCJzZWNvbmRhcnlcIiAmJiAhaXNXYXJuaW5nSWNvbihmaWVsZC5pZCkpO1xuICBjb25zdCBncm91cFN0YXJ0cyA9IG5ldyBTZXQoZGV0YWlscy5maWx0ZXIoKGZpZWxkLCBpbmRleCkgPT4gaW5kZXggPiAwICYmIGRldGFpbEdyb3VwKGZpZWxkLmlkKSAhPT0gZGV0YWlsR3JvdXAoZGV0YWlsc1tpbmRleCAtIDFdLmlkKSkubWFwKChmaWVsZCkgPT4gZmllbGQuaWQpKTtcbiAgY29uc3Qgd2FybmluZ0NlbGwgPSBjZWxscy5maW5kKChjZWxsKSA9PiBpc1dhcm5pbmdJY29uKGdldElkKGNlbGwpKSk7XG4gIGNvbnN0IHdhcm5pbmdWaXNpYmxlID0gd2FybmluZ0NlbGwgJiYgIXBvc2l0aW9ucy5nZXQoZ2V0SWQod2FybmluZ0NlbGwpKT8uaGlkZGVuICYmIEJvb2xlYW4od2FybmluZ0NlbGwucXVlcnlTZWxlY3RvcihcImJ1dHRvbiwgc3ZnLCBpbnB1dFwiKSB8fCB3YXJuaW5nQ2VsbC50ZXh0Q29udGVudD8udHJpbSgpKTtcbiAgcm93LnNldEF0dHJpYnV0ZShyb3dBdHRyaWJ1dGUsIGhlYWRlciA/IFwiaGVhZGVyXCIgOiBcImRhdGFcIik7XG4gIHJvdy5zZXRBdHRyaWJ1dGUoXCJkYXRhLWx3ci1sYWJlbHNcIiwgc2hvd0xhYmVscyA/IFwidHJ1ZVwiIDogXCJmYWxzZVwiKTtcbiAgcm93LnNldEF0dHJpYnV0ZShcImRhdGEtbHdyLXN0cmlwZVwiLCAoY29udGV4dC5pbmRleCA/PyAwKSAlIDIgPyBcIm9kZFwiIDogXCJldmVuXCIpO1xuICBmb3IgKGNvbnN0IGNlbGwgb2YgY2VsbHMpIHtcbiAgICBjb25zdCBwbGFjZW1lbnQgPSBwb3NpdGlvbnMuZ2V0KGdldElkKGNlbGwpKTtcbiAgICBpZiAoIXBsYWNlbWVudCkgY29udGludWU7XG4gICAgY2VsbC5zZXRBdHRyaWJ1dGUoY2VsbEF0dHJpYnV0ZSwgXCJcIik7XG4gICAgY2VsbC5zdHlsZS5zZXRQcm9wZXJ0eShcIi0tbHdyLWNvbHVtblwiLCBwbGFjZW1lbnQuY29sdW1uKTtcbiAgICBjZWxsLnN0eWxlLnNldFByb3BlcnR5KFwiLS1sd3ItbGluZVwiLCBwbGFjZW1lbnQubGluZSk7XG4gICAgY2VsbC50b2dnbGVBdHRyaWJ1dGUoXCJkYXRhLWx3ci1oaWRkZW5cIiwgcGxhY2VtZW50LmhpZGRlbiA9PT0gdHJ1ZSk7XG4gICAgY2VsbC50b2dnbGVBdHRyaWJ1dGUoXCJkYXRhLWx3ci1zZWNvbmRhcnlcIiwgcGxhY2VtZW50LnNlY29uZGFyeSA9PT0gdHJ1ZSk7XG4gICAgY2VsbC50b2dnbGVBdHRyaWJ1dGUoXCJkYXRhLWx3ci1uYW1lXCIsIG5vcm1hbGl6ZShnZXRJZChjZWxsKSkgPT09IFwibmFtZVwiKTtcbiAgICBjZWxsLnRvZ2dsZUF0dHJpYnV0ZShcImRhdGEtbHdyLXN0YXR1c1wiLCBbXCJzdGF0dXNcIiwgXCJwaGFzZVwiXS5pbmNsdWRlcyhub3JtYWxpemUoZ2V0SWQoY2VsbCkpKSk7XG4gICAgaWYgKGNlbGwuaGFzQXR0cmlidXRlKFwiZGF0YS1sd3Itc3RhdHVzXCIpKSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IGNlbGwucXVlcnlTZWxlY3RvcihcInNwYW4sIGFcIikgPz8gY2VsbC5maXJzdEVsZW1lbnRDaGlsZDtcbiAgICAgIGlmICh2YWx1ZSkgY2VsbC5zdHlsZS5zZXRQcm9wZXJ0eShcIi0tbHdyLXN0YXR1cy1jb2xvclwiLCByb3cub3duZXJEb2N1bWVudC5kZWZhdWx0VmlldyEuZ2V0Q29tcHV0ZWRTdHlsZSh2YWx1ZSkuY29sb3IpO1xuICAgIH1cbiAgICBjZWxsLnRvZ2dsZUF0dHJpYnV0ZShcImRhdGEtbHdyLWdyb3VwLXN0YXJ0XCIsIGdyb3VwU3RhcnRzLmhhcyhnZXRJZChjZWxsKSkpO1xuICAgIGNlbGwudG9nZ2xlQXR0cmlidXRlKFwiZGF0YS1sd3Itd2FybmluZ1wiLCBwbGFjZW1lbnQud2FybmluZyA9PT0gdHJ1ZSk7XG4gICAgY2VsbC50b2dnbGVBdHRyaWJ1dGUoXCJkYXRhLWx3ci1lbXB0eS1pY29uXCIsIHBsYWNlbWVudC53YXJuaW5nID09PSB0cnVlICYmICF3YXJuaW5nVmlzaWJsZSk7XG4gICAgY2VsbC50b2dnbGVBdHRyaWJ1dGUoXCJkYXRhLWx3ci1oYXMtd2FybmluZ1wiLCBub3JtYWxpemUoZ2V0SWQoY2VsbCkpID09PSBcIm5hbWVcIiAmJiBCb29sZWFuKHdhcm5pbmdWaXNpYmxlKSk7XG4gICAgY2VsbC50b2dnbGVBdHRyaWJ1dGUoXCJkYXRhLWx3ci1hdXRvXCIsICFoZWFkZXIgJiYgcGxhY2VtZW50LnNlY29uZGFyeSA9PT0gdHJ1ZSAmJiByZXNvbHZlZC5hdXRvU2Vjb25kYXJ5KTtcbiAgICBjZWxsLnNldEF0dHJpYnV0ZShcImRhdGEtbHdyLWxhYmVsXCIsIGlzV2FybmluZ0ljb24oZ2V0SWQoY2VsbCkpID8gXCJcIiA6IGxhYmVscz8uZ2V0KGdldElkKGNlbGwpKSA/PyBmaWVsZExhYmVsKGdldElkKGNlbGwpKSk7XG4gICAgY2VsbC5zdHlsZS5yZW1vdmVQcm9wZXJ0eShcIi0tbHdyLW9mZnNldFwiKTtcbiAgICBjZWxsLnN0eWxlLnJlbW92ZVByb3BlcnR5KFwiLS1sd3ItbmF0dXJhbC13aWR0aFwiKTtcbiAgfVxuICBpZiAoIWhlYWRlciAmJiByZXNvbHZlZC5hdXRvU2Vjb25kYXJ5KSB7XG4gICAgY29uc3QgYXZhaWxhYmxlID0gTWF0aC5tYXgoMCwgKGNvbnRleHQuYXZhaWxhYmxlV2lkdGggPz8gcm93LmNsaWVudFdpZHRoKSAtIDgwKTtcbiAgICBjb25zdCBuYXR1cmFsID0gZGV0YWlscy5tYXAoKGZpZWxkKSA9PiB7XG4gICAgICBjb25zdCBjZWxsID0gY2VsbHMuZmluZCgoY2FuZGlkYXRlKSA9PiBnZXRJZChjYW5kaWRhdGUpID09PSBmaWVsZC5pZCkhO1xuICAgICAgY29uc3QgdmFsdWUgPSBjZWxsLnRleHRDb250ZW50Py50cmltKCkgPz8gXCJcIjtcbiAgICAgIGNvbnN0IHN0eWxlID0gcm93Lm93bmVyRG9jdW1lbnQuZGVmYXVsdFZpZXchLmdldENvbXB1dGVkU3R5bGUoY2VsbCk7XG4gICAgICBjb25zdCBmb250U2l6ZSA9IE51bWJlci5wYXJzZUZsb2F0KHN0eWxlLmZvbnRTaXplKSB8fCAxMztcbiAgICAgIGNvbnN0IGZvbnQgPSBgJHtzdHlsZS5mb250V2VpZ2h0IHx8IFwiNDAwXCJ9ICR7Zm9udFNpemV9cHggJHtzdHlsZS5mb250RmFtaWx5IHx8IFwic3lzdGVtLXVpXCJ9YDtcbiAgICAgIGNvbnN0IGxhYmVsID0gY2VsbC5nZXRBdHRyaWJ1dGUoXCJkYXRhLWx3ci1sYWJlbFwiKSA/PyBcIlwiO1xuICAgICAgY29uc3QgbGFiZWxXaWR0aCA9IHNob3dMYWJlbHMgPyBtZWFzdXJlVGV4dChyb3cub3duZXJEb2N1bWVudCwgbGFiZWwsIGA0MDAgJHtmb250U2l6ZSAqIDAuODV9cHggJHtzdHlsZS5mb250RmFtaWx5IHx8IFwic3lzdGVtLXVpXCJ9YCkgKyA2IDogMDtcbiAgICAgIGNvbnN0IGNvbnRyb2xzID0gdmFsdWUgPyAwIDogTWF0aC5tYXgoMTYsIGNlbGwucXVlcnlTZWxlY3RvckFsbChcInN2ZywgaW5wdXQsIGJ1dHRvblwiKS5sZW5ndGggKiAxOCk7XG4gICAgICBjb25zdCBwYWRkaW5nID0gMTIgKyAoZ3JvdXBTdGFydHMuaGFzKGZpZWxkLmlkKSA/IDEzIDogMCkgKyAoY2VsbC5oYXNBdHRyaWJ1dGUoXCJkYXRhLWx3ci1oYXMtd2FybmluZ1wiKSA/IDI2IDogMCk7XG4gICAgICBjb25zdCBwcmVmZXJyZWQgPSBNYXRoLmNlaWwobWVhc3VyZVRleHQocm93Lm93bmVyRG9jdW1lbnQsIHZhbHVlLCBmb250KSArIGNvbnRyb2xzICsgbGFiZWxXaWR0aCArIHBhZGRpbmcgKyAyKTtcbiAgICAgIHJldHVybiB7IGlkOiBmaWVsZC5pZCwgcHJlZmVycmVkLCBtaW5pbXVtOiBNYXRoLm1pbihwcmVmZXJyZWQsIGxhYmVsV2lkdGggKyBwYWRkaW5nICsgNDApIH07XG4gICAgfSk7XG4gICAgZm9yIChjb25zdCBmaXR0ZWQgb2YgZml0TmF0dXJhbFdpZHRocyhuYXR1cmFsLCBhdmFpbGFibGUpKSB7XG4gICAgICBjb25zdCBjZWxsID0gY2VsbHMuZmluZCgoY2FuZGlkYXRlKSA9PiBnZXRJZChjYW5kaWRhdGUpID09PSBmaXR0ZWQuaWQpITtcbiAgICAgIGNlbGwuc3R5bGUuc2V0UHJvcGVydHkoXCItLWx3ci1vZmZzZXRcIiwgYCR7Zml0dGVkLm9mZnNldC50b0ZpeGVkKDIpfXB4YCk7XG4gICAgICBjZWxsLnN0eWxlLnNldFByb3BlcnR5KFwiLS1sd3ItbmF0dXJhbC13aWR0aFwiLCBgJHtmaXR0ZWQud2lkdGgudG9GaXhlZCgyKX1weGApO1xuICAgICAgaWYgKGNlbGwuaGFzQXR0cmlidXRlKFwiZGF0YS1sd3ItbmFtZVwiKSAmJiB3YXJuaW5nQ2VsbCAmJiB3YXJuaW5nVmlzaWJsZSkge1xuICAgICAgICB3YXJuaW5nQ2VsbC5zZXRBdHRyaWJ1dGUoXCJkYXRhLWx3ci1hdXRvXCIsIFwiXCIpO1xuICAgICAgICB3YXJuaW5nQ2VsbC5zdHlsZS5zZXRQcm9wZXJ0eShcIi0tbHdyLW9mZnNldFwiLCBgJHtmaXR0ZWQub2Zmc2V0LnRvRml4ZWQoMil9cHhgKTtcbiAgICAgICAgd2FybmluZ0NlbGwuc3R5bGUuc2V0UHJvcGVydHkoXCItLWx3ci1uYXR1cmFsLXdpZHRoXCIsIFwiMjRweFwiKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNsZWFyTGF5b3V0KHJvb3Q6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gIGZvciAoY29uc3Qgcm93IG9mIFsuLi4ocm9vdC5tYXRjaGVzKGBbJHtyb3dBdHRyaWJ1dGV9XWApID8gW3Jvb3RdIDogW10pLCAuLi5yb290LnF1ZXJ5U2VsZWN0b3JBbGwoYFske3Jvd0F0dHJpYnV0ZX1dYCldKSB7XG4gICAgcm93LnJlbW92ZUF0dHJpYnV0ZShyb3dBdHRyaWJ1dGUpO1xuICAgIHJvdy5yZW1vdmVBdHRyaWJ1dGUoXCJkYXRhLWx3ci1sYWJlbHNcIik7XG4gICAgcm93LnJlbW92ZUF0dHJpYnV0ZShcImRhdGEtbHdyLXN0cmlwZVwiKTtcbiAgfVxuICBmb3IgKGNvbnN0IGNlbGwgb2Ygcm9vdC5xdWVyeVNlbGVjdG9yQWxsPEhUTUxFbGVtZW50PihgWyR7Y2VsbEF0dHJpYnV0ZX1dYCkpIHtcbiAgICBjZWxsLnJlbW92ZUF0dHJpYnV0ZShjZWxsQXR0cmlidXRlKTtcbiAgICBmb3IgKGNvbnN0IGF0dHJpYnV0ZSBvZiBbXCJkYXRhLWx3ci1oaWRkZW5cIiwgXCJkYXRhLWx3ci1zZWNvbmRhcnlcIiwgXCJkYXRhLWx3ci1uYW1lXCIsIFwiZGF0YS1sd3ItbGFiZWxcIiwgXCJkYXRhLWx3ci1hdXRvXCIsIFwiZGF0YS1sd3ItZ3JvdXAtc3RhcnRcIiwgXCJkYXRhLWx3ci1zdGF0dXNcIiwgXCJkYXRhLWx3ci13YXJuaW5nXCIsIFwiZGF0YS1sd3ItZW1wdHktaWNvblwiLCBcImRhdGEtbHdyLWhhcy13YXJuaW5nXCJdKSBjZWxsLnJlbW92ZUF0dHJpYnV0ZShhdHRyaWJ1dGUpO1xuICAgIGNlbGwuc3R5bGUucmVtb3ZlUHJvcGVydHkoXCItLWx3ci1jb2x1bW5cIik7XG4gICAgY2VsbC5zdHlsZS5yZW1vdmVQcm9wZXJ0eShcIi0tbHdyLWxpbmVcIik7XG4gICAgY2VsbC5zdHlsZS5yZW1vdmVQcm9wZXJ0eShcIi0tbHdyLW9mZnNldFwiKTtcbiAgICBjZWxsLnN0eWxlLnJlbW92ZVByb3BlcnR5KFwiLS1sd3ItbmF0dXJhbC13aWR0aFwiKTtcbiAgICBjZWxsLnN0eWxlLnJlbW92ZVByb3BlcnR5KFwiLS1sd3Itc3RhdHVzLWNvbG9yXCIpO1xuICB9XG59XG5cbmV4cG9ydCBjb25zdCBsYXlvdXRDc3MgPSBgXG5bZGF0YS1sd3Itcm93XSB7XG4gIGRpc3BsYXk6IGdyaWQgIWltcG9ydGFudDtcbiAgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiA0MHB4IHJlcGVhdCgxMjAsIG1pbm1heCgwLCAxZnIpKSA0MHB4ICFpbXBvcnRhbnQ7XG4gIGdyaWQtdGVtcGxhdGUtcm93czogcmVwZWF0KDIsIG1pbm1heCgwLCAxZnIpKSAhaW1wb3J0YW50O1xuICB3aWR0aDogMTAwJSAhaW1wb3J0YW50O1xuICBtaW4td2lkdGg6IDAgIWltcG9ydGFudDtcbiAgYm94LXNpemluZzogYm9yZGVyLWJveDtcbn1cbltkYXRhLWx3ci1yb3c9XCJoZWFkZXJcIl0geyBoZWlnaHQ6IDU2cHggIWltcG9ydGFudDsgdHJhbnNmb3JtOiBub25lICFpbXBvcnRhbnQ7IH1cbltkYXRhLWx3ci1yb3c9XCJoZWFkZXJcIl1bZGF0YS1sd3ItbGFiZWxzPVwidHJ1ZVwiXSB7IGhlaWdodDogMzBweCAhaW1wb3J0YW50OyB9XG5bZGF0YS1sd3Itcm93PVwiaGVhZGVyXCJdW2RhdGEtbHdyLWxhYmVscz1cInRydWVcIl0gW2RhdGEtbHdyLWNlbGxdIHsgZ3JpZC1yb3c6IDEgLyAzICFpbXBvcnRhbnQ7IH1cbltkYXRhLWx3ci1yb3c9XCJoZWFkZXJcIl1bZGF0YS1sd3ItbGFiZWxzPVwidHJ1ZVwiXSBbZGF0YS1sd3Itc2Vjb25kYXJ5XSB7IGRpc3BsYXk6IG5vbmUgIWltcG9ydGFudDsgfVxuW2RhdGEtbHdyLXJvdz1cImhlYWRlclwiXSBbZGF0YS1sd3ItZ3JvdXAtc3RhcnRdIHsgYm9yZGVyOiAwOyB9XG5bZGF0YS10YWJsZS1oZWFkLXRlc3RdOmhhcyhbZGF0YS1sd3Itcm93XSkgeyBwYWRkaW5nLWlubGluZTogMCAhaW1wb3J0YW50OyB9XG5bZGF0YS1sd3ItY2VsbF0ge1xuICBncmlkLWNvbHVtbjogdmFyKC0tbHdyLWNvbHVtbikgIWltcG9ydGFudDtcbiAgZ3JpZC1yb3c6IHZhcigtLWx3ci1saW5lKSAhaW1wb3J0YW50O1xuICB3aWR0aDogYXV0byAhaW1wb3J0YW50O1xuICBtaW4td2lkdGg6IDAgIWltcG9ydGFudDtcbiAgbWF4LXdpZHRoOiBub25lICFpbXBvcnRhbnQ7XG4gIG92ZXJmbG93OiBoaWRkZW47XG4gIHdoaXRlLXNwYWNlOiBub3dyYXAgIWltcG9ydGFudDtcbiAgYWxpZ24taXRlbXM6IGNlbnRlcjtcbiAgcGFkZGluZy1pbmxpbmU6IDZweCAhaW1wb3J0YW50O1xuICBib3gtc2l6aW5nOiBib3JkZXItYm94O1xufVxuW2RhdGEtbHdyLWNlbGxdID4gKiB7IG1pbi13aWR0aDogMDsgbWF4LXdpZHRoOiAxMDAlOyB9XG5bZGF0YS1sd3ItaGlkZGVuXSB7IGRpc3BsYXk6IG5vbmUgIWltcG9ydGFudDsgfVxuW2RhdGEtbHdyLWVtcHR5LWljb25dIHsgZGlzcGxheTogbm9uZSAhaW1wb3J0YW50OyB9XG5bZGF0YS1sd3ItbmFtZV0geyBmb250LXdlaWdodDogNjAwOyB9XG5bZGF0YS1sd3ItaGFzLXdhcm5pbmddIHsgcGFkZGluZy1pbmxpbmUtc3RhcnQ6IDMycHggIWltcG9ydGFudDsgfVxuW2RhdGEtbHdyLXdhcm5pbmddIHsgd2lkdGg6IDI0cHggIWltcG9ydGFudDsganVzdGlmeS1zZWxmOiBzdGFydDsgYWxpZ24tc2VsZjogY2VudGVyOyB6LWluZGV4OiAzOyBwYWRkaW5nOiAwICFpbXBvcnRhbnQ7IG1hcmdpbi1pbmxpbmUtc3RhcnQ6IDZweDsgfVxuW2RhdGEtbHdyLXdhcm5pbmddOjpiZWZvcmUgeyBjb250ZW50OiBub25lICFpbXBvcnRhbnQ7IH1cbltkYXRhLWx3ci13YXJuaW5nXSA+ICogeyBtYXgtd2lkdGg6IDI0cHg7IH1cbltkYXRhLWx3ci1yb3c9XCJkYXRhXCJdIHtcbiAgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkIHZhcigtLWJvcmRlckNvbG9yLCAjY2JkNWUxKTtcbiAgLS1sd3Itcm93LXRpbnQ6IGNvbG9yLW1peChpbiBzcmdiLCB2YXIoLS10ZXh0Q29sb3JQcmltYXJ5LCAjNjQ3NDhiKSAzJSwgdHJhbnNwYXJlbnQpO1xuICBiYWNrZ3JvdW5kLWltYWdlOiBsaW5lYXItZ3JhZGllbnQodG8gYm90dG9tLCB2YXIoLS1sd3Itcm93LXRpbnQpIDUwJSwgdHJhbnNwYXJlbnQgNTAlKTtcbn1cbltkYXRhLWx3ci1yb3c9XCJkYXRhXCJdW2RhdGEtbHdyLXN0cmlwZT1cIm9kZFwiXTpub3QoW2RhdGEtc2VsZWN0ZWQ9XCJ0cnVlXCJdKTpub3QoOmhvdmVyKTpub3QoOmZvY3VzLXdpdGhpbikge1xuICAtLWx3ci1yb3ctdGludDogY29sb3ItbWl4KGluIHNyZ2IsIHZhcigtLXRleHRDb2xvclByaW1hcnksICM2NDc0OGIpIDUuNSUsIHRyYW5zcGFyZW50KTtcbn1cbltkYXRhLWx3ci1yb3c9XCJkYXRhXCJdIFtkYXRhLWx3ci1zZWNvbmRhcnldIHsgZm9udC1zaXplOiAuOTJlbTsgfVxuW2RhdGEtbHdyLXJvdz1cImRhdGFcIl0gW2RhdGEtbHdyLWdyb3VwLXN0YXJ0XSB7IGJvcmRlci1pbmxpbmUtc3RhcnQ6IDFweCBzb2xpZCB2YXIoLS1ib3JkZXJDb2xvciwgI2NiZDVlMSk7IHBhZGRpbmctaW5saW5lLXN0YXJ0OiAxOHB4ICFpbXBvcnRhbnQ7IH1cbltkYXRhLWx3ci1yb3c9XCJkYXRhXCJdIFtkYXRhLWx3ci1oYXMtd2FybmluZ10geyBwYWRkaW5nLWlubGluZS1zdGFydDogMzJweCAhaW1wb3J0YW50OyB9XG5bZGF0YS1sd3ItYXV0b10ge1xuICBwb3NpdGlvbjogYWJzb2x1dGUgIWltcG9ydGFudDsgZ3JpZC1jb2x1bW46IDIgLyAxMjIgIWltcG9ydGFudDsgZ3JpZC1yb3c6IDIgLyAzICFpbXBvcnRhbnQ7XG4gIGxlZnQ6IHZhcigtLWx3ci1vZmZzZXQpOyB0b3A6IDA7IGJvdHRvbTogMDtcbiAgd2lkdGg6IHZhcigtLWx3ci1uYXR1cmFsLXdpZHRoKSAhaW1wb3J0YW50OyBqdXN0aWZ5LXNlbGY6IHN0YXJ0O1xufVxuW2RhdGEtbHdyLXJvdz1cImRhdGFcIl1bZGF0YS1sd3ItbGFiZWxzPVwidHJ1ZVwiXSBbZGF0YS1sd3Itc2Vjb25kYXJ5XTo6YmVmb3JlIHtcbiAgY29udGVudDogYXR0cihkYXRhLWx3ci1sYWJlbCk7XG4gIHBvc2l0aW9uOiBzdGF0aWM7IGluc2V0OiBhdXRvOyBib3JkZXI6IDA7IGJhY2tncm91bmQ6IG5vbmU7IGZsZXgtc2hyaW5rOiAwO1xuICBmb250LXNpemU6IDAuODVlbTsgZm9udC13ZWlnaHQ6IDQwMDsgY29sb3I6IHZhcigtLXRleHRDb2xvclNlY29uZGFyeSwgIzc4ODM5Myk7XG4gIG1hcmdpbi1yaWdodDogNnB4OyB3aWR0aDogYXV0bzsgaGVpZ2h0OiBhdXRvO1xufVxuW2RhdGEtbHdyLWNlbGxdIC5UYWJsZUNlbGwgeyBwYWRkaW5nOiAwICFpbXBvcnRhbnQ7IH1cbltkYXRhLWx3ci1jZWxsXVtkYXRhLWx3ci1zdGF0dXNdID4gKiB7XG4gIGRpc3BsYXk6IGlubGluZS1mbGV4OyBhbGlnbi1pdGVtczogY2VudGVyOyBwYWRkaW5nOiAycHggOHB4ICFpbXBvcnRhbnQ7IGJvcmRlci1yYWRpdXM6IDk5OXB4O1xuICBiYWNrZ3JvdW5kOiBjb2xvci1taXgoaW4gc3JnYiwgdmFyKC0tbHdyLXN0YXR1cy1jb2xvciwgY3VycmVudENvbG9yKSA5JSwgdHJhbnNwYXJlbnQpOyBmb250LXdlaWdodDogNTAwO1xufVxuW2RhdGEtbHdyLWNlbGxdIFtkYXRhLWNvbHVtbi1yZXNpemVyLXRlc3RdLFxuW2RhdGEtbHdyLWNlbGxdIFtjbGFzcyo9XCJ0aC1tb2R1bGVfX3NlcGFyYXRvclwiXSB7IGRpc3BsYXk6IG5vbmUgIWltcG9ydGFudDsgfVxuW2RhdGEtbHdyLWNlbGxdIFtjbGFzcyo9XCJzZWxlY3Rpb24taGVhZGVyLW1vZHVsZV9fVG9nZ2xlU2VsZWN0QWxsXCJdIHtcbiAgbWFyZ2luOiAwICFpbXBvcnRhbnQ7IHBhZGRpbmc6IDAgIWltcG9ydGFudDsgd2lkdGg6IDEwMCU7XG59XG4ubHdyLXRvZ2dsZSB7XG4gIGZvbnQ6IGluaGVyaXQ7IGNvbG9yOiBpbmhlcml0OyBib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1ib3JkZXJDb2xvciwgIzg4OCk7XG4gIGJvcmRlci1yYWRpdXM6IDRweDsgcGFkZGluZzogMCA2cHg7IGJhY2tncm91bmQ6IHRyYW5zcGFyZW50OyBjdXJzb3I6IHBvaW50ZXI7XG59XG5gO1xuIiwgImltcG9ydCB7IGdldEluamVjdGFibGUyIH0gZnJvbSBcIkBrOHNsZW5zL2luamVjdGFibGVcIjtcbmltcG9ydCB7IHN0YXR1c0Jhckl0ZW1JbmplY3Rpb25Ub2tlbiB9IGZyb20gXCJAazhzbGVucy9zdGF0dXMtYmFyLWNvbnRyYWN0c1wiO1xuaW1wb3J0IHsgdXNlRWZmZWN0LCB1c2VSZWYsIHVzZVN0YXRlIH0gZnJvbSBcInJlYWN0XCI7XG5pbXBvcnQgeyB1c2VTeW5jSW5qZWN0IH0gZnJvbSBcIkBrOHNsZW5zL3VzZS1pbmplY3RcIjtcbmltcG9ydCB7IHJlYWN0aW9uLCBydW5JbkFjdGlvbiB9IGZyb20gXCJtb2J4XCI7XG5pbXBvcnQgeyBzdGFydExheW91dCwgdHlwZSBMYXlvdXRTdGF0dXMgfSBmcm9tIFwiLi9jb250cm9sbGVyLnRzXCI7XG5pbXBvcnQgeyBlbXB0eVNldHRpbmdzLCByZXNvbHZlTGF5b3V0LCBzYW5pdGl6ZVNldHRpbmdzLCB0eXBlIExheW91dFNldHRpbmdzLCB0eXBlIFRhYmxlQ2F0YWxvZyB9IGZyb20gXCIuL2NvbmZpZy50c1wiO1xuaW1wb3J0IHsgbG9hZFNldHRpbmdzSW5qZWN0YWJsZSwgdHlwZSBTZXR0aW5nc0JveCB9IGZyb20gXCIuL3NldHRpbmdzLmluamVjdGFibGVcIjtcbmltcG9ydCB7IG9wZW5FZGl0b3JJbmplY3RhYmxlIH0gZnJvbSBcIi4vZWRpdG9yLW1vZGFsLmluamVjdGFibGVcIjtcblxuY29uc3QgVG9nZ2xlID0gKCkgPT4ge1xuICBjb25zdCBsb2FkU2V0dGluZ3MgPSB1c2VTeW5jSW5qZWN0KGxvYWRTZXR0aW5nc0luamVjdGFibGUpO1xuICBjb25zdCBvcGVuRWRpdG9yID0gdXNlU3luY0luamVjdChvcGVuRWRpdG9ySW5qZWN0YWJsZSk7XG4gIGNvbnN0IFtzZXR0aW5ncywgc2V0U2V0dGluZ3NdID0gdXNlU3RhdGU8TGF5b3V0U2V0dGluZ3M+KGVtcHR5U2V0dGluZ3MpO1xuICBjb25zdCBbYm94LCBzZXRCb3hdID0gdXNlU3RhdGU8U2V0dGluZ3NCb3ggfCBudWxsPihudWxsKTtcbiAgY29uc3QgW2Vycm9yLCBzZXRFcnJvcl0gPSB1c2VTdGF0ZShcIlwiKTtcbiAgY29uc3QgW2VkaXRpbmcsIHNldEVkaXRpbmddID0gdXNlU3RhdGUoZmFsc2UpO1xuICBjb25zdCBbdGFibGVzLCBzZXRUYWJsZXNdID0gdXNlU3RhdGU8VGFibGVDYXRhbG9nW10+KFtdKTtcbiAgY29uc3Qgc2V0dGluZ3NSZWYgPSB1c2VSZWYoc2V0dGluZ3MpO1xuICBjb25zdCByZWZyZXNoID0gdXNlUmVmPCgpID0+IHZvaWQ+KCgpID0+IHt9KTtcbiAgY29uc3QgW3N0YXR1cywgc2V0U3RhdHVzXSA9IHVzZVN0YXRlPExheW91dFN0YXR1cz4oeyBhY3RpdmU6IDAsIHVuc3VwcG9ydGVkOiAwIH0pO1xuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGxldCBjYW5jZWxsZWQgPSBmYWxzZTtcbiAgICBsZXQgZGlzcG9zZTogKCgpID0+IHZvaWQpIHwgdW5kZWZpbmVkO1xuICAgIGxvYWRTZXR0aW5ncygpLnRoZW4oKHZhbHVlKSA9PiB7XG4gICAgICBpZiAoY2FuY2VsbGVkKSByZXR1cm47XG4gICAgICBzZXRCb3godmFsdWUpO1xuICAgICAgc2V0U2V0dGluZ3Moc2FuaXRpemVTZXR0aW5ncyh2YWx1ZS5nZXQoKSkpO1xuICAgICAgZGlzcG9zZSA9IHJlYWN0aW9uKCgpID0+IHZhbHVlLmdldCgpLCAobmV4dCkgPT4gc2V0U2V0dGluZ3Moc2FuaXRpemVTZXR0aW5ncyhuZXh0KSkpO1xuICAgIH0pLmNhdGNoKCgpID0+IHsgaWYgKCFjYW5jZWxsZWQpIHNldEVycm9yKFwiQ291bGQgbm90IGxvYWQgbGF5b3V0IHNldHRpbmdzLiBSZWxvYWQgdGhlIGV4dGVuc2lvbiB0byByZXRyeS5cIik7IH0pO1xuICAgIHJldHVybiAoKSA9PiB7IGNhbmNlbGxlZCA9IHRydWU7IGRpc3Bvc2U/LigpOyB9O1xuICB9LCBbbG9hZFNldHRpbmdzXSk7XG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgc2V0dGluZ3NSZWYuY3VycmVudCA9IHNldHRpbmdzO1xuICAgIHJlZnJlc2guY3VycmVudCgpO1xuICB9LCBbc2V0dGluZ3NdKTtcbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBpZiAoIWJveCB8fCAhc2V0dGluZ3MuZW5hYmxlZCkgcmV0dXJuO1xuICAgIHJldHVybiBzdGFydExheW91dChkb2N1bWVudCwgc2V0U3RhdHVzLCB7XG4gICAgICBnZXRMYXlvdXQ6ICh0YWJsZUlkLCBpZHMpID0+IHJlc29sdmVMYXlvdXQoaWRzLCBzZXR0aW5nc1JlZi5jdXJyZW50LnRhYmxlc1t0YWJsZUlkXSksXG4gICAgICBvbkNhdGFsb2c6IHNldFRhYmxlcyxcbiAgICAgIHN1YnNjcmliZTogKGNhbGxiYWNrKSA9PiB7IHJlZnJlc2guY3VycmVudCA9IGNhbGxiYWNrOyByZXR1cm4gKCkgPT4geyByZWZyZXNoLmN1cnJlbnQgPSAoKSA9PiB7fTsgfTsgfSxcbiAgICB9KTtcbiAgfSwgW2JveCwgc2V0dGluZ3MuZW5hYmxlZF0pO1xuICBmdW5jdGlvbiBzYXZlKHZhbHVlOiBMYXlvdXRTZXR0aW5ncykge1xuICAgIGlmICghYm94KSByZXR1cm47XG4gICAgcnVuSW5BY3Rpb24oKCkgPT4gYm94LnNldChzYW5pdGl6ZVNldHRpbmdzKHZhbHVlKSkpO1xuICB9XG4gIGFzeW5jIGZ1bmN0aW9uIGVkaXQoKSB7XG4gICAgaWYgKGVkaXRpbmcpIHJldHVybjtcbiAgICBzZXRFZGl0aW5nKHRydWUpO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBvcGVuRWRpdG9yKHRhYmxlcywgc2V0dGluZ3MpO1xuICAgICAgaWYgKHJlc3VsdCkgc2F2ZShyZXN1bHQpO1xuICAgIH0gY2F0Y2ggeyBzZXRFcnJvcihcIkNvdWxkIG5vdCBvcGVuIHRoZSBsYXlvdXQgZWRpdG9yLiBSZWxvYWQgdGhlIGV4dGVuc2lvbiB0byByZXRyeS5cIik7IH1cbiAgICBmaW5hbGx5IHsgc2V0RWRpdGluZyhmYWxzZSk7IH1cbiAgfVxuICBjb25zdCBsYWJlbCA9IGVycm9yID8gXCJSb3dzOiBlcnJvclwiIDogIWJveCA/IFwiUm93czogbG9hZGluZ1wiIDogIXNldHRpbmdzLmVuYWJsZWQgPyBcIlJvd3M6IG5vcm1hbFwiIDogc3RhdHVzLnVuc3VwcG9ydGVkID8gXCJSb3dzOiB1bnN1cHBvcnRlZFwiIDogXCJSb3dzOiAyIGxpbmVzXCI7XG4gIHJldHVybiAoXG4gICAgPHNwYW4gc3R5bGU9e3sgZGlzcGxheTogXCJpbmxpbmUtZmxleFwiLCBnYXA6IFwiNXB4XCIgfX0+PGJ1dHRvblxuICAgICAgY2xhc3NOYW1lPVwibHdyLXRvZ2dsZVwiXG4gICAgICB0eXBlPVwiYnV0dG9uXCJcbiAgICAgIGRpc2FibGVkPXshYm94fVxuICAgICAgYXJpYS1wcmVzc2VkPXtzZXR0aW5ncy5lbmFibGVkfVxuICAgICAgdGl0bGU9e2Vycm9yIHx8IChzZXR0aW5ncy5lbmFibGVkXG4gICAgICAgID8gYFR3by1saW5lIGxheW91dCBvbiAke3N0YXR1cy5hY3RpdmV9IHdvcmtsb2FkIHRhYmxlKHMpLiBDbGljayB0byByZXN0b3JlIG5vcm1hbCByb3dzLmBcbiAgICAgICAgOiBcIkNsaWNrIHRvIGVuYWJsZSB0aGUgdHdvLWxpbmUgd29ya2xvYWQgbGF5b3V0LlwiKX1cbiAgICAgIG9uQ2xpY2s9eygpID0+IHNhdmUoeyAuLi5zZXR0aW5ncywgZW5hYmxlZDogIXNldHRpbmdzLmVuYWJsZWQgfSl9XG4gICAgPntsYWJlbH08L2J1dHRvbj48YnV0dG9uIGNsYXNzTmFtZT1cImx3ci10b2dnbGVcIiB0eXBlPVwiYnV0dG9uXCIgZGlzYWJsZWQ9eyFib3ggfHwgIXRhYmxlcy5sZW5ndGggfHwgZWRpdGluZyB8fCAhc2V0dGluZ3MuZW5hYmxlZH1cbiAgICAgIHRpdGxlPVwiQ29uZmlndXJlIGZpZWxkIHBsYWNlbWVudCwgb3JkZXIsIHdpZHRocyBhbmQgdmlzaWJpbGl0eVwiIG9uQ2xpY2s9e2VkaXR9PkxheW91dFx1MjAyNjwvYnV0dG9uPjwvc3Bhbj5cbiAgKTtcbn07XG5cbmV4cG9ydCBjb25zdCB3b3JrbG9hZFJvd3NUb2dnbGUgPSBnZXRJbmplY3RhYmxlMih7XG4gIGlkOiBcImxlbnMtd29ya2xvYWQtcm93cy50b2dnbGVcIixcbiAgaW5zdGFudGlhdGU6ICgpID0+ICgpID0+ICh7IENvbXBvbmVudDogVG9nZ2xlLCBwb3NpdGlvbjogXCJyaWdodFwiIGFzIGNvbnN0LCBvcmRlck51bWJlcjogOTAgfSksXG4gIGluamVjdGlvblRva2VuOiBzdGF0dXNCYXJJdGVtSW5qZWN0aW9uVG9rZW4sXG59KTtcbiIsICIvKiogRXhwZXJpbWVudGFsIGFkYXB0ZXI6IExlbnMgY3VycmVudGx5IGV4cG9zZXMgbm8gcHVibGljIHJvdy1oZWlnaHQgY29udHJpYnV0aW9uLiAqL1xuZXhwb3J0IGludGVyZmFjZSBWaXJ0dWFsaXplck9wdGlvbnMge1xuICBjb3VudDogbnVtYmVyO1xuICBlc3RpbWF0ZVNpemU6IChpbmRleDogbnVtYmVyKSA9PiBudW1iZXI7XG4gIGdldFNjcm9sbEVsZW1lbnQ6ICgpID0+IEVsZW1lbnQgfCBudWxsO1xuICBba2V5OiBzdHJpbmddOiB1bmtub3duO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFZpcnR1YWxpemVyTGlrZSB7XG4gIG9wdGlvbnM6IFZpcnR1YWxpemVyT3B0aW9ucztcbiAgc2V0T3B0aW9uczogKG9wdGlvbnM6IFZpcnR1YWxpemVyT3B0aW9ucykgPT4gdm9pZDtcbiAgbWVhc3VyZTogKCkgPT4gdm9pZDtcbiAgZ2V0VmlydHVhbEl0ZW1zOiAoKSA9PiB1bmtub3duW107XG4gIHNjcm9sbFRvT2Zmc2V0OiAob2Zmc2V0OiBudW1iZXIpID0+IHZvaWQ7XG4gIHNjcm9sbE9mZnNldDogbnVtYmVyIHwgbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRvdWJsZVJvd0hlaWdodHMoXG4gIHZpcnR1YWxpemVyOiBWaXJ0dWFsaXplckxpa2UsXG4gIGFmdGVyUmVuZGVyOiAoY2FsbGJhY2s6ICgpID0+IHZvaWQpID0+IHZvaWQgPSAoY2FsbGJhY2spID0+IGNhbGxiYWNrKCksXG4pOiAoKSA9PiB2b2lkIHtcbiAgY29uc3Qgb3JpZ2luYWxTZXRPcHRpb25zID0gdmlydHVhbGl6ZXIuc2V0T3B0aW9ucztcbiAgbGV0IGJhc2VPcHRpb25zID0gdmlydHVhbGl6ZXIub3B0aW9ucztcbiAgbGV0IGJhc2VFc3RpbWF0ZSA9IGJhc2VPcHRpb25zLmVzdGltYXRlU2l6ZTtcbiAgbGV0IGFjdGl2ZSA9IHRydWU7XG4gIGNvbnN0IHNjYWxlZEVzdGltYXRlID0gKGluZGV4OiBudW1iZXIpID0+IGJhc2VFc3RpbWF0ZShpbmRleCkgKiAyO1xuXG4gIGNvbnN0IHNldE9wdGlvbnMgPSAob3B0aW9uczogVmlydHVhbGl6ZXJPcHRpb25zKSA9PiB7XG4gICAgaWYgKG9wdGlvbnMuZXN0aW1hdGVTaXplICE9PSBzY2FsZWRFc3RpbWF0ZSkgYmFzZUVzdGltYXRlID0gb3B0aW9ucy5lc3RpbWF0ZVNpemU7XG4gICAgYmFzZU9wdGlvbnMgPSB7IC4uLm9wdGlvbnMsIGVzdGltYXRlU2l6ZTogYmFzZUVzdGltYXRlIH07XG4gICAgb3JpZ2luYWxTZXRPcHRpb25zLmNhbGwodmlydHVhbGl6ZXIsIHsgLi4ub3B0aW9ucywgZXN0aW1hdGVTaXplOiBzY2FsZWRFc3RpbWF0ZSB9KTtcbiAgfTtcblxuICBjb25zdCBvcmlnaW5hbE9mZnNldCA9IHZpcnR1YWxpemVyLnNjcm9sbE9mZnNldCA/PyAwO1xuICB2aXJ0dWFsaXplci5zZXRPcHRpb25zID0gc2V0T3B0aW9ucztcbiAgdHJ5IHtcbiAgICBzZXRPcHRpb25zKGJhc2VPcHRpb25zKTtcbiAgICB2aXJ0dWFsaXplci5tZWFzdXJlKCk7XG4gICAgLy8gVGhlIHNjcm9sbCBzcGFjZXIgbXVzdCByZW5kZXIgaXRzIG5ldyBoZWlnaHQgYmVmb3JlIGEgbmVhci1ib3R0b20gb2Zmc2V0IGlzIGFwcGxpZWQuXG4gICAgYWZ0ZXJSZW5kZXIoKCkgPT4geyBpZiAoYWN0aXZlKSB2aXJ0dWFsaXplci5zY3JvbGxUb09mZnNldChvcmlnaW5hbE9mZnNldCAqIDIpOyB9KTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICB2aXJ0dWFsaXplci5zZXRPcHRpb25zID0gb3JpZ2luYWxTZXRPcHRpb25zO1xuICAgIG9yaWdpbmFsU2V0T3B0aW9ucy5jYWxsKHZpcnR1YWxpemVyLCBiYXNlT3B0aW9ucyk7XG4gICAgdmlydHVhbGl6ZXIubWVhc3VyZSgpO1xuICAgIHRocm93IGVycm9yO1xuICB9XG5cbiAgcmV0dXJuICgpID0+IHtcbiAgICBpZiAoIWFjdGl2ZSkgcmV0dXJuO1xuICAgIGFjdGl2ZSA9IGZhbHNlO1xuICAgIGNvbnN0IG9mZnNldCA9ICh2aXJ0dWFsaXplci5zY3JvbGxPZmZzZXQgPz8gMCkgLyAyO1xuICAgIC8vIERvIG5vdCBvdmVyd3JpdGUgYW4gYWRhcHRlciBpbnN0YWxsZWQgYnkgc29tZXRoaW5nIGVsc2UgYWZ0ZXIgb3Vycy5cbiAgICBpZiAodmlydHVhbGl6ZXIuc2V0T3B0aW9ucyAhPT0gc2V0T3B0aW9ucykgcmV0dXJuO1xuICAgIHZpcnR1YWxpemVyLnNldE9wdGlvbnMgPSBvcmlnaW5hbFNldE9wdGlvbnM7XG4gICAgb3JpZ2luYWxTZXRPcHRpb25zLmNhbGwodmlydHVhbGl6ZXIsIGJhc2VPcHRpb25zKTtcbiAgICB2aXJ0dWFsaXplci5tZWFzdXJlKCk7XG4gICAgYWZ0ZXJSZW5kZXIoKCkgPT4ge1xuICAgICAgaWYgKHZpcnR1YWxpemVyLnNldE9wdGlvbnMgPT09IG9yaWdpbmFsU2V0T3B0aW9ucykgdmlydHVhbGl6ZXIuc2Nyb2xsVG9PZmZzZXQob2Zmc2V0KTtcbiAgICB9KTtcbiAgfTtcbn1cblxudHlwZSBGaWJlciA9IHtcbiAgcmV0dXJuPzogRmliZXIgfCBudWxsO1xuICBhbHRlcm5hdGU/OiBGaWJlciB8IG51bGw7XG4gIG1lbW9pemVkUHJvcHM/OiB7IHRhYmxlSWQ/OiB1bmtub3duIH07XG4gIG1lbW9pemVkU3RhdGU/OiBIb29rIHwgbnVsbDtcbiAgc3RhdGVOb2RlPzogeyBjdXJyZW50PzogRmliZXIgfTtcbn07XG50eXBlIEhvb2sgPSB7IG1lbW9pemVkU3RhdGU/OiB1bmtub3duOyBuZXh0PzogSG9vayB8IG51bGwgfTtcblxuY29uc3Qgd29ya2xvYWRzID0gbmV3IFNldChbXG4gIFwicG9kc1wiLCBcImRlcGxveW1lbnRzXCIsIFwiZGFlbW9uLXNldHNcIiwgXCJzdGF0ZWZ1bC1zZXRzXCIsIFwicmVwbGljYS1zZXRzXCIsXG4gIFwicmVwbGljYXRpb24tY29udHJvbGxlcnNcIiwgXCJqb2JzXCIsIFwiY3Jvbi1qb2JzXCIsXG5dKTtcblxuZnVuY3Rpb24gaXNWaXJ0dWFsaXplcih2YWx1ZTogdW5rbm93biwgZWxlbWVudDogRWxlbWVudCk6IHZhbHVlIGlzIFZpcnR1YWxpemVyTGlrZSB7XG4gIGlmICghdmFsdWUgfHwgdHlwZW9mIHZhbHVlICE9PSBcIm9iamVjdFwiKSByZXR1cm4gZmFsc2U7XG4gIGNvbnN0IHYgPSB2YWx1ZSBhcyBQYXJ0aWFsPFZpcnR1YWxpemVyTGlrZT47XG4gIHJldHVybiB0eXBlb2Ygdi5zZXRPcHRpb25zID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIHYubWVhc3VyZSA9PT0gXCJmdW5jdGlvblwiICYmXG4gICAgdHlwZW9mIHYuZ2V0VmlydHVhbEl0ZW1zID09PSBcImZ1bmN0aW9uXCIgJiYgdHlwZW9mIHYuc2Nyb2xsVG9PZmZzZXQgPT09IFwiZnVuY3Rpb25cIiAmJlxuICAgIHR5cGVvZiB2Lm9wdGlvbnM/LmVzdGltYXRlU2l6ZSA9PT0gXCJmdW5jdGlvblwiICYmXG4gICAgdi5vcHRpb25zLmdldFNjcm9sbEVsZW1lbnQoKSA9PT0gZWxlbWVudDtcbn1cblxuLyoqIFJlYWRzIG9ubHkgdGhlIG93bmluZyBjb21wb25lbnQncyBob29rIGxpc3QsIG5ldmVyIHRoZSB3aG9sZSBSZWFjdCB0cmVlLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZpbmRXb3JrbG9hZFZpcnR1YWxpemVyKGVsZW1lbnQ6IEVsZW1lbnQpOiB7XG4gIHdvcmtsb2FkOiBib29sZWFuO1xuICB2aXJ0dWFsaXplcj86IFZpcnR1YWxpemVyTGlrZTtcbiAgdGFibGVJZD86IHN0cmluZztcbn0ge1xuICBjb25zdCBrZXkgPSBPYmplY3Qua2V5cyhlbGVtZW50KS5maW5kKChuYW1lKSA9PiBuYW1lLnN0YXJ0c1dpdGgoXCJfX3JlYWN0RmliZXIkXCIpKTtcbiAgaWYgKCFrZXkpIHJldHVybiB7IHdvcmtsb2FkOiBmYWxzZSB9O1xuICBjb25zdCBub2RlID0gZWxlbWVudCBhcyB1bmtub3duIGFzIFJlY29yZDxzdHJpbmcsIEZpYmVyPjtcbiAgbGV0IGZpYmVyOiBGaWJlciB8IG51bGwgfCB1bmRlZmluZWQgPSBub2RlW2tleV07XG4gIC8vIEEgRE9NIG5vZGUgY2FuIHJldGFpbiB0aGUgcHJldmlvdXMgZmliZXIgYWZ0ZXIgUmVhY3Qgc3dhcHMgaXRzIGRvdWJsZSBidWZmZXIuXG4gIGxldCByb290ID0gZmliZXI7XG4gIGZvciAobGV0IGRlcHRoID0gMDsgcm9vdD8ucmV0dXJuICYmIGRlcHRoIDwgMTI4OyBkZXB0aCsrKSByb290ID0gcm9vdC5yZXR1cm47XG4gIGlmIChyb290Py5zdGF0ZU5vZGU/LmN1cnJlbnQgJiYgcm9vdC5zdGF0ZU5vZGUuY3VycmVudCAhPT0gcm9vdCAmJiBmaWJlcj8uYWx0ZXJuYXRlKSBmaWJlciA9IGZpYmVyLmFsdGVybmF0ZTtcbiAgZm9yIChsZXQgZGVwdGggPSAwOyBmaWJlciAmJiBkZXB0aCA8IDY0OyBkZXB0aCsrLCBmaWJlciA9IGZpYmVyLnJldHVybikge1xuICAgIGNvbnN0IHRhYmxlSWQgPSBmaWJlci5tZW1vaXplZFByb3BzPy50YWJsZUlkO1xuICAgIGlmICh0eXBlb2YgdGFibGVJZCAhPT0gXCJzdHJpbmdcIikgY29udGludWU7XG4gICAgaWYgKCF3b3JrbG9hZHMuaGFzKHRhYmxlSWQpKSByZXR1cm4geyB3b3JrbG9hZDogZmFsc2UgfTtcbiAgICBmb3IgKGNvbnN0IG93bmVyIG9mIFtmaWJlciwgZmliZXIuYWx0ZXJuYXRlXSkge1xuICAgICAgbGV0IGhvb2sgPSBvd25lcj8ubWVtb2l6ZWRTdGF0ZTtcbiAgICAgIGZvciAobGV0IGNvdW50ID0gMDsgaG9vayAmJiBjb3VudCA8IDEyODsgY291bnQrKywgaG9vayA9IGhvb2submV4dCkge1xuICAgICAgICBjb25zdCBzdGF0ZSA9IGhvb2subWVtb2l6ZWRTdGF0ZTtcbiAgICAgICAgY29uc3QgY2FuZGlkYXRlcyA9IFtzdGF0ZV07XG4gICAgICAgIGlmIChzdGF0ZSAmJiB0eXBlb2Ygc3RhdGUgPT09IFwib2JqZWN0XCIgJiYgXCJjdXJyZW50XCIgaW4gc3RhdGUpIGNhbmRpZGF0ZXMucHVzaChzdGF0ZS5jdXJyZW50KTtcbiAgICAgICAgZm9yIChjb25zdCBjYW5kaWRhdGUgb2YgY2FuZGlkYXRlcykge1xuICAgICAgICAgIGlmIChpc1ZpcnR1YWxpemVyKGNhbmRpZGF0ZSwgZWxlbWVudCkpIHJldHVybiB7IHdvcmtsb2FkOiB0cnVlLCB2aXJ0dWFsaXplcjogY2FuZGlkYXRlLCB0YWJsZUlkIH07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHsgd29ya2xvYWQ6IHRydWUgfTtcbiAgfVxuICByZXR1cm4geyB3b3JrbG9hZDogZmFsc2UgfTtcbn1cbiIsICJpbXBvcnQgeyBkb3VibGVSb3dIZWlnaHRzLCBmaW5kV29ya2xvYWRWaXJ0dWFsaXplciwgdHlwZSBWaXJ0dWFsaXplckxpa2UgfSBmcm9tIFwiLi92aXJ0dWFsaXplci50c1wiO1xuaW1wb3J0IHsgY2xlYXJMYXlvdXQsIGxheW91dFJvdyB9IGZyb20gXCIuL2xheW91dC50c1wiO1xuaW1wb3J0IHsgZGVmYXVsdExheW91dCwgZmllbGRMYWJlbCwgaXNDb250cm9sLCB0eXBlIFRhYmxlQ2F0YWxvZywgdHlwZSBUYWJsZUxheW91dCB9IGZyb20gXCIuL2NvbmZpZy50c1wiO1xuXG5leHBvcnQgdHlwZSBMYXlvdXRTdGF0dXMgPSB7IGFjdGl2ZTogbnVtYmVyOyB1bnN1cHBvcnRlZDogbnVtYmVyIH07XG5cbmV4cG9ydCBmdW5jdGlvbiBzdGFydExheW91dChkb2N1bWVudDogRG9jdW1lbnQsIHJlcG9ydDogKHN0YXR1czogTGF5b3V0U3RhdHVzKSA9PiB2b2lkLCBvcHRpb25zOiB7XG4gIGdldExheW91dD86ICh0YWJsZUlkOiBzdHJpbmcsIGlkczogc3RyaW5nW10pID0+IFRhYmxlTGF5b3V0O1xuICBvbkNhdGFsb2c/OiAodGFibGVzOiBUYWJsZUNhdGFsb2dbXSkgPT4gdm9pZDtcbiAgc3Vic2NyaWJlPzogKHJlZnJlc2g6ICgpID0+IHZvaWQpID0+ICgpID0+IHZvaWQ7XG59ID0ge30pOiAoKSA9PiB2b2lkIHtcbiAgY29uc3Qgd2luZG93ID0gZG9jdW1lbnQuZGVmYXVsdFZpZXchO1xuICBjb25zdCBhdHRhY2hlZCA9IG5ldyBNYXA8SFRNTEVsZW1lbnQsIHsgdGFibGVJZDogc3RyaW5nOyB2aXJ0dWFsaXplcjogVmlydHVhbGl6ZXJMaWtlOyByZXN0b3JlOiAoKSA9PiB2b2lkOyByb290OiBIVE1MRWxlbWVudCB9PigpO1xuICBsZXQgZnJhbWUgPSAwO1xuICBsZXQgc3RvcHBlZCA9IGZhbHNlO1xuICBsZXQgbGFzdFJlcG9ydCA9IFwiXCI7XG4gIGxldCBsYXN0Q2F0YWxvZyA9IFwiXCI7XG4gIGNvbnN0IHJlc2l6ZU9ic2VydmVyID0gdHlwZW9mIHdpbmRvdy5SZXNpemVPYnNlcnZlciA9PT0gXCJmdW5jdGlvblwiID8gbmV3IHdpbmRvdy5SZXNpemVPYnNlcnZlcigoKSA9PiBzY2hlZHVsZSgpKSA6IHVuZGVmaW5lZDtcblxuICBmdW5jdGlvbiBzY2FuKCkge1xuICAgIGZyYW1lID0gMDtcbiAgICBpZiAoc3RvcHBlZCkgcmV0dXJuO1xuICAgIGZvciAoY29uc3QgW2VsZW1lbnQsIGVudHJ5XSBvZiBhdHRhY2hlZCkge1xuICAgICAgaWYgKCFlbGVtZW50LmlzQ29ubmVjdGVkKSB7XG4gICAgICAgIHJlc2l6ZU9ic2VydmVyPy51bm9ic2VydmUoZWxlbWVudCk7XG4gICAgICAgIGVudHJ5LnJlc3RvcmUoKTtcbiAgICAgICAgY2xlYXJMYXlvdXQoZW50cnkucm9vdCk7XG4gICAgICAgIGF0dGFjaGVkLmRlbGV0ZShlbGVtZW50KTtcbiAgICAgIH1cbiAgICB9XG4gICAgbGV0IHVuc3VwcG9ydGVkID0gMDtcbiAgICBjb25zdCBjYXRhbG9ncyA9IG5ldyBNYXA8c3RyaW5nLCBUYWJsZUNhdGFsb2c+KCk7XG4gICAgZm9yIChjb25zdCBlbGVtZW50IG9mIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KFwiW2RhdGEtdGFibGUtY29udGFpbmVyLXRlc3RdXCIpKSB7XG4gICAgICBsZXQgZW50cnkgPSBhdHRhY2hlZC5nZXQoZWxlbWVudCk7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBmb3VuZCA9IGZpbmRXb3JrbG9hZFZpcnR1YWxpemVyKGVsZW1lbnQpO1xuICAgICAgICBpZiAoZW50cnkgJiYgKCFmb3VuZC53b3JrbG9hZCB8fCBmb3VuZC52aXJ0dWFsaXplciAhPT0gZW50cnkudmlydHVhbGl6ZXIpKSB7XG4gICAgICAgICAgZW50cnkucmVzdG9yZSgpO1xuICAgICAgICAgIGNsZWFyTGF5b3V0KGVudHJ5LnJvb3QpO1xuICAgICAgICAgIGF0dGFjaGVkLmRlbGV0ZShlbGVtZW50KTtcbiAgICAgICAgICByZXNpemVPYnNlcnZlcj8udW5vYnNlcnZlKGVsZW1lbnQpO1xuICAgICAgICAgIGVudHJ5ID0gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIGlmICghZW50cnkpIHtcbiAgICAgICAgICBpZiAoIWZvdW5kLndvcmtsb2FkKSBjb250aW51ZTtcbiAgICAgICAgICBpZiAoIWZvdW5kLnZpcnR1YWxpemVyKSB7IHVuc3VwcG9ydGVkKys7IGNvbnRpbnVlOyB9XG4gICAgICAgICAgLy8gSW4gdGhpcyBMZW5zIGJ1aWxkLCB0aGUgaGVhZGVyIGFuZCBzY3JvbGwgYm9keSBhcmUgc2libGluZ3MuXG4gICAgICAgICAgY29uc3Qgcm9vdCA9IGVsZW1lbnQucGFyZW50RWxlbWVudDtcbiAgICAgICAgICBpZiAoIXJvb3Q/LnF1ZXJ5U2VsZWN0b3IoXCJbZGF0YS10YWJsZS1oZWFkLXRlc3RdXCIpKSB7IHVuc3VwcG9ydGVkKys7IGNvbnRpbnVlOyB9XG4gICAgICAgICAgZW50cnkgPSB7XG4gICAgICAgICAgICB0YWJsZUlkOiBmb3VuZC50YWJsZUlkISxcbiAgICAgICAgICAgIHZpcnR1YWxpemVyOiBmb3VuZC52aXJ0dWFsaXplcixcbiAgICAgICAgICAgIHJlc3RvcmU6IGRvdWJsZVJvd0hlaWdodHMoZm91bmQudmlydHVhbGl6ZXIsIChjYWxsYmFjaykgPT4geyB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKGNhbGxiYWNrKTsgfSksXG4gICAgICAgICAgICByb290LFxuICAgICAgICAgIH07XG4gICAgICAgICAgYXR0YWNoZWQuc2V0KGVsZW1lbnQsIGVudHJ5KTtcbiAgICAgICAgICByZXNpemVPYnNlcnZlcj8ub2JzZXJ2ZShlbGVtZW50KTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCB7XG4gICAgICAgIC8vIFVuc3VwcG9ydGVkIGhvc3Qgc2hhcGVzIGFyZSBkZWxpYmVyYXRlbHkgbGVmdCB1bmNoYW5nZWQuXG4gICAgICAgIHVuc3VwcG9ydGVkKys7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuICAgICAgY29uc3Qgcm93ID0gZWxlbWVudC5xdWVyeVNlbGVjdG9yPEhUTUxFbGVtZW50PihcIltkYXRhLXJvd11cIik7XG4gICAgICBjb25zdCBoZWFkZXJDZWxscyA9IEFycmF5LmZyb20oZW50cnkucm9vdC5xdWVyeVNlbGVjdG9yQWxsPEhUTUxFbGVtZW50PihcIltkYXRhLXRhYmxlLWhlYWQtdGVzdF0gW2RhdGEtY29sdW1uLWlkLXRlc3RdXCIpKTtcbiAgICAgIGNvbnN0IGZpZWxkcyA9IGhlYWRlckNlbGxzLm1hcCgoY2VsbCkgPT4ge1xuICAgICAgICBjb25zdCBpZCA9IGNlbGwuZ2V0QXR0cmlidXRlKFwiZGF0YS1jb2x1bW4taWQtdGVzdFwiKSE7XG4gICAgICAgIGNvbnN0IHNhbXBsZSA9IEFycmF5LmZyb20ocm93Py5jaGlsZHJlbiA/PyBbXSkuZmluZCgoY2hpbGQpID0+IGNoaWxkLmdldEF0dHJpYnV0ZShcImRhdGEtY29sdW1uLWlkXCIpID09PSBpZCk/LnRleHRDb250ZW50Py50cmltKCkuc2xpY2UoMCwgMjU2KTtcbiAgICAgICAgcmV0dXJuIHsgaWQsIGxhYmVsOiBjZWxsLnRleHRDb250ZW50Py50cmltKCkgfHwgZmllbGRMYWJlbChpZCksIHNhbXBsZSB9O1xuICAgICAgfSkuZmlsdGVyKChmaWVsZCkgPT4gIWlzQ29udHJvbChmaWVsZC5pZCkpO1xuICAgICAgY2F0YWxvZ3Muc2V0KGVudHJ5LnRhYmxlSWQsIHsgaWQ6IGVudHJ5LnRhYmxlSWQsIGZpZWxkcyB9KTtcbiAgICAgIGNvbnN0IGxheW91dCA9IG9wdGlvbnMuZ2V0TGF5b3V0Py4oZW50cnkudGFibGVJZCwgZmllbGRzLm1hcCgoZmllbGQpID0+IGZpZWxkLmlkKSkgPz8gZGVmYXVsdExheW91dChmaWVsZHMubWFwKChmaWVsZCkgPT4gZmllbGQuaWQpKTtcbiAgICAgIGNvbnN0IGxhYmVscyA9IG5ldyBNYXAoZmllbGRzLm1hcCgoZmllbGQpID0+IFtmaWVsZC5pZCwgZmllbGQubGFiZWxdKSk7XG4gICAgICBjb25zdCB2aXJ0dWFsUm93cyA9IGVudHJ5LnZpcnR1YWxpemVyLmdldFZpcnR1YWxJdGVtcygpIGFzIHsgaW5kZXg6IG51bWJlciB9W107XG4gICAgICBBcnJheS5mcm9tKGVsZW1lbnQucXVlcnlTZWxlY3RvckFsbDxIVE1MRWxlbWVudD4oXCJbZGF0YS1yb3ddXCIpKS5mb3JFYWNoKChyb3csIGluZGV4KSA9PlxuICAgICAgICBsYXlvdXRSb3cocm93LCBmYWxzZSwgbGF5b3V0LCBsYWJlbHMsIHsgaW5kZXg6IHZpcnR1YWxSb3dzW2luZGV4XT8uaW5kZXggPz8gaW5kZXgsIGF2YWlsYWJsZVdpZHRoOiBlbGVtZW50LmNsaWVudFdpZHRoIH0pKTtcbiAgICAgIGZvciAoY29uc3QgaGVhZGVyIG9mIGVudHJ5LnJvb3QucXVlcnlTZWxlY3RvckFsbDxIVE1MRWxlbWVudD4oXCJbZGF0YS10YWJsZS1oZWFkLXRlc3RdID4gZGl2XCIpKSBsYXlvdXRSb3coaGVhZGVyLCB0cnVlLCBsYXlvdXQsIGxhYmVscyk7XG4gICAgfVxuICAgIGNvbnN0IHN0YXR1cyA9IHsgYWN0aXZlOiBhdHRhY2hlZC5zaXplLCB1bnN1cHBvcnRlZCB9O1xuICAgIGNvbnN0IHNpZ25hdHVyZSA9IEpTT04uc3RyaW5naWZ5KHN0YXR1cyk7XG4gICAgaWYgKHNpZ25hdHVyZSAhPT0gbGFzdFJlcG9ydCkgeyBsYXN0UmVwb3J0ID0gc2lnbmF0dXJlOyByZXBvcnQoc3RhdHVzKTsgfVxuICAgIGNvbnN0IHRhYmxlcyA9IFsuLi5jYXRhbG9ncy52YWx1ZXMoKV07XG4gICAgY29uc3QgY2F0YWxvZ1NpZ25hdHVyZSA9IEpTT04uc3RyaW5naWZ5KHRhYmxlcy5tYXAoKHRhYmxlKSA9PiAoeyAuLi50YWJsZSwgZmllbGRzOiB0YWJsZS5maWVsZHMubWFwKCh7IGlkLCBsYWJlbCB9KSA9PiAoeyBpZCwgbGFiZWwgfSkpIH0pKSk7XG4gICAgaWYgKGNhdGFsb2dTaWduYXR1cmUgIT09IGxhc3RDYXRhbG9nKSB7IGxhc3RDYXRhbG9nID0gY2F0YWxvZ1NpZ25hdHVyZTsgb3B0aW9ucy5vbkNhdGFsb2c/Lih0YWJsZXMpOyB9XG4gIH1cblxuICBmdW5jdGlvbiBzY2hlZHVsZSgpIHtcbiAgICBpZiAoIXN0b3BwZWQgJiYgIWZyYW1lKSBmcmFtZSA9IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoc2Nhbik7XG4gIH1cbiAgY29uc3Qgb2JzZXJ2ZXIgPSBuZXcgd2luZG93Lk11dGF0aW9uT2JzZXJ2ZXIoc2NoZWR1bGUpO1xuICBvYnNlcnZlci5vYnNlcnZlKGRvY3VtZW50LmJvZHksIHsgc3VidHJlZTogdHJ1ZSwgY2hpbGRMaXN0OiB0cnVlLCBjaGFyYWN0ZXJEYXRhOiB0cnVlIH0pO1xuICBkb2N1bWVudC5mb250cz8ucmVhZHkudGhlbihzY2hlZHVsZSkuY2F0Y2goKCkgPT4ge30pO1xuICAvLyBBIGZpYmVyJ3MgbGF5b3V0IGVmZmVjdCBtYXkgZmluaXNoIGFmdGVyIHRoZSBET00gbXV0YXRpb24gdGhhdCBpbnRyb2R1Y2VkIGl0LlxuICBjb25zdCByZXRyeSA9IHdpbmRvdy5zZXRJbnRlcnZhbChzY2hlZHVsZSwgMTAwMCk7XG4gIGNvbnN0IHVuc3Vic2NyaWJlID0gb3B0aW9ucy5zdWJzY3JpYmU/LihzY2hlZHVsZSk7XG4gIHNjaGVkdWxlKCk7XG5cbiAgcmV0dXJuICgpID0+IHtcbiAgICBzdG9wcGVkID0gdHJ1ZTtcbiAgICBvYnNlcnZlci5kaXNjb25uZWN0KCk7XG4gICAgcmVzaXplT2JzZXJ2ZXI/LmRpc2Nvbm5lY3QoKTtcbiAgICB1bnN1YnNjcmliZT8uKCk7XG4gICAgd2luZG93LmNsZWFySW50ZXJ2YWwocmV0cnkpO1xuICAgIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZShmcmFtZSk7XG4gICAgZm9yIChjb25zdCB7IHJlc3RvcmUsIHJvb3QgfSBvZiBhdHRhY2hlZC52YWx1ZXMoKSkge1xuICAgICAgcmVzdG9yZSgpO1xuICAgICAgY2xlYXJMYXlvdXQocm9vdCk7XG4gICAgfVxuICAgIGF0dGFjaGVkLmNsZWFyKCk7XG4gIH07XG59XG4iLCAiaW1wb3J0IHsgZ2V0SW5qZWN0YWJsZTIgfSBmcm9tIFwiQGs4c2xlbnMvaW5qZWN0YWJsZVwiO1xuaW1wb3J0IHsgZ2V0UGVyc2lzdGFibGVWYWx1ZUluamVjdGFibGVCdW5jaCB9IGZyb20gXCJAazhzbGVucy9wZXJzaXN0YWJsZS1jb250cmFjdHNcIjtcbmltcG9ydCB7IGVtcHR5U2V0dGluZ3MsIHR5cGUgTGF5b3V0U2V0dGluZ3MgfSBmcm9tIFwiLi9jb25maWcudHNcIjtcblxuZXhwb3J0IHR5cGUgU2V0dGluZ3NCb3ggPSB7IGdldDogKCkgPT4gTGF5b3V0U2V0dGluZ3M7IHNldDogKHZhbHVlOiBMYXlvdXRTZXR0aW5ncykgPT4gdm9pZCB9O1xuXG5leHBvcnQgY29uc3QgbGF5b3V0U2V0dGluZ3NCdW5jaCA9IGdldFBlcnNpc3RhYmxlVmFsdWVJbmplY3RhYmxlQnVuY2g8TGF5b3V0U2V0dGluZ3M+KCkoe1xuICBpZDogXCJsYXlvdXQtc2V0dGluZ3NcIixcbiAgZGVmYXVsdFZhbHVlOiB7IGluc3RhbnRpYXRlOiAoKSA9PiBhc3luYyAoKSA9PiBlbXB0eVNldHRpbmdzIH0sXG59KTtcblxuZXhwb3J0IGNvbnN0IGxvYWRTZXR0aW5nc0luamVjdGFibGUgPSBnZXRJbmplY3RhYmxlMih7XG4gIGlkOiBcImxlbnMtd29ya2xvYWQtcm93cy5sb2FkLXNldHRpbmdzXCIsXG4gIGluc3RhbnRpYXRlOiAoZGkpID0+IHtcbiAgICBjb25zdCBsb2FkID0gZGkuaW5qZWN0KGxheW91dFNldHRpbmdzQnVuY2gucGVyc2lzdGFibGUpO1xuICAgIGNvbnN0IGxvYWRTZXR0aW5ncyA9ICgpOiBQcm9taXNlPFNldHRpbmdzQm94PiA9PiBsb2FkKCk7XG4gICAgcmV0dXJuICgpID0+IGxvYWRTZXR0aW5ncztcbiAgfSxcbn0pO1xuIiwgImltcG9ydCB7IGdldEluamVjdGFibGUyIH0gZnJvbSBcIkBrOHNsZW5zL2luamVjdGFibGVcIjtcbmltcG9ydCB7IGdldE1vZGFsSW5qZWN0YWJsZUJ1bmNoLCBnZXRNb2RhbEtpbmQsIG9wZW5Nb2RhbEluamVjdGlvblRva2VuLCB1c2VSZXNwb25kRnJvbU1vZGFsLCB0eXBlIE1vZGFsUHJvcHMgfSBmcm9tIFwiQGs4c2xlbnMvbW9kYWwtY29udHJhY3RzXCI7XG5pbXBvcnQgeyBMYXlvdXRFZGl0b3JEaWFsb2cgfSBmcm9tIFwiLi9lZGl0b3ItZGlhbG9nXCI7XG5pbXBvcnQgdHlwZSB7IExheW91dFNldHRpbmdzLCBUYWJsZUNhdGFsb2cgfSBmcm9tIFwiLi9jb25maWcudHNcIjtcblxuY29uc3QgbGF5b3V0RWRpdG9yS2luZCA9IGdldE1vZGFsS2luZDxbdGFibGVzOiBUYWJsZUNhdGFsb2dbXSwgc2V0dGluZ3M6IExheW91dFNldHRpbmdzXSwgTGF5b3V0U2V0dGluZ3MgfCBudWxsPigpKFwibGF5b3V0LWVkaXRvclwiKTtcblxuY29uc3QgRWRpdG9yTW9kYWwgPSAoeyBpbnB1dDogW3RhYmxlcywgc2V0dGluZ3NdIH06IE1vZGFsUHJvcHM8dHlwZW9mIGxheW91dEVkaXRvcktpbmQ+KSA9PiB7XG4gIGNvbnN0IHJlc3BvbmQgPSB1c2VSZXNwb25kRnJvbU1vZGFsKGxheW91dEVkaXRvcktpbmQpO1xuICByZXR1cm4gPExheW91dEVkaXRvckRpYWxvZyB0YWJsZXM9e3RhYmxlc30gc2V0dGluZ3M9e3NldHRpbmdzfSBvbkFwcGx5PXsodmFsdWUpID0+IHJlc3BvbmQodmFsdWUpfSBvbkNhbmNlbD17KCkgPT4gcmVzcG9uZChudWxsKX0gLz47XG59O1xuXG5leHBvcnQgY29uc3QgbGF5b3V0RWRpdG9yTW9kYWxCdW5jaCA9IGdldE1vZGFsSW5qZWN0YWJsZUJ1bmNoKHsga2luZDogbGF5b3V0RWRpdG9yS2luZCwgQ29tcG9uZW50OiBFZGl0b3JNb2RhbCwgb25DbG9zZTogKCkgPT4gbnVsbCB9KTtcblxuZXhwb3J0IGNvbnN0IG9wZW5FZGl0b3JJbmplY3RhYmxlID0gZ2V0SW5qZWN0YWJsZTIoe1xuICBpZDogXCJsZW5zLXdvcmtsb2FkLXJvd3Mub3Blbi1lZGl0b3JcIixcbiAgY29uc3VtcHRpb25zOiBbb3Blbk1vZGFsSW5qZWN0aW9uVG9rZW5dLFxuICBpbnN0YW50aWF0ZTogKGRpKSA9PiB7XG4gICAgY29uc3Qgb3BlbiA9IGRpLmluamVjdChvcGVuTW9kYWxJbmplY3Rpb25Ub2tlbi5mb3IobGF5b3V0RWRpdG9yS2luZCkuZm9yKGRpLnNjb3BlSWRzKSkoKTtcbiAgICByZXR1cm4gKCkgPT4gb3BlbjtcbiAgfSxcbn0pO1xuIiwgImltcG9ydCB7IHVzZUlkIH0gZnJvbSBcInJlYWN0XCI7XG5pbXBvcnQgeyBMYXlvdXRFZGl0b3IsIHR5cGUgRWRpdG9yUHJvcHMgfSBmcm9tIFwiLi9lZGl0b3JcIjtcblxuLyoqIExlbnMgb3ducyB0aGUgb3ZlcmxheSBhbmQgbW9kYWwgbGlmZWN5Y2xlOyB0aGlzIGlzIG9ubHkgaXRzIGNvbnRlbnQgc2hlbGwuICovXG5leHBvcnQgY29uc3QgTGF5b3V0RWRpdG9yRGlhbG9nID0gKHByb3BzOiBFZGl0b3JQcm9wcykgPT4ge1xuICBjb25zdCB0aXRsZUlkID0gdXNlSWQoKTtcbiAgcmV0dXJuIDxzZWN0aW9uIGNsYXNzTmFtZT1cImx3ci1tb2RhbFwiIHJvbGU9XCJkaWFsb2dcIiBhcmlhLW1vZGFsPVwidHJ1ZVwiIGFyaWEtbGFiZWxsZWRieT17dGl0bGVJZH0+XG4gICAgPGhlYWRlciBjbGFzc05hbWU9XCJsd3ItbW9kYWwtaGVhZGVyXCI+XG4gICAgICA8aDIgaWQ9e3RpdGxlSWR9Pldvcmtsb2FkIGxheW91dDwvaDI+XG4gICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBhcmlhLWxhYmVsPVwiQ2xvc2UgbGF5b3V0IGVkaXRvclwiIG9uQ2xpY2s9e3Byb3BzLm9uQ2FuY2VsfT4mdGltZXM7PC9idXR0b24+XG4gICAgPC9oZWFkZXI+XG4gICAgPGRpdiBjbGFzc05hbWU9XCJsd3ItbW9kYWwtY29udGVudFwiPjxMYXlvdXRFZGl0b3Igey4uLnByb3BzfSAvPjwvZGl2PlxuICA8L3NlY3Rpb24+O1xufTtcbiIsICJpbXBvcnQgeyB1c2VTdGF0ZSwgdHlwZSBEcmFnRXZlbnQgfSBmcm9tIFwicmVhY3RcIjtcbmltcG9ydCB7IGRlZmF1bHRMYXlvdXQsIGRldGFpbEdyb3VwLCBpc1dhcm5pbmdJY29uLCBtb3ZlRmllbGQsIG5vcm1hbGl6ZSwgcmVzb2x2ZUxheW91dCwgdHlwZSBGaWVsZENvbmZpZywgdHlwZSBGaWVsZExpbmUsIHR5cGUgTGF5b3V0U2V0dGluZ3MsIHR5cGUgVGFibGVDYXRhbG9nLCB0eXBlIFRhYmxlTGF5b3V0IH0gZnJvbSBcIi4vY29uZmlnLnRzXCI7XG5cbmV4cG9ydCB0eXBlIEVkaXRvclByb3BzID0ge1xuICB0YWJsZXM6IFRhYmxlQ2F0YWxvZ1tdO1xuICBzZXR0aW5nczogTGF5b3V0U2V0dGluZ3M7XG4gIG9uQXBwbHk6IChzZXR0aW5nczogTGF5b3V0U2V0dGluZ3MpID0+IHZvaWQ7XG4gIG9uQ2FuY2VsOiAoKSA9PiB2b2lkO1xufTtcblxuY29uc3QgbGluZU5hbWVzOiBSZWNvcmQ8RmllbGRMaW5lLCBzdHJpbmc+ID0geyBwcmltYXJ5OiBcIkZpcnN0IGxpbmVcIiwgc2Vjb25kYXJ5OiBcIlNlY29uZCBsaW5lXCIsIGhpZGRlbjogXCJIaWRkZW5cIiB9O1xuY29uc3QgZXhhbXBsZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gIG5hbWU6IFwiZXhhbXBsZS1hcGktNjVkZjU2OWZmNi1hYmMxMlwiLCBuYW1lc3BhY2U6IFwiZXhhbXBsZS1hcHBcIiwgc3RhdHVzOiBcIlJ1bm5pbmdcIiwgcGhhc2U6IFwiUnVubmluZ1wiLFxuICBvd25lcnM6IFwiUmVwbGljYVNldFwiLCBjb250cm9sbGVkYnk6IFwiUmVwbGljYVNldFwiLCBhZ2U6IFwiMTloXCIsIGNwdTogXCIwLjAxMFwiLCBtZW1vcnk6IFwiMTQxLjEgTWlCXCIsXG4gIHJlc3RhcnRzOiBcIjZcIiwgbm9kZTogXCJ3b3JrZXItbm9kZS0wMVwiLCBxb3M6IFwiQnVyc3RhYmxlXCIsIGNvbnRhaW5lcnM6IFwiMS8xXCIsXG59O1xuXG5leHBvcnQgY29uc3QgTGF5b3V0RWRpdG9yID0gKHsgdGFibGVzLCBzZXR0aW5ncywgb25BcHBseSwgb25DYW5jZWwgfTogRWRpdG9yUHJvcHMpID0+IHtcbiAgY29uc3QgW3RhYmxlSWQsIHNldFRhYmxlSWRdID0gdXNlU3RhdGUodGFibGVzWzBdPy5pZCA/PyBcInBvZHNcIik7XG4gIGNvbnN0IFtkcmFmdHMsIHNldERyYWZ0c10gPSB1c2VTdGF0ZShzZXR0aW5ncy50YWJsZXMpO1xuICBjb25zdCBbZHJhZ2dlZCwgc2V0RHJhZ2dlZF0gPSB1c2VTdGF0ZTxzdHJpbmcgfCBudWxsPihudWxsKTtcbiAgY29uc3QgdGFibGUgPSB0YWJsZXMuZmluZCgoY2FuZGlkYXRlKSA9PiBjYW5kaWRhdGUuaWQgPT09IHRhYmxlSWQpID8/IHRhYmxlc1swXTtcbiAgaWYgKCF0YWJsZSkgcmV0dXJuIDxkaXYgY2xhc3NOYW1lPVwibHdyLWVkaXRvclwiPjxwPk9wZW4gYSB3b3JrbG9hZCBsaXN0IGZpcnN0LjwvcD48YnV0dG9uIG9uQ2xpY2s9e29uQ2FuY2VsfT5DbG9zZTwvYnV0dG9uPjwvZGl2PjtcbiAgY29uc3QgaWRzID0gdGFibGUuZmllbGRzLm1hcCgoZmllbGQpID0+IGZpZWxkLmlkKTtcbiAgY29uc3QgbGF5b3V0ID0gcmVzb2x2ZUxheW91dChpZHMsIGRyYWZ0c1t0YWJsZS5pZF0pO1xuICBjb25zdCBpbmZvID0gbmV3IE1hcCh0YWJsZS5maWVsZHMubWFwKChmaWVsZCkgPT4gW2ZpZWxkLmlkLCBmaWVsZF0pKTtcbiAgLy8gTGVucyBjYW4gdGVtcG9yYXJpbHkgb21pdCBjb2x1bW5zLiBLZWVwIHRoZWlyIHNhdmVkIGNvbmZpZ3VyYXRpb24gaW4gaXRzXG4gIC8vIGV4aXN0aW5nIHNsb3RzIHdoaWxlIHJlcGxhY2luZyB2aXNpYmxlIGZpZWxkcyB3aXRoIHRoZSBlZGl0b3IncyBuZXcgb3JkZXIuXG4gIGNvbnN0IHByZXNlcnZlVW5hdmFpbGFibGUgPSAobmV4dDogVGFibGVMYXlvdXQsIHByZXZpb3VzPzogVGFibGVMYXlvdXQpOiBUYWJsZUxheW91dCA9PiB7XG4gICAgY29uc3QgdmlzaWJsZSA9IG5ldyBTZXQoaWRzKTtcbiAgICBjb25zdCByZW1haW5pbmcgPSBbLi4ubmV4dC5maWVsZHNdO1xuICAgIGNvbnN0IGZpZWxkcyA9IChwcmV2aW91cz8uZmllbGRzID8/IFtdKS5mbGF0TWFwKChmaWVsZCkgPT4ge1xuICAgICAgaWYgKCF2aXNpYmxlLmhhcyhmaWVsZC5pZCkpIHJldHVybiBbZmllbGRdO1xuICAgICAgY29uc3QgcmVwbGFjZW1lbnQgPSByZW1haW5pbmcuc2hpZnQoKTtcbiAgICAgIHJldHVybiByZXBsYWNlbWVudCA/IFtyZXBsYWNlbWVudF0gOiBbXTtcbiAgICB9KTtcbiAgICByZXR1cm4geyAuLi5uZXh0LCBmaWVsZHM6IFsuLi5maWVsZHMsIC4uLnJlbWFpbmluZ10gfTtcbiAgfTtcbiAgY29uc3QgdXBkYXRlID0gKG5leHQ6IFRhYmxlTGF5b3V0KSA9PiBzZXREcmFmdHMoKHByZXZpb3VzKSA9PiAoeyAuLi5wcmV2aW91cywgW3RhYmxlLmlkXTogcHJlc2VydmVVbmF2YWlsYWJsZShuZXh0LCBwcmV2aW91c1t0YWJsZS5pZF0pIH0pKTtcbiAgY29uc3QgbW92ZSA9IChpZDogc3RyaW5nLCBsaW5lOiBGaWVsZExpbmUsIGJlZm9yZT86IHN0cmluZykgPT4gdXBkYXRlKG1vdmVGaWVsZChsYXlvdXQsIGlkLCBsaW5lLCBiZWZvcmUpKTtcblxuICBmdW5jdGlvbiBkcm9wKGV2ZW50OiBEcmFnRXZlbnQsIGxpbmU6IEZpZWxkTGluZSwgYmVmb3JlPzogc3RyaW5nKSB7XG4gICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICBldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbiAgICBjb25zdCBpZCA9IGV2ZW50LmRhdGFUcmFuc2Zlci5nZXREYXRhKFwidGV4dC9wbGFpblwiKSB8fCBkcmFnZ2VkO1xuICAgIGlmIChpZCAmJiBpZHMuaW5jbHVkZXMoaWQpKSBtb3ZlKGlkLCBsaW5lLCBiZWZvcmUpO1xuICAgIHNldERyYWdnZWQobnVsbCk7XG4gIH1cblxuICBmdW5jdGlvbiBudWRnZShmaWVsZDogRmllbGRDb25maWcsIGRpcmVjdGlvbjogLTEgfCAxKSB7XG4gICAgY29uc3QgcGVlcnMgPSBsYXlvdXQuZmllbGRzLmZpbHRlcigoY2FuZGlkYXRlKSA9PiBjYW5kaWRhdGUubGluZSA9PT0gZmllbGQubGluZSk7XG4gICAgY29uc3QgaW5kZXggPSBwZWVycy5maW5kSW5kZXgoKGNhbmRpZGF0ZSkgPT4gY2FuZGlkYXRlLmlkID09PSBmaWVsZC5pZCk7XG4gICAgaWYgKGRpcmVjdGlvbiA9PT0gLTEgJiYgaW5kZXggPiAwKSBtb3ZlKGZpZWxkLmlkLCBmaWVsZC5saW5lLCBwZWVyc1tpbmRleCAtIDFdLmlkKTtcbiAgICBpZiAoZGlyZWN0aW9uID09PSAxICYmIGluZGV4IDwgcGVlcnMubGVuZ3RoIC0gMSkgbW92ZShmaWVsZC5pZCwgZmllbGQubGluZSwgcGVlcnNbaW5kZXggKyAyXT8uaWQpO1xuICB9XG5cbiAgZnVuY3Rpb24gZmllbGRDYXJkKGZpZWxkOiBGaWVsZENvbmZpZykge1xuICAgIGNvbnN0IGxhYmVsID0gaW5mby5nZXQoZmllbGQuaWQpPy5sYWJlbCA/PyBmaWVsZC5pZDtcbiAgICBjb25zdCBwZWVycyA9IGxheW91dC5maWVsZHMuZmlsdGVyKChjYW5kaWRhdGUpID0+IGNhbmRpZGF0ZS5saW5lID09PSBmaWVsZC5saW5lKTtcbiAgICBjb25zdCBpbmRleCA9IHBlZXJzLmZpbmRJbmRleCgoY2FuZGlkYXRlKSA9PiBjYW5kaWRhdGUuaWQgPT09IGZpZWxkLmlkKTtcbiAgICByZXR1cm4gKFxuICAgICAgPGRpdiBjbGFzc05hbWU9e2Bsd3ItZmllbGQgJHtkcmFnZ2VkID09PSBmaWVsZC5pZCA/IFwibHdyLWRyYWdnaW5nXCIgOiBcIlwifWB9IGtleT17ZmllbGQuaWR9XG4gICAgICAgIGRyYWdnYWJsZSBvbkRyYWdTdGFydD17KGV2ZW50KSA9PiB7IGV2ZW50LmRhdGFUcmFuc2Zlci5zZXREYXRhKFwidGV4dC9wbGFpblwiLCBmaWVsZC5pZCk7IGV2ZW50LmRhdGFUcmFuc2Zlci5lZmZlY3RBbGxvd2VkID0gXCJtb3ZlXCI7IHNldERyYWdnZWQoZmllbGQuaWQpOyB9fVxuICAgICAgICBvbkRyYWdFbmQ9eygpID0+IHNldERyYWdnZWQobnVsbCl9IG9uRHJhZ092ZXI9eyhldmVudCkgPT4gZXZlbnQucHJldmVudERlZmF1bHQoKX0gb25Ecm9wPXsoZXZlbnQpID0+IGRyb3AoZXZlbnQsIGZpZWxkLmxpbmUsIGZpZWxkLmlkKX0+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibHdyLWZpZWxkLXRpdGxlXCI+PHNwYW4gY2xhc3NOYW1lPVwibHdyLWdyaXBcIiBhcmlhLWhpZGRlbj1cInRydWVcIj5cdTIyRUVcdTIyRUU8L3NwYW4+PHN0cm9uZz57bGFiZWx9PC9zdHJvbmc+PC9kaXY+XG4gICAgICAgIDxkaXYgY2xhc3NOYW1lPVwibHdyLWZpZWxkLWFjdGlvbnNcIj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBhcmlhLWxhYmVsPXtgTW92ZSAke2xhYmVsfSBsZWZ0YH0gZGlzYWJsZWQ9e2luZGV4ID09PSAwfSBvbkNsaWNrPXsoKSA9PiBudWRnZShmaWVsZCwgLTEpfT5cdTIxOTA8L2J1dHRvbj5cbiAgICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBhcmlhLWxhYmVsPXtgTW92ZSAke2xhYmVsfSByaWdodGB9IGRpc2FibGVkPXtpbmRleCA9PT0gcGVlcnMubGVuZ3RoIC0gMX0gb25DbGljaz17KCkgPT4gbnVkZ2UoZmllbGQsIDEpfT5cdTIxOTI8L2J1dHRvbj5cbiAgICAgICAgICA8c2VsZWN0IGFyaWEtbGFiZWw9e2BMaW5lIGZvciAke2xhYmVsfWB9IHZhbHVlPXtmaWVsZC5saW5lfSBvbkNoYW5nZT17KGV2ZW50KSA9PiBtb3ZlKGZpZWxkLmlkLCBldmVudC50YXJnZXQudmFsdWUgYXMgRmllbGRMaW5lKX0+XG4gICAgICAgICAgICA8b3B0aW9uIHZhbHVlPVwicHJpbWFyeVwiPntpc1dhcm5pbmdJY29uKGZpZWxkLmlkKSA/IFwiQmVzaWRlIG5hbWVcIiA6IFwiRmlyc3QgbGluZVwifTwvb3B0aW9uPlxuICAgICAgICAgICAgeyFpc1dhcm5pbmdJY29uKGZpZWxkLmlkKSAmJiA8b3B0aW9uIHZhbHVlPVwic2Vjb25kYXJ5XCI+U2Vjb25kIGxpbmU8L29wdGlvbj59XG4gICAgICAgICAgICA8b3B0aW9uIHZhbHVlPVwiaGlkZGVuXCIgZGlzYWJsZWQ9e25vcm1hbGl6ZShmaWVsZC5pZCkgPT09IFwibmFtZVwifT5IaWRkZW48L29wdGlvbj5cbiAgICAgICAgICA8L3NlbGVjdD5cbiAgICAgICAgPC9kaXY+XG4gICAgICAgIHtmaWVsZC5saW5lICE9PSBcImhpZGRlblwiICYmICFpc1dhcm5pbmdJY29uKGZpZWxkLmlkKSAmJiA8bGFiZWwgY2xhc3NOYW1lPVwibHdyLXdpZHRoXCI+e2xheW91dC5hdXRvU2Vjb25kYXJ5ICYmIGZpZWxkLmxpbmUgPT09IFwic2Vjb25kYXJ5XCIgPyBcIkF1dG9tYXRpYyB3aWR0aFwiIDogXCJXaWR0aFwifVxuICAgICAgICAgIDxpbnB1dCB0eXBlPVwicmFuZ2VcIiBtaW49XCIxXCIgbWF4PVwiNDhcIiB2YWx1ZT17ZmllbGQud2lkdGh9IGRpc2FibGVkPXtsYXlvdXQuYXV0b1NlY29uZGFyeSAmJiBmaWVsZC5saW5lID09PSBcInNlY29uZGFyeVwifSBhcmlhLWxhYmVsPXtgV2lkdGggZm9yICR7bGFiZWx9YH1cbiAgICAgICAgICAgIG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZSh7IC4uLmxheW91dCwgZmllbGRzOiBsYXlvdXQuZmllbGRzLm1hcCgoY2FuZGlkYXRlKSA9PiBjYW5kaWRhdGUuaWQgPT09IGZpZWxkLmlkID8geyAuLi5jYW5kaWRhdGUsIHdpZHRoOiBOdW1iZXIoZXZlbnQudGFyZ2V0LnZhbHVlKSB9IDogY2FuZGlkYXRlKSB9KX0gLz5cbiAgICAgICAgICA8b3V0cHV0PntmaWVsZC53aWR0aH08L291dHB1dD5cbiAgICAgICAgPC9sYWJlbD59XG4gICAgICA8L2Rpdj5cbiAgICApO1xuICB9XG5cbiAgZnVuY3Rpb24gcHJldmlld0xpbmUobGluZTogXCJwcmltYXJ5XCIgfCBcInNlY29uZGFyeVwiKSB7XG4gICAgY29uc3QgZmllbGRzID0gbGF5b3V0LmZpZWxkcy5maWx0ZXIoKGZpZWxkKSA9PiBmaWVsZC5saW5lID09PSBsaW5lICYmICFpc1dhcm5pbmdJY29uKGZpZWxkLmlkKSk7XG4gICAgY29uc3QgYXV0byA9IGxpbmUgPT09IFwic2Vjb25kYXJ5XCIgJiYgbGF5b3V0LmF1dG9TZWNvbmRhcnk7XG4gICAgcmV0dXJuIDxkaXYgY2xhc3NOYW1lPXtgbHdyLXByZXZpZXctbGluZSBsd3ItcHJldmlldy0ke2xpbmV9ICR7YXV0byA/IFwibHdyLXByZXZpZXctYXV0b1wiIDogXCJcIn1gfSBzdHlsZT17eyBncmlkVGVtcGxhdGVDb2x1bW5zOiBhdXRvID8gdW5kZWZpbmVkIDogZmllbGRzLm1hcCgoZmllbGQpID0+IGBtaW5tYXgoMCwgJHtmaWVsZC53aWR0aH1mcilgKS5qb2luKFwiIFwiKSB9fT5cbiAgICAgIHtmaWVsZHMubWFwKChmaWVsZCwgaW5kZXgpID0+IHtcbiAgICAgICAgY29uc3QgY29sdW1uID0gaW5mby5nZXQoZmllbGQuaWQpO1xuICAgICAgICBjb25zdCBzYW1wbGUgPSBjb2x1bW4/LnNhbXBsZSB8fCBleGFtcGxlc1tub3JtYWxpemUoZmllbGQuaWQpXSB8fCBcIlx1MjAxNFwiO1xuICAgICAgICBjb25zdCBzdGF0dXNDbGFzcyA9IFtcInN0YXR1c1wiLCBcInBoYXNlXCJdLmluY2x1ZGVzKG5vcm1hbGl6ZShmaWVsZC5pZCkpXG4gICAgICAgICAgPyAvZmFpbGVkfGVycm9yfGNyYXNofGJhY2tvZmYvaS50ZXN0KHNhbXBsZSkgPyBcImx3ci1wcmV2aWV3LWVycm9yXCIgOiAvcnVubmluZ3xyZWFkeXxoZWFsdGh5fHN1Y2NlZWRlZC9pLnRlc3Qoc2FtcGxlKSA/IFwibHdyLXByZXZpZXctc3RhdHVzXCIgOiBcIlwiXG4gICAgICAgICAgOiBcIlwiO1xuICAgICAgICBjb25zdCBncm91cFN0YXJ0ID0gbGluZSA9PT0gXCJzZWNvbmRhcnlcIiAmJiBpbmRleCA+IDAgJiYgZGV0YWlsR3JvdXAoZmllbGQuaWQpICE9PSBkZXRhaWxHcm91cChmaWVsZHNbaW5kZXggLSAxXS5pZCk7XG4gICAgICAgIHJldHVybiA8ZGl2IGNsYXNzTmFtZT17YGx3ci1wcmV2aWV3LXZhbHVlICR7Z3JvdXBTdGFydCA/IFwibHdyLXByZXZpZXctZ3JvdXBcIiA6IFwiXCJ9YH0ga2V5PXtmaWVsZC5pZH0gdGl0bGU9e2Ake2NvbHVtbj8ubGFiZWx9OiAke3NhbXBsZX1gfT5cbiAgICAgICAgICB7KGxpbmUgPT09IFwicHJpbWFyeVwiIHx8IGxheW91dC5sYWJlbHMgfHwgYXV0bykgJiYgPHNwYW4gY2xhc3NOYW1lPVwibHdyLXByZXZpZXctbGFiZWxcIj57Y29sdW1uPy5sYWJlbH08L3NwYW4+fVxuICAgICAgICAgIDxzcGFuIGNsYXNzTmFtZT17YCR7bm9ybWFsaXplKGZpZWxkLmlkKSA9PT0gXCJuYW1lXCIgPyBcImx3ci1wcmV2aWV3LW5hbWVcIiA6IFwiXCJ9ICR7c3RhdHVzQ2xhc3N9YH0+e3NhbXBsZX08L3NwYW4+XG4gICAgICAgIDwvZGl2PjtcbiAgICAgIH0pfVxuICAgICAgeyFmaWVsZHMubGVuZ3RoICYmIDxzcGFuIGNsYXNzTmFtZT1cImx3ci1lbXB0eS1saW5lXCI+Tm8gZmllbGRzIG9uIHRoaXMgbGluZTwvc3Bhbj59XG4gICAgPC9kaXY+O1xuICB9XG5cbiAgcmV0dXJuIDxkaXYgY2xhc3NOYW1lPVwibHdyLWVkaXRvclwiPlxuICAgIDxkaXYgY2xhc3NOYW1lPVwibHdyLWVkaXRvci10b29sYmFyXCI+XG4gICAgICA8bGFiZWw+VmlldyA8c2VsZWN0IGFyaWEtbGFiZWw9XCJXb3JrbG9hZCB2aWV3XCIgdmFsdWU9e3RhYmxlLmlkfSBvbkNoYW5nZT17KGV2ZW50KSA9PiB7IHNldFRhYmxlSWQoZXZlbnQudGFyZ2V0LnZhbHVlKTsgc2V0RHJhZ2dlZChudWxsKTsgfX0+XG4gICAgICAgIHt0YWJsZXMubWFwKChjYW5kaWRhdGUpID0+IDxvcHRpb24ga2V5PXtjYW5kaWRhdGUuaWR9IHZhbHVlPXtjYW5kaWRhdGUuaWR9PntjYW5kaWRhdGUuaWQucmVwbGFjZSgvLS9nLCBcIiBcIil9PC9vcHRpb24+KX1cbiAgICAgIDwvc2VsZWN0PjwvbGFiZWw+XG4gICAgICA8ZGl2IGNsYXNzTmFtZT1cImx3ci1wcmVzZXRzXCI+PHNwYW4+U3RhcnQgZnJvbTwvc3Bhbj5cbiAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gdXBkYXRlKGRlZmF1bHRMYXlvdXQoaWRzLCBcImJhbGFuY2VkXCIpKX0+QmFsYW5jZWQ8L2J1dHRvbj5cbiAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gdXBkYXRlKGRlZmF1bHRMYXlvdXQoaWRzLCBcInRyb3VibGVzaG9vdGluZ1wiKSl9PlRyb3VibGVzaG9vdGluZzwvYnV0dG9uPlxuICAgICAgICA8YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXsoKSA9PiB1cGRhdGUoZGVmYXVsdExheW91dChpZHMsIFwiYWxsXCIpKX0+QWxsIGZpZWxkczwvYnV0dG9uPlxuICAgICAgPC9kaXY+XG4gICAgPC9kaXY+XG4gICAgPGRpdiBjbGFzc05hbWU9XCJsd3ItcHJldmlld1wiIGFyaWEtbGFiZWw9XCJMYXlvdXQgcHJldmlld1wiPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJsd3Itc2VjdGlvbi1sYWJlbFwiPkxpdmUgcHJldmlldzwvZGl2PlxuICAgICAge3ByZXZpZXdMaW5lKFwicHJpbWFyeVwiKX17cHJldmlld0xpbmUoXCJzZWNvbmRhcnlcIil9XG4gICAgPC9kaXY+XG4gICAgPHAgY2xhc3NOYW1lPVwibHdyLWhlbHBcIj5EcmFnIGZpZWxkcyBiZXR3ZWVuIGxpbmVzIG9yIGNoYW5nZSB0aGVpciBkcm9wZG93bi4gQXJyb3dzIGNoYW5nZSBvcmRlci4gV2lkdGggc2hhcmVzIHNwYWNlIHdpdGhpbiBlYWNoIGxpbmUuPC9wPlxuICAgIDxkaXYgY2xhc3NOYW1lPVwibHdyLWxhbmVzXCI+XG4gICAgICB7KFtcInByaW1hcnlcIiwgXCJzZWNvbmRhcnlcIl0gYXMgY29uc3QpLm1hcCgobGluZSkgPT4gPHNlY3Rpb24gY2xhc3NOYW1lPXtgbHdyLWxhbmUgJHtkcmFnZ2VkID8gXCJsd3ItZHJvcC1yZWFkeVwiIDogXCJcIn1gfSBrZXk9e2xpbmV9XG4gICAgICAgIGFyaWEtbGFiZWw9e2xpbmVOYW1lc1tsaW5lXX0gb25EcmFnT3Zlcj17KGV2ZW50KSA9PiBldmVudC5wcmV2ZW50RGVmYXVsdCgpfSBvbkRyb3A9eyhldmVudCkgPT4gZHJvcChldmVudCwgbGluZSl9PlxuICAgICAgICA8aDM+e2xpbmVOYW1lc1tsaW5lXX0gPHNwYW4+e2xheW91dC5maWVsZHMuZmlsdGVyKChmaWVsZCkgPT4gZmllbGQubGluZSA9PT0gbGluZSkubGVuZ3RofTwvc3Bhbj48L2gzPlxuICAgICAgICB7bGF5b3V0LmZpZWxkcy5maWx0ZXIoKGZpZWxkKSA9PiBmaWVsZC5saW5lID09PSBsaW5lKS5tYXAoZmllbGRDYXJkKX1cbiAgICAgICAgeyFsYXlvdXQuZmllbGRzLnNvbWUoKGZpZWxkKSA9PiBmaWVsZC5saW5lID09PSBsaW5lKSAmJiA8cCBjbGFzc05hbWU9XCJsd3ItZW1wdHktbGluZVwiPkRyb3AgYSBmaWVsZCBoZXJlPC9wPn1cbiAgICAgIDwvc2VjdGlvbj4pfVxuICAgIDwvZGl2PlxuICAgIDxzZWN0aW9uIGNsYXNzTmFtZT1cImx3ci1oaWRkZW5cIiBhcmlhLWxhYmVsPVwiSGlkZGVuIGZpZWxkc1wiIG9uRHJhZ092ZXI9eyhldmVudCkgPT4gZXZlbnQucHJldmVudERlZmF1bHQoKX0gb25Ecm9wPXsoZXZlbnQpID0+IGRyb3AoZXZlbnQsIFwiaGlkZGVuXCIpfT5cbiAgICAgIDxoMz5IaWRkZW4gPHNwYW4+e2xheW91dC5maWVsZHMuZmlsdGVyKChmaWVsZCkgPT4gZmllbGQubGluZSA9PT0gXCJoaWRkZW5cIikubGVuZ3RofTwvc3Bhbj48L2gzPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJsd3ItaGlkZGVuLWxpc3RcIj57bGF5b3V0LmZpZWxkcy5maWx0ZXIoKGZpZWxkKSA9PiBmaWVsZC5saW5lID09PSBcImhpZGRlblwiKS5tYXAoZmllbGRDYXJkKX08L2Rpdj5cbiAgICAgIHshbGF5b3V0LmZpZWxkcy5zb21lKChmaWVsZCkgPT4gZmllbGQubGluZSA9PT0gXCJoaWRkZW5cIikgJiYgPHAgY2xhc3NOYW1lPVwibHdyLWVtcHR5LWxpbmVcIj5Ecm9wIGZpZWxkcyBoZXJlIHRvIGhpZGUgdGhlbTwvcD59XG4gICAgPC9zZWN0aW9uPlxuICAgIDxkaXYgY2xhc3NOYW1lPVwibHdyLWVkaXRvci1vcHRpb25zXCI+PGxhYmVsPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBhcmlhLWxhYmVsPVwiQXV0byB3aWR0aCBmb3Igc2Vjb25kIGxpbmVcIiBjaGVja2VkPXtsYXlvdXQuYXV0b1NlY29uZGFyeX0gb25DaGFuZ2U9eyhldmVudCkgPT4gdXBkYXRlKHsgLi4ubGF5b3V0LCBhdXRvU2Vjb25kYXJ5OiBldmVudC50YXJnZXQuY2hlY2tlZCB9KX0gLz4gQXV0byB3aWR0aCBmb3Igc2Vjb25kIGxpbmU8L2xhYmVsPlxuICAgICAgPGxhYmVsPjxpbnB1dCB0eXBlPVwiY2hlY2tib3hcIiBjaGVja2VkPXtsYXlvdXQubGFiZWxzIHx8IGxheW91dC5hdXRvU2Vjb25kYXJ5fSBkaXNhYmxlZD17bGF5b3V0LmF1dG9TZWNvbmRhcnl9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZSh7IC4uLmxheW91dCwgbGFiZWxzOiBldmVudC50YXJnZXQuY2hlY2tlZCB9KX0gLz4gTGFiZWwgZGV0YWlsIHZhbHVlczwvbGFiZWw+XG4gICAgICA8c3Bhbj5MYXlvdXRzIHNhdmUgcGVyIHdvcmtsb2FkIHR5cGUuIEZpZWxkcyBoaWRkZW4gaW4gTGVuc1x1MjAxOXMgY29sdW1uIG1lbnUgc3RheSBoaWRkZW4uPC9zcGFuPlxuICAgIDwvZGl2PlxuICAgIHtsYXlvdXQuYXV0b1NlY29uZGFyeSAmJiA8cCBjbGFzc05hbWU9XCJsd3ItaGVscFwiPkRldGFpbCBmaWVsZHMgZml0IHRoZWlyIHRleHQgaW4gZWFjaCByb3cuIExvbmcgdmFsdWVzIHNocmluayB3aGVuIHNwYWNlIGlzIGxpbWl0ZWQuIE1hbnVhbCB3aWR0aHMgYXJlIGtlcHQgZm9yIHdoZW4geW91IHN3aXRjaCB0aGlzIG9mZi48L3A+fVxuICAgIDxkaXYgY2xhc3NOYW1lPVwibHdyLWVkaXRvci1mb290ZXJcIj48YnV0dG9uIHR5cGU9XCJidXR0b25cIiBvbkNsaWNrPXtvbkNhbmNlbH0+Q2FuY2VsPC9idXR0b24+PGJ1dHRvbiBjbGFzc05hbWU9XCJsd3ItYXBwbHlcIiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gb25BcHBseSh7IC4uLnNldHRpbmdzLCB0YWJsZXM6IHsgLi4uZHJhZnRzLCBbdGFibGUuaWRdOiBwcmVzZXJ2ZVVuYXZhaWxhYmxlKGxheW91dCwgZHJhZnRzW3RhYmxlLmlkXSkgfSB9KX0+QXBwbHkgbGF5b3V0PC9idXR0b24+PC9kaXY+XG4gIDwvZGl2Pjtcbn07XG4iLCAiZXhwb3J0IGNvbnN0IGVkaXRvckNzcyA9IGBcbi5sd3ItbW9kYWwgeyB3aWR0aDogbWluKDEwMjBweCwgY2FsYygxMDB2dyAtIDQ4cHgpKTsgbWF4LWhlaWdodDogY2FsYygxMDB2aCAtIDQ4cHgpOyBkaXNwbGF5OiBmbGV4OyBmbGV4LWRpcmVjdGlvbjogY29sdW1uOyBvdmVyZmxvdzogaGlkZGVuOyBib3gtc2l6aW5nOiBib3JkZXItYm94OyBiYWNrZ3JvdW5kOiB2YXIoLS1jb250ZW50Q29sb3IsICNmZmYpOyBjb2xvcjogdmFyKC0tdGV4dENvbG9yUHJpbWFyeSwgIzI2MzU0OCk7IGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLWJvcmRlckNvbG9yLCAjY2FkNGRmKTsgYm9yZGVyLXJhZGl1czogMTBweDsgfVxuLmx3ci1tb2RhbC1oZWFkZXIgeyBkaXNwbGF5OiBmbGV4OyBhbGlnbi1pdGVtczogY2VudGVyOyBnYXA6IDEycHg7IHBhZGRpbmc6IDEycHggMTZweDsgYm9yZGVyLWJvdHRvbTogMXB4IHNvbGlkIHZhcigtLWJvcmRlckNvbG9yLCAjY2FkNGRmKTsgZmxleC1zaHJpbms6IDA7IH1cbi5sd3ItbW9kYWwtaGVhZGVyIGgyIHsgZmxleDogMTsgbWFyZ2luOiAwOyBmb250OiA2MDAgMTRweC8xLjQgc3lzdGVtLXVpLCBzYW5zLXNlcmlmOyB0ZXh0LWFsaWduOiBjZW50ZXI7IH1cbi5sd3ItbW9kYWwtaGVhZGVyIGJ1dHRvbiB7IGJvcmRlcjogMDsgcGFkZGluZzogMCA0cHg7IGJhY2tncm91bmQ6IHRyYW5zcGFyZW50OyBjb2xvcjogaW5oZXJpdDsgZm9udDogMjRweC8xIHN5c3RlbS11aSwgc2Fucy1zZXJpZjsgY3Vyc29yOiBwb2ludGVyOyB9XG4ubHdyLW1vZGFsLWhlYWRlciBidXR0b246Zm9jdXMtdmlzaWJsZSB7IG91dGxpbmU6IDJweCBzb2xpZCB2YXIoLS1wcmltYXJ5LCAjMjg3NGQwKTsgb3V0bGluZS1vZmZzZXQ6IDJweDsgfVxuLmx3ci1tb2RhbC1jb250ZW50IHsgbWluLWhlaWdodDogMDsgcGFkZGluZzogMjRweDsgb3ZlcmZsb3c6IGF1dG87IH1cbi5sd3ItZWRpdG9yIHsgY29sb3I6IHZhcigtLXRleHRDb2xvclByaW1hcnksICMyNjM1NDgpOyBmb250OiAxM3B4LzEuNDUgc3lzdGVtLXVpLCBzYW5zLXNlcmlmOyB9XG4ubHdyLWVkaXRvciAqLCAubHdyLWVkaXRvciAqOjpiZWZvcmUsIC5sd3ItZWRpdG9yICo6OmFmdGVyIHsgYm94LXNpemluZzogYm9yZGVyLWJveDsgfVxuLmx3ci1lZGl0b3IgYnV0dG9uLCAubHdyLWVkaXRvciBzZWxlY3QgeyBmb250OiBpbmhlcml0OyBjb2xvcjogaW5oZXJpdDsgYmFja2dyb3VuZDogdmFyKC0tY29udGVudENvbG9yLCAjZmZmKTsgYm9yZGVyOiAxcHggc29saWQgdmFyKC0tYm9yZGVyQ29sb3IsICNjYWQ0ZGYpOyBib3JkZXItcmFkaXVzOiA2cHg7IHBhZGRpbmc6IDVweCA5cHg7IGN1cnNvcjogcG9pbnRlcjsgfVxuLmx3ci1lZGl0b3IgYnV0dG9uOmhvdmVyIHsgYmFja2dyb3VuZDogdmFyKC0tdGFibGVCZ2NTZWxlY3RlZCwgI2VhZjFmYSk7IH1cbi5sd3ItZWRpdG9yIGJ1dHRvbjpkaXNhYmxlZCB7IG9wYWNpdHk6IC4zNTsgY3Vyc29yOiBkZWZhdWx0OyB9XG4ubHdyLWVkaXRvciBidXR0b246Zm9jdXMtdmlzaWJsZSwgLmx3ci1lZGl0b3Igc2VsZWN0OmZvY3VzLXZpc2libGUsIC5sd3ItZWRpdG9yIGlucHV0OmZvY3VzLXZpc2libGUgeyBvdXRsaW5lOiAycHggc29saWQgdmFyKC0tcHJpbWFyeSwgIzI4NzRkMCk7IG91dGxpbmUtb2Zmc2V0OiAycHg7IH1cbi5sd3ItZWRpdG9yLXRvb2xiYXIgeyBkaXNwbGF5OiBmbGV4OyBmbGV4LXdyYXA6IHdyYXA7IGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2VlbjsgYWxpZ24taXRlbXM6IGNlbnRlcjsgZ2FwOiAxMnB4OyBtYXJnaW4tYm90dG9tOiAxNnB4OyB9XG4ubHdyLWVkaXRvci10b29sYmFyIGxhYmVsIHsgZGlzcGxheTogZmxleDsgYWxpZ24taXRlbXM6IGNlbnRlcjsgZ2FwOiA4cHg7IGZvbnQtd2VpZ2h0OiA2MDA7IH1cbi5sd3ItcHJlc2V0cyB7IGRpc3BsYXk6IGZsZXg7IGZsZXgtd3JhcDogd3JhcDsgYWxpZ24taXRlbXM6IGNlbnRlcjsgZ2FwOiA2cHg7IH1cbi5sd3ItcHJlc2V0cyA+IHNwYW4sIC5sd3ItaGVscCwgLmx3ci1lbXB0eS1saW5lIHsgY29sb3I6IHZhcigtLXRleHRDb2xvclNlY29uZGFyeSwgIzc1ODM5OSk7IH1cbi5sd3ItcHJldmlldyB7IGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLWJvcmRlckNvbG9yLCAjY2FkNGRmKTsgYm9yZGVyLXJhZGl1czogMTBweDsgb3ZlcmZsb3c6IGhpZGRlbjsgYmFja2dyb3VuZDogdmFyKC0tY29udGVudENvbG9yLCAjZmZmKTsgfVxuLmx3ci1zZWN0aW9uLWxhYmVsIHsgdGV4dC10cmFuc2Zvcm06IHVwcGVyY2FzZTsgbGV0dGVyLXNwYWNpbmc6IC4wOGVtOyBmb250LXNpemU6IDEwcHg7IGZvbnQtd2VpZ2h0OiA3MDA7IGNvbG9yOiB2YXIoLS10ZXh0Q29sb3JTZWNvbmRhcnksICM3NTgzOTkpOyBwYWRkaW5nOiAxMHB4IDE0cHggMDsgfVxuLmx3ci1wcmV2aWV3LWxpbmUgeyBkaXNwbGF5OiBncmlkOyBnYXA6IDE0cHg7IHBhZGRpbmc6IDEwcHggMTRweDsgbWluLWhlaWdodDogNDVweDsgfVxuLmx3ci1wcmV2aWV3LXByaW1hcnkgeyBiYWNrZ3JvdW5kOiBjb2xvci1taXgoaW4gc3JnYiwgdmFyKC0tdGV4dENvbG9yUHJpbWFyeSwgIzY0NzQ4YikgMyUsIHZhcigtLWNvbnRlbnRDb2xvciwgI2ZmZikpOyB9XG4ubHdyLXByZXZpZXctc2Vjb25kYXJ5IHsgYm9yZGVyLXRvcDogMXB4IHNvbGlkIHZhcigtLWJvcmRlckNvbG9yLCAjZTRlYWYxKTsgYmFja2dyb3VuZDogdmFyKC0tY29udGVudENvbG9yLCAjZmZmKTsgfVxuLmx3ci1wcmV2aWV3LXNlY29uZGFyeSAubHdyLXByZXZpZXctdmFsdWUgeyBmbGV4LWRpcmVjdGlvbjogcm93OyBhbGlnbi1pdGVtczogY2VudGVyOyBnYXA6IDZweDsgfVxuLmx3ci1wcmV2aWV3LXNlY29uZGFyeSAubHdyLXByZXZpZXctbGFiZWwgeyBmbGV4LXNocmluazogMDsgbWFyZ2luLWJvdHRvbTogMDsgfVxuLmx3ci1wcmV2aWV3LXNlY29uZGFyeSAubHdyLXByZXZpZXctZ3JvdXAgeyBib3JkZXItaW5saW5lLXN0YXJ0OiAxcHggc29saWQgdmFyKC0tYm9yZGVyQ29sb3IsICNjYmQ1ZTEpOyBwYWRkaW5nLWlubGluZS1zdGFydDogMTRweDsgfVxuLmx3ci1wcmV2aWV3LWF1dG8geyBkaXNwbGF5OiBmbGV4OyBnYXA6IDEycHg7IG92ZXJmbG93OiBoaWRkZW47IH1cbi5sd3ItcHJldmlldy1hdXRvIC5sd3ItcHJldmlldy12YWx1ZSB7IGZsZXg6IDAgMSBhdXRvOyB9XG4ubHdyLXByZXZpZXctYXV0byAubHdyLXByZXZpZXctdmFsdWU6aGFzKC5sd3ItcHJldmlldy1uYW1lKSB7IG1pbi13aWR0aDogODBweDsgfVxuLmx3ci1wcmV2aWV3LXNlY29uZGFyeSAubHdyLXByZXZpZXctc3RhdHVzLCAubHdyLXByZXZpZXctcHJpbWFyeSAubHdyLXByZXZpZXctc3RhdHVzLFxuLmx3ci1wcmV2aWV3LXNlY29uZGFyeSAubHdyLXByZXZpZXctZXJyb3IsIC5sd3ItcHJldmlldy1wcmltYXJ5IC5sd3ItcHJldmlldy1lcnJvciB7IGFsaWduLXNlbGY6IGZsZXgtc3RhcnQ7IGJvcmRlci1yYWRpdXM6IDk5OXB4OyBwYWRkaW5nOiAxcHggN3B4OyBiYWNrZ3JvdW5kOiBjb2xvci1taXgoaW4gc3JnYiwgY3VycmVudENvbG9yIDklLCB0cmFuc3BhcmVudCk7IH1cbi5sd3ItcHJldmlldy12YWx1ZSB7IG1pbi13aWR0aDogMDsgb3ZlcmZsb3c6IGhpZGRlbjsgZGlzcGxheTogZmxleDsgZmxleC1kaXJlY3Rpb246IGNvbHVtbjsgfVxuLmx3ci1wcmV2aWV3LXZhbHVlID4gc3BhbiB7IG92ZXJmbG93OiBoaWRkZW47IHRleHQtb3ZlcmZsb3c6IGVsbGlwc2lzOyB3aGl0ZS1zcGFjZTogbm93cmFwOyB9XG4ubHdyLXByZXZpZXctbGFiZWwgeyBjb2xvcjogdmFyKC0tdGV4dENvbG9yU2Vjb25kYXJ5LCAjNzU4Mzk5KTsgZm9udC1zaXplOiAxMHB4OyBtYXJnaW4tYm90dG9tOiAzcHg7IH1cbi5sd3ItcHJldmlldy1uYW1lIHsgZm9udC13ZWlnaHQ6IDY1MDsgfVxuLmx3ci1wcmV2aWV3LXN0YXR1cyB7IGNvbG9yOiB2YXIoLS1jb2xvck9rLCAjMjU4MjRmKTsgfVxuLmx3ci1wcmV2aWV3LWVycm9yIHsgY29sb3I6IHZhcigtLWNvbG9yRXJyb3IsICNjZjNmNGIpOyB9XG4ubHdyLWhlbHAgeyBtYXJnaW46IDEycHggMDsgZm9udC1zaXplOiAxMnB4OyB9XG4ubHdyLWxhbmVzIHsgZGlzcGxheTogZ3JpZDsgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiAxZnIgMWZyOyBnYXA6IDEycHg7IG1heC1oZWlnaHQ6IDM3dmg7IG1pbi1oZWlnaHQ6IDEyMHB4OyBvdmVyZmxvdy15OiBhdXRvOyBwYWRkaW5nOiAycHg7IH1cbi5sd3ItbGFuZSwgLmx3ci1oaWRkZW4geyBib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1ib3JkZXJDb2xvciwgI2RjZTNlYyk7IGJvcmRlci1yYWRpdXM6IDlweDsgcGFkZGluZzogMTBweDsgbWluLXdpZHRoOiAwOyB9XG4ubHdyLWxhbmUgaDMsIC5sd3ItaGlkZGVuIGgzIHsgZm9udDogNjAwIDEycHgvMS40IHN5c3RlbS11aTsgbWFyZ2luOiAwIDAgOHB4OyBkaXNwbGF5OiBmbGV4OyBnYXA6IDdweDsgYWxpZ24taXRlbXM6IGNlbnRlcjsgfVxuLmx3ci1sYW5lIGgzID4gc3BhbiwgLmx3ci1oaWRkZW4gaDMgPiBzcGFuIHsgY29sb3I6IHZhcigtLXRleHRDb2xvclNlY29uZGFyeSwgIzc1ODM5OSk7IGZvbnQtd2VpZ2h0OiA0MDA7IH1cbi5sd3ItZHJvcC1yZWFkeSB7IGJvcmRlci1zdHlsZTogZGFzaGVkOyB9XG4ubHdyLWZpZWxkIHsgYm9yZGVyOiAxcHggc29saWQgdmFyKC0tYm9yZGVyQ29sb3IsICNkY2UzZWMpOyBib3JkZXItcmFkaXVzOiA3cHg7IHBhZGRpbmc6IDhweCAxMHB4OyBtYXJnaW4tdG9wOiA3cHg7IGJhY2tncm91bmQ6IHZhcigtLWNvbnRlbnRDb2xvciwgI2ZmZik7IGRpc3BsYXk6IGdyaWQ7IGdyaWQtdGVtcGxhdGUtY29sdW1uczogbWlubWF4KDgwcHgsIDFmcikgYXV0bzsgZ2FwOiA2cHggOHB4OyB9XG4ubHdyLWZpZWxkLXRpdGxlIHsgZGlzcGxheTogZmxleDsgZ2FwOiA2cHg7IGFsaWduLWl0ZW1zOiBjZW50ZXI7IG1pbi13aWR0aDogMDsgfVxuLmx3ci1maWVsZC10aXRsZSBzdHJvbmcgeyBmb250LXNpemU6IDEycHg7IG92ZXJmbG93OiBoaWRkZW47IHRleHQtb3ZlcmZsb3c6IGVsbGlwc2lzOyB3aGl0ZS1zcGFjZTogbm93cmFwOyB9XG4ubHdyLWdyaXAgeyBjb2xvcjogdmFyKC0tdGV4dENvbG9yU2Vjb25kYXJ5LCAjNzU4Mzk5KTsgY3Vyc29yOiBncmFiOyB9XG4ubHdyLWZpZWxkLWFjdGlvbnMgeyBkaXNwbGF5OiBmbGV4OyBnYXA6IDNweDsgYWxpZ24taXRlbXM6IGNlbnRlcjsgfVxuLmx3ci1maWVsZC1hY3Rpb25zIGJ1dHRvbiB7IHBhZGRpbmc6IDJweCA1cHg7IH1cbi5sd3ItZmllbGQtYWN0aW9ucyBzZWxlY3QgeyBtYXgtd2lkdGg6IDEwNHB4OyBwYWRkaW5nOiAzcHg7IGZvbnQtc2l6ZTogMTFweDsgfVxuLmx3ci13aWR0aCB7IGdyaWQtY29sdW1uOiAxIC8gLTE7IGRpc3BsYXk6IGZsZXg7IGdhcDogOHB4OyBhbGlnbi1pdGVtczogY2VudGVyOyBmb250LXNpemU6IDEwcHg7IGNvbG9yOiB2YXIoLS10ZXh0Q29sb3JTZWNvbmRhcnksICM3NTgzOTkpOyB9XG4ubHdyLXdpZHRoIGlucHV0IHsgZmxleDogMTsgbWluLXdpZHRoOiAwOyBhY2NlbnQtY29sb3I6IHZhcigtLXByaW1hcnksICMyODc0ZDApOyBoZWlnaHQ6IDEzcHg7IH1cbi5sd3Itd2lkdGggaW5wdXQ6ZGlzYWJsZWQgeyBvcGFjaXR5OiAuMzU7IH1cbi5sd3Itd2lkdGggb3V0cHV0IHsgbWluLXdpZHRoOiAxOHB4OyB0ZXh0LWFsaWduOiByaWdodDsgfVxuLmx3ci1kcmFnZ2luZyB7IG9wYWNpdHk6IC40OyB9XG4ubHdyLWhpZGRlbiB7IG1hcmdpbi10b3A6IDEycHg7IH1cbi5sd3ItaGlkZGVuLWxpc3QgeyBkaXNwbGF5OiBmbGV4OyBmbGV4LXdyYXA6IHdyYXA7IGdhcDogNnB4OyB9XG4ubHdyLWhpZGRlbi1saXN0IC5sd3ItZmllbGQgeyBtYXJnaW46IDA7IH1cbi5sd3ItZW1wdHktbGluZSB7IGZvbnQtc2l6ZTogMTFweDsgbWFyZ2luOiA2cHggMDsgfVxuLmx3ci1lZGl0b3Itb3B0aW9ucyB7IGRpc3BsYXk6IGZsZXg7IGZsZXgtd3JhcDogd3JhcDsgZ2FwOiA4cHggMjBweDsgYWxpZ24taXRlbXM6IGNlbnRlcjsgbWFyZ2luOiAxMnB4IDA7IGZvbnQtc2l6ZTogMTFweDsgfVxuLmx3ci1lZGl0b3Itb3B0aW9ucyBsYWJlbCB7IGRpc3BsYXk6IGZsZXg7IGdhcDogNnB4OyBhbGlnbi1pdGVtczogY2VudGVyOyB9XG4ubHdyLWVkaXRvci1vcHRpb25zID4gc3BhbiB7IGNvbG9yOiB2YXIoLS10ZXh0Q29sb3JTZWNvbmRhcnksICM3NTgzOTkpOyB9XG4ubHdyLWVkaXRvci1mb290ZXIgeyBkaXNwbGF5OiBmbGV4OyBqdXN0aWZ5LWNvbnRlbnQ6IGZsZXgtZW5kOyBnYXA6IDhweDsgYm9yZGVyLXRvcDogMXB4IHNvbGlkIHZhcigtLWJvcmRlckNvbG9yLCAjZGNlM2VjKTsgcGFkZGluZy10b3A6IDEycHg7IH1cbi5sd3ItZWRpdG9yIGJ1dHRvbi5sd3ItYXBwbHkgeyBiYWNrZ3JvdW5kOiB2YXIoLS1wcmltYXJ5LCAjMjg3NGQwKTsgY29sb3I6IHdoaXRlOyBib3JkZXItY29sb3I6IHRyYW5zcGFyZW50OyB9XG5AbWVkaWEgKG1heC13aWR0aDogNjUwcHgpIHsgLmx3ci1sYW5lcyB7IGdyaWQtdGVtcGxhdGUtY29sdW1uczogMWZyOyB9IC5sd3ItZmllbGQgeyBncmlkLXRlbXBsYXRlLWNvbHVtbnM6IDFmcjsgfSAubHdyLWZpZWxkLWFjdGlvbnMgeyBqdXN0aWZ5LWNvbnRlbnQ6IGZsZXgtZW5kOyB9IH1cbmA7XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSwwQkFBMkI7QUFDM0Isa0NBQTZCOzs7QUNPdEIsSUFBTSxnQkFBZ0MsRUFBRSxTQUFTLEdBQUcsU0FBUyxNQUFNLFFBQVEsQ0FBQyxFQUFFO0FBQzlFLElBQU0sWUFBWSxDQUFDLE9BQWUsR0FBRyxRQUFRLGVBQWUsRUFBRSxFQUFFLFlBQVk7QUFDNUUsSUFBTSxnQkFBZ0IsQ0FBQyxPQUFlLFVBQVUsRUFBRSxNQUFNO0FBQ3hELElBQU0sWUFBWSxDQUFDLE9BQWUsQ0FBQyxhQUFhLFVBQVUsWUFBWSxPQUFPLFFBQVEsV0FBVyxhQUFhLEVBQUUsU0FBUyxVQUFVLEVBQUUsQ0FBQztBQUM1SSxJQUFNLFNBQVMsQ0FBQyxPQUFlLFVBQVUsRUFBRSxNQUFNO0FBQ2pELElBQU0sVUFBVSxDQUFDLE9BQWUsQ0FBQyxnQkFBZ0IsU0FBUyxVQUFVLGlCQUFpQixFQUFFLFNBQVMsVUFBVSxFQUFFLENBQUM7QUFDN0csSUFBTSxXQUFXLENBQUMsT0FBZSxDQUFDLFVBQVUsT0FBTyxFQUFFLFNBQVMsVUFBVSxFQUFFLENBQUM7QUFFcEUsU0FBUyxXQUFXLElBQW9CO0FBQzdDLFFBQU0sU0FBaUM7QUFBQSxJQUNyQyxNQUFNO0FBQUEsSUFBUSxXQUFXO0FBQUEsSUFBYSxLQUFLO0FBQUEsSUFBTyxRQUFRO0FBQUEsSUFBVSxZQUFZO0FBQUEsSUFDaEYsVUFBVTtBQUFBLElBQVksTUFBTTtBQUFBLElBQVEsS0FBSztBQUFBLElBQU8sS0FBSztBQUFBLElBQU8sUUFBUTtBQUFBLElBQVUsT0FBTztBQUFBLElBQ3JGLFFBQVE7QUFBQSxJQUFpQixPQUFPO0FBQUEsSUFBaUIsY0FBYztBQUFBLElBQWlCLFNBQVM7QUFBQSxJQUFZLFVBQVU7QUFBQSxJQUMvRyxZQUFZO0FBQUEsRUFDZDtBQUNBLFNBQU8sT0FBTyxVQUFVLEVBQUUsQ0FBQyxLQUFLLEdBQUcsUUFBUSxtQkFBbUIsT0FBTyxFQUFFLFFBQVEsU0FBUyxHQUFHO0FBQzdGO0FBRU8sU0FBUyxjQUFjLEtBQWUsU0FBaUIsWUFBeUI7QUFDckYsUUFBTSxTQUF3QixJQUFJLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTztBQUMzRSxVQUFNLE1BQU0sVUFBVSxFQUFFO0FBQ3hCLFFBQUksT0FBa0I7QUFDdEIsUUFBSSxRQUFRLGtCQUFrQixLQUFLLEVBQUUsSUFBSSxLQUFLO0FBQzlDLFFBQUksT0FBTyxFQUFFLEdBQUc7QUFBRSxhQUFPO0FBQVcsY0FBUTtBQUFBLElBQUk7QUFDaEQsUUFBSSxTQUFTLEVBQUUsR0FBRztBQUFFLGFBQU87QUFBVyxjQUFRO0FBQUEsSUFBRztBQUNqRCxRQUFJLFFBQVEsT0FBTztBQUFFLGFBQU87QUFBVyxjQUFRO0FBQUEsSUFBRztBQUNsRCxRQUFJLGNBQWMsRUFBRSxHQUFHO0FBQUUsYUFBTztBQUFXLGNBQVE7QUFBQSxJQUFHO0FBQ3RELFFBQUksV0FBVyxTQUFTLENBQUMsT0FBTyxZQUFZLEVBQUUsU0FBUyxHQUFHLEVBQUcsUUFBTztBQUNwRSxRQUFJLFdBQVcsT0FBTztBQUNwQixVQUFJLFFBQVEsTUFBTyxRQUFPO0FBQzFCLFVBQUksUUFBUSxFQUFFLEdBQUc7QUFBRSxlQUFPO0FBQVcsZ0JBQVE7QUFBQSxNQUFJO0FBQUEsSUFDbkQ7QUFDQSxRQUFJLFdBQVcsbUJBQW1CO0FBQ2hDLFVBQUksUUFBUSxjQUFjLFVBQVUsS0FBSyxHQUFHLEdBQUc7QUFBRSxlQUFPO0FBQVcsZ0JBQVE7QUFBQSxNQUFHO0FBQzlFLFVBQUksUUFBUSxhQUFjLFFBQU87QUFBQSxJQUNuQztBQUNBLFdBQU8sRUFBRSxJQUFJLE1BQU0sTUFBTTtBQUFBLEVBQzNCLENBQUM7QUFFRCxTQUFPLEtBQUssQ0FBQyxHQUFHLE1BQU0sT0FBTyxPQUFPLEVBQUUsRUFBRSxDQUFDLElBQUksT0FBTyxPQUFPLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDakUsU0FBTyxFQUFFLFFBQVEsUUFBUSxNQUFNLGVBQWUsTUFBTTtBQUN0RDtBQUdPLFNBQVMsY0FBYyxLQUFlLE9BQThCO0FBQ3pFLFFBQU0sV0FBVyxjQUFjLEdBQUc7QUFDbEMsTUFBSSxDQUFDLFNBQVMsT0FBTyxVQUFVLFNBQVUsUUFBTztBQUNoRCxRQUFNLE1BQU07QUFDWixNQUFJLENBQUMsTUFBTSxRQUFRLElBQUksTUFBTSxFQUFHLFFBQU87QUFDdkMsUUFBTSxVQUFVLElBQUksSUFBSSxTQUFTLE9BQU8sSUFBSSxDQUFDLFVBQVUsTUFBTSxFQUFFLENBQUM7QUFDaEUsUUFBTSxPQUFPLG9CQUFJLElBQVk7QUFDN0IsUUFBTSxTQUF3QixDQUFDO0FBQy9CLGFBQVcsU0FBUyxJQUFJLFFBQVE7QUFDOUIsUUFBSSxDQUFDLFNBQVMsT0FBTyxNQUFNLE9BQU8sWUFBWSxDQUFDLFFBQVEsSUFBSSxNQUFNLEVBQUUsS0FBSyxLQUFLLElBQUksTUFBTSxFQUFFLEVBQUc7QUFDNUYsUUFBSSxDQUFDLENBQUMsV0FBVyxhQUFhLFFBQVEsRUFBRSxTQUFTLE1BQU0sSUFBSSxFQUFHO0FBQzlELFNBQUssSUFBSSxNQUFNLEVBQUU7QUFDakIsV0FBTyxLQUFLO0FBQUEsTUFDVixJQUFJLE1BQU07QUFBQSxNQUNWLE1BQU8sT0FBTyxNQUFNLEVBQUUsS0FBSyxNQUFNLFNBQVMsWUFBYyxjQUFjLE1BQU0sRUFBRSxLQUFLLE1BQU0sU0FBUyxXQUFZLFlBQVksTUFBTTtBQUFBLE1BQ2hJLE9BQU8sT0FBTyxTQUFTLE1BQU0sS0FBSyxJQUFJLEtBQUssSUFBSSxHQUFHLEtBQUssSUFBSSxJQUFJLEtBQUssTUFBTSxNQUFNLEtBQUssQ0FBQyxDQUFDLElBQUk7QUFBQSxJQUM3RixDQUFDO0FBQUEsRUFDSDtBQUNBLFNBQU8sS0FBSyxHQUFHLFNBQVMsT0FBTyxPQUFPLENBQUMsVUFBVSxDQUFDLEtBQUssSUFBSSxNQUFNLEVBQUUsQ0FBQyxDQUFDO0FBQ3JFLFNBQU8sRUFBRSxRQUFRLFFBQVEsSUFBSSxXQUFXLE9BQU8sZUFBZSxJQUFJLGtCQUFrQixLQUFLO0FBQzNGO0FBRU8sU0FBUyxpQkFBaUIsT0FBZ0M7QUFDL0QsTUFBSSxDQUFDLFNBQVMsT0FBTyxVQUFVLFNBQVUsUUFBTyxFQUFFLEdBQUcsZUFBZSxRQUFRLENBQUMsRUFBRTtBQUMvRSxRQUFNLE1BQU07QUFDWixRQUFNLFNBQXNDLENBQUM7QUFDN0MsTUFBSSxJQUFJLFVBQVUsT0FBTyxJQUFJLFdBQVcsWUFBWSxDQUFDLE1BQU0sUUFBUSxJQUFJLE1BQU0sR0FBRztBQUM5RSxlQUFXLENBQUMsSUFBSSxNQUFNLEtBQUssT0FBTyxRQUFRLElBQUksTUFBTSxHQUFHO0FBQ3JELFVBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxRQUFRLE9BQU8sTUFBTSxFQUFHO0FBQzlDLFlBQU0sTUFBTSxPQUFPLE9BQU8sT0FBTyxDQUFDLFVBQVUsU0FBUyxPQUFPLE1BQU0sT0FBTyxRQUFRLEVBQUUsSUFBSSxDQUFDLFVBQVUsTUFBTSxFQUFFO0FBQzFHLGFBQU8sRUFBRSxJQUFJLGNBQWMsS0FBSyxNQUFNO0FBQUEsSUFDeEM7QUFBQSxFQUNGO0FBQ0EsU0FBTyxFQUFFLFNBQVMsR0FBRyxTQUFTLElBQUksWUFBWSxPQUFPLE9BQU87QUFDOUQ7QUFFTyxTQUFTLFVBQVUsUUFBcUIsSUFBWSxNQUFpQixRQUE4QjtBQUN4RyxRQUFNLFFBQVEsT0FBTyxPQUFPLEtBQUssQ0FBQyxjQUFjLFVBQVUsT0FBTyxFQUFFO0FBQ25FLE1BQUksQ0FBQyxTQUFVLE9BQU8sRUFBRSxLQUFLLFNBQVMsU0FBVyxRQUFPO0FBQ3hELE1BQUksT0FBTyxVQUFVLE1BQU0sU0FBUyxLQUFNLFFBQU87QUFDakQsUUFBTSxTQUFTLE9BQU8sT0FBTyxPQUFPLENBQUMsY0FBYyxVQUFVLE9BQU8sRUFBRTtBQUN0RSxNQUFJLFdBQVcsU0FBUyxPQUFPLFVBQVUsQ0FBQyxjQUFjLFVBQVUsT0FBTyxVQUFVLFVBQVUsU0FBUyxJQUFJLElBQUk7QUFDOUcsTUFBSSxXQUFXLEdBQUc7QUFDaEIsVUFBTSxPQUFPLE9BQU8sY0FBYyxDQUFDLGNBQWMsVUFBVSxTQUFTLElBQUk7QUFDeEUsZUFBVyxPQUFPLElBQUksT0FBTyxTQUFTLE9BQU87QUFBQSxFQUMvQztBQUNBLFNBQU8sT0FBTyxVQUFVLEdBQUcsRUFBRSxHQUFHLE9BQU8sTUFBTSxjQUFjLEVBQUUsS0FBSyxTQUFTLFdBQVcsWUFBWSxLQUFLLENBQUM7QUFDeEcsU0FBTyxFQUFFLEdBQUcsUUFBUSxPQUFPO0FBQzdCO0FBRU8sU0FBUyxZQUFZLElBQW9CO0FBQzlDLFFBQU0sTUFBTSxVQUFVLEVBQUU7QUFDeEIsTUFBSSxDQUFDLE9BQU8sVUFBVSxjQUFjLFVBQVUsRUFBRSxTQUFTLEdBQUcsRUFBRyxRQUFPO0FBQ3RFLE1BQUksUUFBUSxFQUFFLEtBQUssQ0FBQyxRQUFRLFdBQVcsRUFBRSxTQUFTLEdBQUcsRUFBRyxRQUFPO0FBQy9ELE1BQUksUUFBUSxNQUFPLFFBQU87QUFDMUIsU0FBTztBQUNUOzs7QUN4R08sU0FBUyxpQkFBaUIsUUFBd0IsV0FBa0M7QUFDekYsY0FBWSxLQUFLLElBQUksR0FBRyxPQUFPLFNBQVMsU0FBUyxJQUFJLFlBQVksQ0FBQztBQUNsRSxRQUFNLFlBQVksT0FBTyxJQUFJLENBQUMsVUFBVSxLQUFLLElBQUksR0FBRyxNQUFNLFNBQVMsQ0FBQztBQUNwRSxRQUFNLFVBQVUsT0FBTyxJQUFJLENBQUMsT0FBTyxVQUFVLEtBQUssSUFBSSxHQUFHLEtBQUssSUFBSSxVQUFVLEtBQUssR0FBRyxNQUFNLE9BQU8sQ0FBQyxDQUFDO0FBQ25HLFFBQU0sUUFBUSxVQUFVLE9BQU8sQ0FBQyxLQUFLLFVBQVUsTUFBTSxPQUFPLENBQUM7QUFDN0QsUUFBTSxRQUFRLFFBQVEsT0FBTyxDQUFDLEtBQUssVUFBVSxNQUFNLE9BQU8sQ0FBQztBQUMzRCxNQUFJLFNBQVM7QUFDYixNQUFJLFFBQVEsV0FBVztBQUNyQixhQUFTLFNBQVMsWUFDZCxRQUFRLElBQUksQ0FBQyxVQUFVLFFBQVEsUUFBUSxZQUFZLFFBQVEsQ0FBQyxJQUM1RCxVQUFVLElBQUksQ0FBQyxPQUFPLFVBQVUsU0FBUyxRQUFRLFFBQVEsS0FBSyxNQUFNLFFBQVEsY0FBYyxRQUFRLE1BQU07QUFBQSxFQUM5RztBQUNBLE1BQUksU0FBUztBQUNiLFNBQU8sT0FBTyxJQUFJLENBQUMsT0FBTyxVQUFVO0FBQ2xDLFVBQU0sU0FBUyxFQUFFLElBQUksTUFBTSxJQUFJLFFBQVEsT0FBTyxPQUFPLEtBQUssRUFBRTtBQUM1RCxjQUFVLE9BQU8sS0FBSztBQUN0QixXQUFPO0FBQUEsRUFDVCxDQUFDO0FBQ0g7QUFFQSxJQUFNLFdBQVcsb0JBQUksUUFBNEY7QUFFMUcsU0FBUyxZQUFZQSxXQUFvQixNQUFjLE1BQXNCO0FBMUJwRjtBQTJCRSxNQUFJLFFBQVEsU0FBUyxJQUFJQSxTQUFRO0FBQ2pDLE1BQUksQ0FBQyxPQUFPO0FBRVYsVUFBTSxZQUFZLFNBQU8sS0FBQUEsVUFBUyxnQkFBVCxtQkFBc0IsOEJBQTZCO0FBQzVFLFlBQVEsRUFBRSxTQUFTLFlBQVlBLFVBQVMsY0FBYyxRQUFRLEVBQUUsV0FBVyxJQUFJLElBQUksTUFBTSxPQUFPLG9CQUFJLElBQUksRUFBRTtBQUMxRyxhQUFTLElBQUlBLFdBQVUsS0FBSztBQUFBLEVBQzlCO0FBQ0EsUUFBTSxNQUFNLEdBQUcsSUFBSTtBQUFBLEVBQUssSUFBSTtBQUM1QixRQUFNLFNBQVMsTUFBTSxNQUFNLElBQUksR0FBRztBQUNsQyxNQUFJLFdBQVcsT0FBVyxRQUFPO0FBQ2pDLE1BQUk7QUFDSixNQUFJLE1BQU0sU0FBUztBQUNqQixVQUFNLFFBQVEsT0FBTztBQUNyQixZQUFRLE1BQU0sUUFBUSxZQUFZLElBQUksRUFBRTtBQUFBLEVBQzFDLE1BQU8sU0FBUSxLQUFLLFVBQVUsT0FBTyxhQUFXLFVBQUssTUFBTSxVQUFVLE1BQXJCLG1CQUF5QixPQUFNLElBQUksSUFBSTtBQUN2RixNQUFJLE1BQU0sTUFBTSxPQUFPLEtBQU0sT0FBTSxNQUFNLE1BQU07QUFDL0MsUUFBTSxNQUFNLElBQUksS0FBSyxLQUFLO0FBQzFCLFNBQU87QUFDVDs7O0FDeENPLFNBQVMsV0FBVyxLQUFlLFNBQXNCLGNBQWMsS0FBSyxLQUFLLEdBQTJCO0FBQ2pILFFBQU0sU0FBUyxvQkFBSSxJQUF1QjtBQUMxQyxRQUFNLE9BQU8sSUFBSSxVQUFvQixJQUFJLEtBQUssQ0FBQyxPQUFPLE1BQU0sU0FBUyxVQUFVLEVBQUUsQ0FBQyxDQUFDO0FBQ25GLFFBQU0sWUFBWSxLQUFLLGFBQWEsVUFBVSxZQUFZLEtBQUs7QUFDL0QsUUFBTSxPQUFPLEtBQUssUUFBUSxXQUFXLGFBQWE7QUFDbEQsTUFBSSxVQUFXLFFBQU8sSUFBSSxXQUFXLEVBQUUsUUFBUSxTQUFTLE1BQU0sUUFBUSxDQUFDO0FBQ3ZFLE1BQUksS0FBTSxRQUFPLElBQUksTUFBTSxFQUFFLFFBQVEsYUFBYSxNQUFNLFFBQVEsQ0FBQztBQUVqRSxRQUFNLFNBQVMsY0FBYyxLQUFLLE1BQU0sRUFBRTtBQUMxQyxXQUFTLFdBQVcsT0FBd0MsTUFBYyxZQUFZLE9BQU87QUFDM0YsVUFBTSxRQUFRLE1BQU0sT0FBTyxDQUFDLEtBQUssU0FBUyxNQUFNLEtBQUssT0FBTyxDQUFDO0FBQzdELFFBQUksT0FBTztBQUNYLFFBQUksUUFBUTtBQUNaLFVBQU0sUUFBUSxDQUFDLE1BQU0sVUFBVTtBQUM3QixjQUFRLEtBQUs7QUFFYixZQUFNLE1BQU0sVUFBVSxNQUFNLFNBQVMsSUFBSSxNQUFNLEtBQUs7QUFBQSxRQUFJLFFBQVE7QUFBQSxRQUM5RCxLQUFLLElBQUksT0FBTyxNQUFNLFNBQVMsUUFBUSxJQUFJLElBQUksS0FBSyxNQUFNLE1BQU0sT0FBTyxLQUFLLENBQUM7QUFBQSxNQUFDO0FBQ2hGLGFBQU8sSUFBSSxLQUFLLElBQUksRUFBRSxRQUFRLEdBQUcsS0FBSyxNQUFNLEdBQUcsSUFBSSxNQUFNLEdBQUksWUFBWSxFQUFFLFdBQVcsS0FBSyxJQUFJLENBQUMsRUFBRyxDQUFDO0FBQ3BHLGNBQVE7QUFBQSxJQUNWLENBQUM7QUFBQSxFQUNIO0FBQ0EsYUFBVyxPQUFPLE9BQU8sQ0FBQyxVQUFVLE1BQU0sU0FBUyxhQUFhLENBQUMsY0FBYyxNQUFNLEVBQUUsQ0FBQyxHQUFHLE9BQU87QUFDbEcsYUFBVyxPQUFPLE9BQU8sQ0FBQyxVQUFVLE1BQU0sU0FBUyxlQUFlLENBQUMsY0FBYyxNQUFNLEVBQUUsQ0FBQyxHQUFHLFNBQVMsSUFBSTtBQUMxRyxhQUFXLFNBQVMsT0FBTyxPQUFPLENBQUNDLFdBQVVBLE9BQU0sU0FBUyxRQUFRLEdBQUc7QUFDckUsV0FBTyxJQUFJLE1BQU0sSUFBSSxFQUFFLFFBQVEsV0FBVyxNQUFNLFNBQVMsUUFBUSxLQUFLLENBQUM7QUFBQSxFQUN6RTtBQUNBLFFBQU0sT0FBTyxPQUFPLEtBQUssQ0FBQyxVQUFVLFVBQVUsTUFBTSxFQUFFLE1BQU0sTUFBTTtBQUNsRSxRQUFNLFVBQVUsT0FBTyxLQUFLLENBQUMsVUFBVSxjQUFjLE1BQU0sRUFBRSxLQUFLLE1BQU0sU0FBUyxRQUFRO0FBQ3pGLFFBQU0sZUFBZSxRQUFRLE9BQU8sSUFBSSxLQUFLLEVBQUU7QUFDL0MsTUFBSSxXQUFXLGFBQWMsUUFBTyxJQUFJLFFBQVEsSUFBSSxFQUFFLEdBQUcsY0FBYyxTQUFTLEtBQUssQ0FBQztBQUN0RixTQUFPO0FBQ1Q7QUFFQSxJQUFNLGVBQWU7QUFDckIsSUFBTSxnQkFBZ0I7QUFFZixTQUFTLFVBQVUsS0FBa0IsU0FBUyxPQUFPLFFBQXNCLFFBQThCLFVBQXVELENBQUMsR0FBUztBQTFDakw7QUEyQ0UsUUFBTSxRQUFRLE1BQU0sS0FBSyxJQUFJLFFBQVEsRUFBRSxPQUFPLENBQUMsVUFDN0MsaUJBQWlCLElBQUksY0FBYyxZQUFhLFdBQVc7QUFDN0QsUUFBTSxRQUFRLENBQUMsU0FDYixLQUFLLGFBQWEsU0FBUyx3QkFBd0IsZ0JBQWdCLE1BQ2xFLFVBQVUsS0FBSyxjQUFjLGlDQUFpQyxJQUFJLFNBQVM7QUFDOUUsUUFBTSxNQUFNLE1BQU0sSUFBSSxLQUFLO0FBRTNCLE1BQUksSUFBSSxLQUFLLENBQUMsT0FBTyxDQUFDLEVBQUUsS0FBSyxDQUFDLElBQUksS0FBSyxDQUFDLE9BQU8sVUFBVSxFQUFFLE1BQU0sTUFBTSxHQUFHO0FBQ3hFLGdCQUFZLEdBQUc7QUFDZjtBQUFBLEVBQ0Y7QUFDQSxRQUFNLFlBQVksV0FBVyxLQUFLLE1BQU07QUFDeEMsUUFBTSxXQUFXLGNBQWMsS0FBSyxVQUFVLGNBQWMsS0FBSyxLQUFLLENBQUM7QUFDdkUsUUFBTSxhQUFhLFFBQVEsaUNBQVEsTUFBTSxLQUFLLFNBQVM7QUFDdkQsUUFBTSxVQUFVLFNBQVMsT0FBTyxPQUFPLENBQUMsVUFBVSxNQUFNLFNBQVMsZUFBZSxDQUFDLGNBQWMsTUFBTSxFQUFFLENBQUM7QUFDeEcsUUFBTSxjQUFjLElBQUksSUFBSSxRQUFRLE9BQU8sQ0FBQyxPQUFPLFVBQVUsUUFBUSxLQUFLLFlBQVksTUFBTSxFQUFFLE1BQU0sWUFBWSxRQUFRLFFBQVEsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxVQUFVLE1BQU0sRUFBRSxDQUFDO0FBQ2hLLFFBQU0sY0FBYyxNQUFNLEtBQUssQ0FBQyxTQUFTLGNBQWMsTUFBTSxJQUFJLENBQUMsQ0FBQztBQUNuRSxRQUFNLGlCQUFpQixlQUFlLEdBQUMsZUFBVSxJQUFJLE1BQU0sV0FBVyxDQUFDLE1BQWhDLG1CQUFtQyxXQUFVLFFBQVEsWUFBWSxjQUFjLG9CQUFvQixPQUFLLGlCQUFZLGdCQUFaLG1CQUF5QixPQUFNO0FBQzlLLE1BQUksYUFBYSxjQUFjLFNBQVMsV0FBVyxNQUFNO0FBQ3pELE1BQUksYUFBYSxtQkFBbUIsYUFBYSxTQUFTLE9BQU87QUFDakUsTUFBSSxhQUFhLG9CQUFvQixRQUFRLFNBQVMsS0FBSyxJQUFJLFFBQVEsTUFBTTtBQUM3RSxhQUFXLFFBQVEsT0FBTztBQUN4QixVQUFNLFlBQVksVUFBVSxJQUFJLE1BQU0sSUFBSSxDQUFDO0FBQzNDLFFBQUksQ0FBQyxVQUFXO0FBQ2hCLFNBQUssYUFBYSxlQUFlLEVBQUU7QUFDbkMsU0FBSyxNQUFNLFlBQVksZ0JBQWdCLFVBQVUsTUFBTTtBQUN2RCxTQUFLLE1BQU0sWUFBWSxjQUFjLFVBQVUsSUFBSTtBQUNuRCxTQUFLLGdCQUFnQixtQkFBbUIsVUFBVSxXQUFXLElBQUk7QUFDakUsU0FBSyxnQkFBZ0Isc0JBQXNCLFVBQVUsY0FBYyxJQUFJO0FBQ3ZFLFNBQUssZ0JBQWdCLGlCQUFpQixVQUFVLE1BQU0sSUFBSSxDQUFDLE1BQU0sTUFBTTtBQUN2RSxTQUFLLGdCQUFnQixtQkFBbUIsQ0FBQyxVQUFVLE9BQU8sRUFBRSxTQUFTLFVBQVUsTUFBTSxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQzVGLFFBQUksS0FBSyxhQUFhLGlCQUFpQixHQUFHO0FBQ3hDLFlBQU0sUUFBUSxLQUFLLGNBQWMsU0FBUyxLQUFLLEtBQUs7QUFDcEQsVUFBSSxNQUFPLE1BQUssTUFBTSxZQUFZLHNCQUFzQixJQUFJLGNBQWMsWUFBYSxpQkFBaUIsS0FBSyxFQUFFLEtBQUs7QUFBQSxJQUN0SDtBQUNBLFNBQUssZ0JBQWdCLHdCQUF3QixZQUFZLElBQUksTUFBTSxJQUFJLENBQUMsQ0FBQztBQUN6RSxTQUFLLGdCQUFnQixvQkFBb0IsVUFBVSxZQUFZLElBQUk7QUFDbkUsU0FBSyxnQkFBZ0IsdUJBQXVCLFVBQVUsWUFBWSxRQUFRLENBQUMsY0FBYztBQUN6RixTQUFLLGdCQUFnQix3QkFBd0IsVUFBVSxNQUFNLElBQUksQ0FBQyxNQUFNLFVBQVUsUUFBUSxjQUFjLENBQUM7QUFDekcsU0FBSyxnQkFBZ0IsaUJBQWlCLENBQUMsVUFBVSxVQUFVLGNBQWMsUUFBUSxTQUFTLGFBQWE7QUFDdkcsU0FBSyxhQUFhLGtCQUFrQixjQUFjLE1BQU0sSUFBSSxDQUFDLElBQUksTUFBSyxpQ0FBUSxJQUFJLE1BQU0sSUFBSSxPQUFNLFdBQVcsTUFBTSxJQUFJLENBQUMsQ0FBQztBQUN6SCxTQUFLLE1BQU0sZUFBZSxjQUFjO0FBQ3hDLFNBQUssTUFBTSxlQUFlLHFCQUFxQjtBQUFBLEVBQ2pEO0FBQ0EsTUFBSSxDQUFDLFVBQVUsU0FBUyxlQUFlO0FBQ3JDLFVBQU0sWUFBWSxLQUFLLElBQUksSUFBSSxRQUFRLGtCQUFrQixJQUFJLGVBQWUsRUFBRTtBQUM5RSxVQUFNLFVBQVUsUUFBUSxJQUFJLENBQUMsVUFBVTtBQXpGM0MsVUFBQUM7QUEwRk0sWUFBTSxPQUFPLE1BQU0sS0FBSyxDQUFDLGNBQWMsTUFBTSxTQUFTLE1BQU0sTUFBTSxFQUFFO0FBQ3BFLFlBQU0sVUFBUUEsTUFBQSxLQUFLLGdCQUFMLGdCQUFBQSxJQUFrQixXQUFVO0FBQzFDLFlBQU0sUUFBUSxJQUFJLGNBQWMsWUFBYSxpQkFBaUIsSUFBSTtBQUNsRSxZQUFNLFdBQVcsT0FBTyxXQUFXLE1BQU0sUUFBUSxLQUFLO0FBQ3RELFlBQU0sT0FBTyxHQUFHLE1BQU0sY0FBYyxLQUFLLElBQUksUUFBUSxNQUFNLE1BQU0sY0FBYyxXQUFXO0FBQzFGLFlBQU0sUUFBUSxLQUFLLGFBQWEsZ0JBQWdCLEtBQUs7QUFDckQsWUFBTSxhQUFhLGFBQWEsWUFBWSxJQUFJLGVBQWUsT0FBTyxPQUFPLFdBQVcsSUFBSSxNQUFNLE1BQU0sY0FBYyxXQUFXLEVBQUUsSUFBSSxJQUFJO0FBQzNJLFlBQU0sV0FBVyxRQUFRLElBQUksS0FBSyxJQUFJLElBQUksS0FBSyxpQkFBaUIsb0JBQW9CLEVBQUUsU0FBUyxFQUFFO0FBQ2pHLFlBQU0sVUFBVSxNQUFNLFlBQVksSUFBSSxNQUFNLEVBQUUsSUFBSSxLQUFLLE1BQU0sS0FBSyxhQUFhLHNCQUFzQixJQUFJLEtBQUs7QUFDOUcsWUFBTSxZQUFZLEtBQUssS0FBSyxZQUFZLElBQUksZUFBZSxPQUFPLElBQUksSUFBSSxXQUFXLGFBQWEsVUFBVSxDQUFDO0FBQzdHLGFBQU8sRUFBRSxJQUFJLE1BQU0sSUFBSSxXQUFXLFNBQVMsS0FBSyxJQUFJLFdBQVcsYUFBYSxVQUFVLEVBQUUsRUFBRTtBQUFBLElBQzVGLENBQUM7QUFDRCxlQUFXLFVBQVUsaUJBQWlCLFNBQVMsU0FBUyxHQUFHO0FBQ3pELFlBQU0sT0FBTyxNQUFNLEtBQUssQ0FBQyxjQUFjLE1BQU0sU0FBUyxNQUFNLE9BQU8sRUFBRTtBQUNyRSxXQUFLLE1BQU0sWUFBWSxnQkFBZ0IsR0FBRyxPQUFPLE9BQU8sUUFBUSxDQUFDLENBQUMsSUFBSTtBQUN0RSxXQUFLLE1BQU0sWUFBWSx1QkFBdUIsR0FBRyxPQUFPLE1BQU0sUUFBUSxDQUFDLENBQUMsSUFBSTtBQUM1RSxVQUFJLEtBQUssYUFBYSxlQUFlLEtBQUssZUFBZSxnQkFBZ0I7QUFDdkUsb0JBQVksYUFBYSxpQkFBaUIsRUFBRTtBQUM1QyxvQkFBWSxNQUFNLFlBQVksZ0JBQWdCLEdBQUcsT0FBTyxPQUFPLFFBQVEsQ0FBQyxDQUFDLElBQUk7QUFDN0Usb0JBQVksTUFBTSxZQUFZLHVCQUF1QixNQUFNO0FBQUEsTUFDN0Q7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGO0FBRU8sU0FBUyxZQUFZLE1BQXlCO0FBQ25ELGFBQVcsT0FBTyxDQUFDLEdBQUksS0FBSyxRQUFRLElBQUksWUFBWSxHQUFHLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxHQUFJLEdBQUcsS0FBSyxpQkFBaUIsSUFBSSxZQUFZLEdBQUcsQ0FBQyxHQUFHO0FBQ3ZILFFBQUksZ0JBQWdCLFlBQVk7QUFDaEMsUUFBSSxnQkFBZ0IsaUJBQWlCO0FBQ3JDLFFBQUksZ0JBQWdCLGlCQUFpQjtBQUFBLEVBQ3ZDO0FBQ0EsYUFBVyxRQUFRLEtBQUssaUJBQThCLElBQUksYUFBYSxHQUFHLEdBQUc7QUFDM0UsU0FBSyxnQkFBZ0IsYUFBYTtBQUNsQyxlQUFXLGFBQWEsQ0FBQyxtQkFBbUIsc0JBQXNCLGlCQUFpQixrQkFBa0IsaUJBQWlCLHdCQUF3QixtQkFBbUIsb0JBQW9CLHVCQUF1QixzQkFBc0IsRUFBRyxNQUFLLGdCQUFnQixTQUFTO0FBQ25RLFNBQUssTUFBTSxlQUFlLGNBQWM7QUFDeEMsU0FBSyxNQUFNLGVBQWUsWUFBWTtBQUN0QyxTQUFLLE1BQU0sZUFBZSxjQUFjO0FBQ3hDLFNBQUssTUFBTSxlQUFlLHFCQUFxQjtBQUMvQyxTQUFLLE1BQU0sZUFBZSxvQkFBb0I7QUFBQSxFQUNoRDtBQUNGO0FBRU8sSUFBTSxZQUFZO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTs7O0FDcEl6QixJQUFBQyxxQkFBK0I7QUFDL0Isa0NBQTRDO0FBQzVDLElBQUFDLGdCQUE0QztBQUM1Qyx3QkFBOEI7QUFDOUIsa0JBQXNDOzs7QUNhL0IsU0FBUyxpQkFDZCxhQUNBLGNBQThDLENBQUMsYUFBYSxTQUFTLEdBQ3pEO0FBQ1osUUFBTSxxQkFBcUIsWUFBWTtBQUN2QyxNQUFJLGNBQWMsWUFBWTtBQUM5QixNQUFJLGVBQWUsWUFBWTtBQUMvQixNQUFJLFNBQVM7QUFDYixRQUFNLGlCQUFpQixDQUFDLFVBQWtCLGFBQWEsS0FBSyxJQUFJO0FBRWhFLFFBQU0sYUFBYSxDQUFDLFlBQWdDO0FBQ2xELFFBQUksUUFBUSxpQkFBaUIsZUFBZ0IsZ0JBQWUsUUFBUTtBQUNwRSxrQkFBYyxFQUFFLEdBQUcsU0FBUyxjQUFjLGFBQWE7QUFDdkQsdUJBQW1CLEtBQUssYUFBYSxFQUFFLEdBQUcsU0FBUyxjQUFjLGVBQWUsQ0FBQztBQUFBLEVBQ25GO0FBRUEsUUFBTSxpQkFBaUIsWUFBWSxnQkFBZ0I7QUFDbkQsY0FBWSxhQUFhO0FBQ3pCLE1BQUk7QUFDRixlQUFXLFdBQVc7QUFDdEIsZ0JBQVksUUFBUTtBQUVwQixnQkFBWSxNQUFNO0FBQUUsVUFBSSxPQUFRLGFBQVksZUFBZSxpQkFBaUIsQ0FBQztBQUFBLElBQUcsQ0FBQztBQUFBLEVBQ25GLFNBQVMsT0FBTztBQUNkLGdCQUFZLGFBQWE7QUFDekIsdUJBQW1CLEtBQUssYUFBYSxXQUFXO0FBQ2hELGdCQUFZLFFBQVE7QUFDcEIsVUFBTTtBQUFBLEVBQ1I7QUFFQSxTQUFPLE1BQU07QUFDWCxRQUFJLENBQUMsT0FBUTtBQUNiLGFBQVM7QUFDVCxVQUFNLFVBQVUsWUFBWSxnQkFBZ0IsS0FBSztBQUVqRCxRQUFJLFlBQVksZUFBZSxXQUFZO0FBQzNDLGdCQUFZLGFBQWE7QUFDekIsdUJBQW1CLEtBQUssYUFBYSxXQUFXO0FBQ2hELGdCQUFZLFFBQVE7QUFDcEIsZ0JBQVksTUFBTTtBQUNoQixVQUFJLFlBQVksZUFBZSxtQkFBb0IsYUFBWSxlQUFlLE1BQU07QUFBQSxJQUN0RixDQUFDO0FBQUEsRUFDSDtBQUNGO0FBV0EsSUFBTSxZQUFZLG9CQUFJLElBQUk7QUFBQSxFQUN4QjtBQUFBLEVBQVE7QUFBQSxFQUFlO0FBQUEsRUFBZTtBQUFBLEVBQWlCO0FBQUEsRUFDdkQ7QUFBQSxFQUEyQjtBQUFBLEVBQVE7QUFDckMsQ0FBQztBQUVELFNBQVMsY0FBYyxPQUFnQixTQUE0QztBQTVFbkY7QUE2RUUsTUFBSSxDQUFDLFNBQVMsT0FBTyxVQUFVLFNBQVUsUUFBTztBQUNoRCxRQUFNLElBQUk7QUFDVixTQUFPLE9BQU8sRUFBRSxlQUFlLGNBQWMsT0FBTyxFQUFFLFlBQVksY0FDaEUsT0FBTyxFQUFFLG9CQUFvQixjQUFjLE9BQU8sRUFBRSxtQkFBbUIsY0FDdkUsU0FBTyxPQUFFLFlBQUYsbUJBQVcsa0JBQWlCLGNBQ25DLEVBQUUsUUFBUSxpQkFBaUIsTUFBTTtBQUNyQztBQUdPLFNBQVMsd0JBQXdCLFNBSXRDO0FBMUZGO0FBMkZFLFFBQU0sTUFBTSxPQUFPLEtBQUssT0FBTyxFQUFFLEtBQUssQ0FBQyxTQUFTLEtBQUssV0FBVyxlQUFlLENBQUM7QUFDaEYsTUFBSSxDQUFDLElBQUssUUFBTyxFQUFFLFVBQVUsTUFBTTtBQUNuQyxRQUFNLE9BQU87QUFDYixNQUFJLFFBQWtDLEtBQUssR0FBRztBQUU5QyxNQUFJLE9BQU87QUFDWCxXQUFTLFFBQVEsSUFBRyw2QkFBTSxXQUFVLFFBQVEsS0FBSyxRQUFTLFFBQU8sS0FBSztBQUN0RSxRQUFJLGtDQUFNLGNBQU4sbUJBQWlCLFlBQVcsS0FBSyxVQUFVLFlBQVksU0FBUSwrQkFBTyxXQUFXLFNBQVEsTUFBTTtBQUNuRyxXQUFTLFFBQVEsR0FBRyxTQUFTLFFBQVEsSUFBSSxTQUFTLFFBQVEsTUFBTSxRQUFRO0FBQ3RFLFVBQU0sV0FBVSxXQUFNLGtCQUFOLG1CQUFxQjtBQUNyQyxRQUFJLE9BQU8sWUFBWSxTQUFVO0FBQ2pDLFFBQUksQ0FBQyxVQUFVLElBQUksT0FBTyxFQUFHLFFBQU8sRUFBRSxVQUFVLE1BQU07QUFDdEQsZUFBVyxTQUFTLENBQUMsT0FBTyxNQUFNLFNBQVMsR0FBRztBQUM1QyxVQUFJLE9BQU8sK0JBQU87QUFDbEIsZUFBUyxRQUFRLEdBQUcsUUFBUSxRQUFRLEtBQUssU0FBUyxPQUFPLEtBQUssTUFBTTtBQUNsRSxjQUFNLFFBQVEsS0FBSztBQUNuQixjQUFNLGFBQWEsQ0FBQyxLQUFLO0FBQ3pCLFlBQUksU0FBUyxPQUFPLFVBQVUsWUFBWSxhQUFhLE1BQU8sWUFBVyxLQUFLLE1BQU0sT0FBTztBQUMzRixtQkFBVyxhQUFhLFlBQVk7QUFDbEMsY0FBSSxjQUFjLFdBQVcsT0FBTyxFQUFHLFFBQU8sRUFBRSxVQUFVLE1BQU0sYUFBYSxXQUFXLFFBQVE7QUFBQSxRQUNsRztBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQ0EsV0FBTyxFQUFFLFVBQVUsS0FBSztBQUFBLEVBQzFCO0FBQ0EsU0FBTyxFQUFFLFVBQVUsTUFBTTtBQUMzQjs7O0FDL0dPLFNBQVMsWUFBWUMsV0FBb0IsUUFBd0MsVUFJcEYsQ0FBQyxHQUFlO0FBVnBCO0FBV0UsUUFBTSxTQUFTQSxVQUFTO0FBQ3hCLFFBQU0sV0FBVyxvQkFBSSxJQUE0RztBQUNqSSxNQUFJLFFBQVE7QUFDWixNQUFJLFVBQVU7QUFDZCxNQUFJLGFBQWE7QUFDakIsTUFBSSxjQUFjO0FBQ2xCLFFBQU0saUJBQWlCLE9BQU8sT0FBTyxtQkFBbUIsYUFBYSxJQUFJLE9BQU8sZUFBZSxNQUFNLFNBQVMsQ0FBQyxJQUFJO0FBRW5ILFdBQVMsT0FBTztBQW5CbEIsUUFBQUMsS0FBQUM7QUFvQkksWUFBUTtBQUNSLFFBQUksUUFBUztBQUNiLGVBQVcsQ0FBQyxTQUFTLEtBQUssS0FBSyxVQUFVO0FBQ3ZDLFVBQUksQ0FBQyxRQUFRLGFBQWE7QUFDeEIseURBQWdCLFVBQVU7QUFDMUIsY0FBTSxRQUFRO0FBQ2Qsb0JBQVksTUFBTSxJQUFJO0FBQ3RCLGlCQUFTLE9BQU8sT0FBTztBQUFBLE1BQ3pCO0FBQUEsSUFDRjtBQUNBLFFBQUksY0FBYztBQUNsQixVQUFNLFdBQVcsb0JBQUksSUFBMEI7QUFDL0MsZUFBVyxXQUFXRixVQUFTLGlCQUE4Qiw2QkFBNkIsR0FBRztBQUMzRixVQUFJLFFBQVEsU0FBUyxJQUFJLE9BQU87QUFDaEMsVUFBSTtBQUNGLGNBQU0sUUFBUSx3QkFBd0IsT0FBTztBQUM3QyxZQUFJLFVBQVUsQ0FBQyxNQUFNLFlBQVksTUFBTSxnQkFBZ0IsTUFBTSxjQUFjO0FBQ3pFLGdCQUFNLFFBQVE7QUFDZCxzQkFBWSxNQUFNLElBQUk7QUFDdEIsbUJBQVMsT0FBTyxPQUFPO0FBQ3ZCLDJEQUFnQixVQUFVO0FBQzFCLGtCQUFRO0FBQUEsUUFDVjtBQUNBLFlBQUksQ0FBQyxPQUFPO0FBQ1YsY0FBSSxDQUFDLE1BQU0sU0FBVTtBQUNyQixjQUFJLENBQUMsTUFBTSxhQUFhO0FBQUU7QUFBZTtBQUFBLFVBQVU7QUFFbkQsZ0JBQU0sT0FBTyxRQUFRO0FBQ3JCLGNBQUksRUFBQyw2QkFBTSxjQUFjLDRCQUEyQjtBQUFFO0FBQWU7QUFBQSxVQUFVO0FBQy9FLGtCQUFRO0FBQUEsWUFDTixTQUFTLE1BQU07QUFBQSxZQUNmLGFBQWEsTUFBTTtBQUFBLFlBQ25CLFNBQVMsaUJBQWlCLE1BQU0sYUFBYSxDQUFDLGFBQWE7QUFBRSxxQkFBTyxzQkFBc0IsUUFBUTtBQUFBLFlBQUcsQ0FBQztBQUFBLFlBQ3RHO0FBQUEsVUFDRjtBQUNBLG1CQUFTLElBQUksU0FBUyxLQUFLO0FBQzNCLDJEQUFnQixRQUFRO0FBQUEsUUFDMUI7QUFBQSxNQUNGLFFBQVE7QUFFTjtBQUNBO0FBQUEsTUFDRjtBQUNBLFlBQU0sTUFBTSxRQUFRLGNBQTJCLFlBQVk7QUFDM0QsWUFBTSxjQUFjLE1BQU0sS0FBSyxNQUFNLEtBQUssaUJBQThCLDhDQUE4QyxDQUFDO0FBQ3ZILFlBQU0sU0FBUyxZQUFZLElBQUksQ0FBQyxTQUFTO0FBakUvQyxZQUFBQyxLQUFBQyxLQUFBO0FBa0VRLGNBQU0sS0FBSyxLQUFLLGFBQWEscUJBQXFCO0FBQ2xELGNBQU0sVUFBU0EsT0FBQUQsTUFBQSxNQUFNLE1BQUssMkJBQUssYUFBWSxDQUFDLENBQUMsRUFBRSxLQUFLLENBQUMsVUFBVSxNQUFNLGFBQWEsZ0JBQWdCLE1BQU0sRUFBRSxNQUEzRixnQkFBQUEsSUFBOEYsZ0JBQTlGLGdCQUFBQyxJQUEyRyxPQUFPLE1BQU0sR0FBRztBQUMxSSxlQUFPLEVBQUUsSUFBSSxTQUFPLFVBQUssZ0JBQUwsbUJBQWtCLFdBQVUsV0FBVyxFQUFFLEdBQUcsT0FBTztBQUFBLE1BQ3pFLENBQUMsRUFBRSxPQUFPLENBQUMsVUFBVSxDQUFDLFVBQVUsTUFBTSxFQUFFLENBQUM7QUFDekMsZUFBUyxJQUFJLE1BQU0sU0FBUyxFQUFFLElBQUksTUFBTSxTQUFTLE9BQU8sQ0FBQztBQUN6RCxZQUFNLFdBQVNELE1BQUEsUUFBUSxjQUFSLGdCQUFBQSxJQUFBLGNBQW9CLE1BQU0sU0FBUyxPQUFPLElBQUksQ0FBQyxVQUFVLE1BQU0sRUFBRSxPQUFNLGNBQWMsT0FBTyxJQUFJLENBQUMsVUFBVSxNQUFNLEVBQUUsQ0FBQztBQUNuSSxZQUFNLFNBQVMsSUFBSSxJQUFJLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLElBQUksTUFBTSxLQUFLLENBQUMsQ0FBQztBQUNyRSxZQUFNLGNBQWMsTUFBTSxZQUFZLGdCQUFnQjtBQUN0RCxZQUFNLEtBQUssUUFBUSxpQkFBOEIsWUFBWSxDQUFDLEVBQUUsUUFBUSxDQUFDRSxNQUFLLFVBQU87QUExRTNGLFlBQUFGO0FBMkVRLHlCQUFVRSxNQUFLLE9BQU8sUUFBUSxRQUFRLEVBQUUsU0FBT0YsTUFBQSxZQUFZLEtBQUssTUFBakIsZ0JBQUFBLElBQW9CLFVBQVMsT0FBTyxnQkFBZ0IsUUFBUSxZQUFZLENBQUM7QUFBQSxPQUFDO0FBQzNILGlCQUFXLFVBQVUsTUFBTSxLQUFLLGlCQUE4Qiw4QkFBOEIsRUFBRyxXQUFVLFFBQVEsTUFBTSxRQUFRLE1BQU07QUFBQSxJQUN2STtBQUNBLFVBQU0sU0FBUyxFQUFFLFFBQVEsU0FBUyxNQUFNLFlBQVk7QUFDcEQsVUFBTSxZQUFZLEtBQUssVUFBVSxNQUFNO0FBQ3ZDLFFBQUksY0FBYyxZQUFZO0FBQUUsbUJBQWE7QUFBVyxhQUFPLE1BQU07QUFBQSxJQUFHO0FBQ3hFLFVBQU0sU0FBUyxDQUFDLEdBQUcsU0FBUyxPQUFPLENBQUM7QUFDcEMsVUFBTSxtQkFBbUIsS0FBSyxVQUFVLE9BQU8sSUFBSSxDQUFDLFdBQVcsRUFBRSxHQUFHLE9BQU8sUUFBUSxNQUFNLE9BQU8sSUFBSSxDQUFDLEVBQUUsSUFBSSxNQUFNLE9BQU8sRUFBRSxJQUFJLE1BQU0sRUFBRSxFQUFFLEVBQUUsQ0FBQztBQUMzSSxRQUFJLHFCQUFxQixhQUFhO0FBQUUsb0JBQWM7QUFBa0IsT0FBQUMsTUFBQSxRQUFRLGNBQVIsZ0JBQUFBLElBQUEsY0FBb0I7QUFBQSxJQUFTO0FBQUEsRUFDdkc7QUFFQSxXQUFTLFdBQVc7QUFDbEIsUUFBSSxDQUFDLFdBQVcsQ0FBQyxNQUFPLFNBQVEsT0FBTyxzQkFBc0IsSUFBSTtBQUFBLEVBQ25FO0FBQ0EsUUFBTSxXQUFXLElBQUksT0FBTyxpQkFBaUIsUUFBUTtBQUNyRCxXQUFTLFFBQVFGLFVBQVMsTUFBTSxFQUFFLFNBQVMsTUFBTSxXQUFXLE1BQU0sZUFBZSxLQUFLLENBQUM7QUFDdkYsUUFBQUEsVUFBUyxVQUFULG1CQUFnQixNQUFNLEtBQUssVUFBVSxNQUFNLE1BQU07QUFBQSxFQUFDO0FBRWxELFFBQU0sUUFBUSxPQUFPLFlBQVksVUFBVSxHQUFJO0FBQy9DLFFBQU0sZUFBYyxhQUFRLGNBQVIsaUNBQW9CO0FBQ3hDLFdBQVM7QUFFVCxTQUFPLE1BQU07QUFDWCxjQUFVO0FBQ1YsYUFBUyxXQUFXO0FBQ3BCLHFEQUFnQjtBQUNoQjtBQUNBLFdBQU8sY0FBYyxLQUFLO0FBQzFCLFdBQU8scUJBQXFCLEtBQUs7QUFDakMsZUFBVyxFQUFFLFNBQVMsS0FBSyxLQUFLLFNBQVMsT0FBTyxHQUFHO0FBQ2pELGNBQVE7QUFDUixrQkFBWSxJQUFJO0FBQUEsSUFDbEI7QUFDQSxhQUFTLE1BQU07QUFBQSxFQUNqQjtBQUNGOzs7QUM5R0Esd0JBQStCO0FBQy9CLG1DQUFtRDtBQUs1QyxJQUFNLDBCQUFzQixpRUFBbUQsRUFBRTtBQUFBLEVBQ3RGLElBQUk7QUFBQSxFQUNKLGNBQWMsRUFBRSxhQUFhLE1BQU0sWUFBWSxjQUFjO0FBQy9ELENBQUM7QUFFTSxJQUFNLDZCQUF5QixrQ0FBZTtBQUFBLEVBQ25ELElBQUk7QUFBQSxFQUNKLGFBQWEsQ0FBQyxPQUFPO0FBQ25CLFVBQU0sT0FBTyxHQUFHLE9BQU8sb0JBQW9CLFdBQVc7QUFDdEQsVUFBTSxlQUFlLE1BQTRCLEtBQUs7QUFDdEQsV0FBTyxNQUFNO0FBQUEsRUFDZjtBQUNGLENBQUM7OztBQ2xCRCxJQUFBSSxxQkFBK0I7QUFDL0IsNkJBQXFIOzs7QUNEckgsSUFBQUMsZ0JBQXNCOzs7QUNBdEIsbUJBQXlDO0FBc0JwQjtBQVpyQixJQUFNLFlBQXVDLEVBQUUsU0FBUyxjQUFjLFdBQVcsZUFBZSxRQUFRLFNBQVM7QUFDakgsSUFBTSxXQUFtQztBQUFBLEVBQ3ZDLE1BQU07QUFBQSxFQUFnQyxXQUFXO0FBQUEsRUFBZSxRQUFRO0FBQUEsRUFBVyxPQUFPO0FBQUEsRUFDMUYsUUFBUTtBQUFBLEVBQWMsY0FBYztBQUFBLEVBQWMsS0FBSztBQUFBLEVBQU8sS0FBSztBQUFBLEVBQVMsUUFBUTtBQUFBLEVBQ3BGLFVBQVU7QUFBQSxFQUFLLE1BQU07QUFBQSxFQUFrQixLQUFLO0FBQUEsRUFBYSxZQUFZO0FBQ3ZFO0FBRU8sSUFBTSxlQUFlLENBQUMsRUFBRSxRQUFRLFVBQVUsU0FBUyxTQUFTLE1BQW1CO0FBakJ0RjtBQWtCRSxRQUFNLENBQUMsU0FBUyxVQUFVLFFBQUkseUJBQVMsWUFBTyxDQUFDLE1BQVIsbUJBQVcsT0FBTSxNQUFNO0FBQzlELFFBQU0sQ0FBQyxRQUFRLFNBQVMsUUFBSSx1QkFBUyxTQUFTLE1BQU07QUFDcEQsUUFBTSxDQUFDLFNBQVMsVUFBVSxRQUFJLHVCQUF3QixJQUFJO0FBQzFELFFBQU0sUUFBUSxPQUFPLEtBQUssQ0FBQyxjQUFjLFVBQVUsT0FBTyxPQUFPLEtBQUssT0FBTyxDQUFDO0FBQzlFLE1BQUksQ0FBQyxNQUFPLFFBQU8sNkNBQUMsU0FBSSxXQUFVLGNBQWE7QUFBQSxnREFBQyxPQUFFLHlDQUEyQjtBQUFBLElBQUksNENBQUMsWUFBTyxTQUFTLFVBQVUsbUJBQUs7QUFBQSxLQUFTO0FBQzFILFFBQU0sTUFBTSxNQUFNLE9BQU8sSUFBSSxDQUFDLFVBQVUsTUFBTSxFQUFFO0FBQ2hELFFBQU0sU0FBUyxjQUFjLEtBQUssT0FBTyxNQUFNLEVBQUUsQ0FBQztBQUNsRCxRQUFNLE9BQU8sSUFBSSxJQUFJLE1BQU0sT0FBTyxJQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sSUFBSSxLQUFLLENBQUMsQ0FBQztBQUduRSxRQUFNLHNCQUFzQixDQUFDLE1BQW1CLGFBQXdDO0FBQ3RGLFVBQU0sVUFBVSxJQUFJLElBQUksR0FBRztBQUMzQixVQUFNLFlBQVksQ0FBQyxHQUFHLEtBQUssTUFBTTtBQUNqQyxVQUFNLFdBQVUscUNBQVUsV0FBVSxDQUFDLEdBQUcsUUFBUSxDQUFDLFVBQVU7QUFDekQsVUFBSSxDQUFDLFFBQVEsSUFBSSxNQUFNLEVBQUUsRUFBRyxRQUFPLENBQUMsS0FBSztBQUN6QyxZQUFNLGNBQWMsVUFBVSxNQUFNO0FBQ3BDLGFBQU8sY0FBYyxDQUFDLFdBQVcsSUFBSSxDQUFDO0FBQUEsSUFDeEMsQ0FBQztBQUNELFdBQU8sRUFBRSxHQUFHLE1BQU0sUUFBUSxDQUFDLEdBQUcsUUFBUSxHQUFHLFNBQVMsRUFBRTtBQUFBLEVBQ3REO0FBQ0EsUUFBTSxTQUFTLENBQUMsU0FBc0IsVUFBVSxDQUFDLGNBQWMsRUFBRSxHQUFHLFVBQVUsQ0FBQyxNQUFNLEVBQUUsR0FBRyxvQkFBb0IsTUFBTSxTQUFTLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRTtBQUMxSSxRQUFNLE9BQU8sQ0FBQyxJQUFZLE1BQWlCLFdBQW9CLE9BQU8sVUFBVSxRQUFRLElBQUksTUFBTSxNQUFNLENBQUM7QUFFekcsV0FBUyxLQUFLLE9BQWtCLE1BQWlCLFFBQWlCO0FBQ2hFLFVBQU0sZUFBZTtBQUNyQixVQUFNLGdCQUFnQjtBQUN0QixVQUFNLEtBQUssTUFBTSxhQUFhLFFBQVEsWUFBWSxLQUFLO0FBQ3ZELFFBQUksTUFBTSxJQUFJLFNBQVMsRUFBRSxFQUFHLE1BQUssSUFBSSxNQUFNLE1BQU07QUFDakQsZUFBVyxJQUFJO0FBQUEsRUFDakI7QUFFQSxXQUFTLE1BQU0sT0FBb0IsV0FBbUI7QUFqRHhELFFBQUFDO0FBa0RJLFVBQU0sUUFBUSxPQUFPLE9BQU8sT0FBTyxDQUFDLGNBQWMsVUFBVSxTQUFTLE1BQU0sSUFBSTtBQUMvRSxVQUFNLFFBQVEsTUFBTSxVQUFVLENBQUMsY0FBYyxVQUFVLE9BQU8sTUFBTSxFQUFFO0FBQ3RFLFFBQUksY0FBYyxNQUFNLFFBQVEsRUFBRyxNQUFLLE1BQU0sSUFBSSxNQUFNLE1BQU0sTUFBTSxRQUFRLENBQUMsRUFBRSxFQUFFO0FBQ2pGLFFBQUksY0FBYyxLQUFLLFFBQVEsTUFBTSxTQUFTLEVBQUcsTUFBSyxNQUFNLElBQUksTUFBTSxPQUFNQSxNQUFBLE1BQU0sUUFBUSxDQUFDLE1BQWYsZ0JBQUFBLElBQWtCLEVBQUU7QUFBQSxFQUNsRztBQUVBLFdBQVMsVUFBVSxPQUFvQjtBQXhEekMsUUFBQUE7QUF5REksVUFBTSxVQUFRQSxNQUFBLEtBQUssSUFBSSxNQUFNLEVBQUUsTUFBakIsZ0JBQUFBLElBQW9CLFVBQVMsTUFBTTtBQUNqRCxVQUFNLFFBQVEsT0FBTyxPQUFPLE9BQU8sQ0FBQyxjQUFjLFVBQVUsU0FBUyxNQUFNLElBQUk7QUFDL0UsVUFBTSxRQUFRLE1BQU0sVUFBVSxDQUFDLGNBQWMsVUFBVSxPQUFPLE1BQU0sRUFBRTtBQUN0RSxXQUNFO0FBQUEsTUFBQztBQUFBO0FBQUEsUUFBSSxXQUFXLGFBQWEsWUFBWSxNQUFNLEtBQUssaUJBQWlCLEVBQUU7QUFBQSxRQUNyRSxXQUFTO0FBQUEsUUFBQyxhQUFhLENBQUMsVUFBVTtBQUFFLGdCQUFNLGFBQWEsUUFBUSxjQUFjLE1BQU0sRUFBRTtBQUFHLGdCQUFNLGFBQWEsZ0JBQWdCO0FBQVEscUJBQVcsTUFBTSxFQUFFO0FBQUEsUUFBRztBQUFBLFFBQ3pKLFdBQVcsTUFBTSxXQUFXLElBQUk7QUFBQSxRQUFHLFlBQVksQ0FBQyxVQUFVLE1BQU0sZUFBZTtBQUFBLFFBQUcsUUFBUSxDQUFDLFVBQVUsS0FBSyxPQUFPLE1BQU0sTUFBTSxNQUFNLEVBQUU7QUFBQSxRQUNySTtBQUFBLHVEQUFDLFNBQUksV0FBVSxtQkFBa0I7QUFBQSx3REFBQyxVQUFLLFdBQVUsWUFBVyxlQUFZLFFBQU8sMEJBQUU7QUFBQSxZQUFPLDRDQUFDLFlBQVEsaUJBQU07QUFBQSxhQUFTO0FBQUEsVUFDaEgsNkNBQUMsU0FBSSxXQUFVLHFCQUNiO0FBQUEsd0RBQUMsWUFBTyxNQUFLLFVBQVMsY0FBWSxRQUFRLEtBQUssU0FBUyxVQUFVLFVBQVUsR0FBRyxTQUFTLE1BQU0sTUFBTSxPQUFPLEVBQUUsR0FBRyxvQkFBQztBQUFBLFlBQ2pILDRDQUFDLFlBQU8sTUFBSyxVQUFTLGNBQVksUUFBUSxLQUFLLFVBQVUsVUFBVSxVQUFVLE1BQU0sU0FBUyxHQUFHLFNBQVMsTUFBTSxNQUFNLE9BQU8sQ0FBQyxHQUFHLG9CQUFDO0FBQUEsWUFDaEksNkNBQUMsWUFBTyxjQUFZLFlBQVksS0FBSyxJQUFJLE9BQU8sTUFBTSxNQUFNLFVBQVUsQ0FBQyxVQUFVLEtBQUssTUFBTSxJQUFJLE1BQU0sT0FBTyxLQUFrQixHQUM3SDtBQUFBLDBEQUFDLFlBQU8sT0FBTSxXQUFXLHdCQUFjLE1BQU0sRUFBRSxJQUFJLGdCQUFnQixjQUFhO0FBQUEsY0FDL0UsQ0FBQyxjQUFjLE1BQU0sRUFBRSxLQUFLLDRDQUFDLFlBQU8sT0FBTSxhQUFZLHlCQUFXO0FBQUEsY0FDbEUsNENBQUMsWUFBTyxPQUFNLFVBQVMsVUFBVSxVQUFVLE1BQU0sRUFBRSxNQUFNLFFBQVEsb0JBQU07QUFBQSxlQUN6RTtBQUFBLGFBQ0Y7QUFBQSxVQUNDLE1BQU0sU0FBUyxZQUFZLENBQUMsY0FBYyxNQUFNLEVBQUUsS0FBSyw2Q0FBQyxXQUFNLFdBQVUsYUFBYTtBQUFBLG1CQUFPLGlCQUFpQixNQUFNLFNBQVMsY0FBYyxvQkFBb0I7QUFBQSxZQUM3SjtBQUFBLGNBQUM7QUFBQTtBQUFBLGdCQUFNLE1BQUs7QUFBQSxnQkFBUSxLQUFJO0FBQUEsZ0JBQUksS0FBSTtBQUFBLGdCQUFLLE9BQU8sTUFBTTtBQUFBLGdCQUFPLFVBQVUsT0FBTyxpQkFBaUIsTUFBTSxTQUFTO0FBQUEsZ0JBQWEsY0FBWSxhQUFhLEtBQUs7QUFBQSxnQkFDbkosVUFBVSxDQUFDLFVBQVUsT0FBTyxFQUFFLEdBQUcsUUFBUSxRQUFRLE9BQU8sT0FBTyxJQUFJLENBQUMsY0FBYyxVQUFVLE9BQU8sTUFBTSxLQUFLLEVBQUUsR0FBRyxXQUFXLE9BQU8sT0FBTyxNQUFNLE9BQU8sS0FBSyxFQUFFLElBQUksU0FBUyxFQUFFLENBQUM7QUFBQTtBQUFBLFlBQUc7QUFBQSxZQUNyTCw0Q0FBQyxZQUFRLGdCQUFNLE9BQU07QUFBQSxhQUN2QjtBQUFBO0FBQUE7QUFBQSxNQWpCOEUsTUFBTTtBQUFBLElBa0J0RjtBQUFBLEVBRUo7QUFFQSxXQUFTLFlBQVksTUFBK0I7QUFDbEQsVUFBTSxTQUFTLE9BQU8sT0FBTyxPQUFPLENBQUMsVUFBVSxNQUFNLFNBQVMsUUFBUSxDQUFDLGNBQWMsTUFBTSxFQUFFLENBQUM7QUFDOUYsVUFBTSxPQUFPLFNBQVMsZUFBZSxPQUFPO0FBQzVDLFdBQU8sNkNBQUMsU0FBSSxXQUFXLGdDQUFnQyxJQUFJLElBQUksT0FBTyxxQkFBcUIsRUFBRSxJQUFJLE9BQU8sRUFBRSxxQkFBcUIsT0FBTyxTQUFZLE9BQU8sSUFBSSxDQUFDLFVBQVUsYUFBYSxNQUFNLEtBQUssS0FBSyxFQUFFLEtBQUssR0FBRyxFQUFFLEdBQzlNO0FBQUEsYUFBTyxJQUFJLENBQUMsT0FBTyxVQUFVO0FBQzVCLGNBQU0sU0FBUyxLQUFLLElBQUksTUFBTSxFQUFFO0FBQ2hDLGNBQU0sVUFBUyxpQ0FBUSxXQUFVLFNBQVMsVUFBVSxNQUFNLEVBQUUsQ0FBQyxLQUFLO0FBQ2xFLGNBQU0sY0FBYyxDQUFDLFVBQVUsT0FBTyxFQUFFLFNBQVMsVUFBVSxNQUFNLEVBQUUsQ0FBQyxJQUNoRSw4QkFBOEIsS0FBSyxNQUFNLElBQUksc0JBQXNCLG1DQUFtQyxLQUFLLE1BQU0sSUFBSSx1QkFBdUIsS0FDNUk7QUFDSixjQUFNLGFBQWEsU0FBUyxlQUFlLFFBQVEsS0FBSyxZQUFZLE1BQU0sRUFBRSxNQUFNLFlBQVksT0FBTyxRQUFRLENBQUMsRUFBRSxFQUFFO0FBQ2xILGVBQU8sNkNBQUMsU0FBSSxXQUFXLHFCQUFxQixhQUFhLHNCQUFzQixFQUFFLElBQW1CLE9BQU8sR0FBRyxpQ0FBUSxLQUFLLEtBQUssTUFBTSxJQUNsSTtBQUFBLG9CQUFTLGFBQWEsT0FBTyxVQUFVLFNBQVMsNENBQUMsVUFBSyxXQUFVLHFCQUFxQiwyQ0FBUSxPQUFNO0FBQUEsVUFDckcsNENBQUMsVUFBSyxXQUFXLEdBQUcsVUFBVSxNQUFNLEVBQUUsTUFBTSxTQUFTLHFCQUFxQixFQUFFLElBQUksV0FBVyxJQUFLLGtCQUFPO0FBQUEsYUFGZixNQUFNLEVBR2hHO0FBQUEsTUFDRixDQUFDO0FBQUEsTUFDQSxDQUFDLE9BQU8sVUFBVSw0Q0FBQyxVQUFLLFdBQVUsa0JBQWlCLG9DQUFzQjtBQUFBLE9BQzVFO0FBQUEsRUFDRjtBQUVBLFNBQU8sNkNBQUMsU0FBSSxXQUFVLGNBQ3BCO0FBQUEsaURBQUMsU0FBSSxXQUFVLHNCQUNiO0FBQUEsbURBQUMsV0FBTTtBQUFBO0FBQUEsUUFBSyw0Q0FBQyxZQUFPLGNBQVcsaUJBQWdCLE9BQU8sTUFBTSxJQUFJLFVBQVUsQ0FBQyxVQUFVO0FBQUUscUJBQVcsTUFBTSxPQUFPLEtBQUs7QUFBRyxxQkFBVyxJQUFJO0FBQUEsUUFBRyxHQUN0SSxpQkFBTyxJQUFJLENBQUMsY0FBYyw0Q0FBQyxZQUEwQixPQUFPLFVBQVUsSUFBSyxvQkFBVSxHQUFHLFFBQVEsTUFBTSxHQUFHLEtBQWxFLFVBQVUsRUFBMEQsQ0FBUyxHQUN2SDtBQUFBLFNBQVM7QUFBQSxNQUNULDZDQUFDLFNBQUksV0FBVSxlQUFjO0FBQUEsb0RBQUMsVUFBSyx3QkFBVTtBQUFBLFFBQzNDLDRDQUFDLFlBQU8sTUFBSyxVQUFTLFNBQVMsTUFBTSxPQUFPLGNBQWMsS0FBSyxVQUFVLENBQUMsR0FBRyxzQkFBUTtBQUFBLFFBQ3JGLDRDQUFDLFlBQU8sTUFBSyxVQUFTLFNBQVMsTUFBTSxPQUFPLGNBQWMsS0FBSyxpQkFBaUIsQ0FBQyxHQUFHLDZCQUFlO0FBQUEsUUFDbkcsNENBQUMsWUFBTyxNQUFLLFVBQVMsU0FBUyxNQUFNLE9BQU8sY0FBYyxLQUFLLEtBQUssQ0FBQyxHQUFHLHdCQUFVO0FBQUEsU0FDcEY7QUFBQSxPQUNGO0FBQUEsSUFDQSw2Q0FBQyxTQUFJLFdBQVUsZUFBYyxjQUFXLGtCQUN0QztBQUFBLGtEQUFDLFNBQUksV0FBVSxxQkFBb0IsMEJBQVk7QUFBQSxNQUM5QyxZQUFZLFNBQVM7QUFBQSxNQUFHLFlBQVksV0FBVztBQUFBLE9BQ2xEO0FBQUEsSUFDQSw0Q0FBQyxPQUFFLFdBQVUsWUFBVywySEFBNkc7QUFBQSxJQUNySSw0Q0FBQyxTQUFJLFdBQVUsYUFDWCxXQUFDLFdBQVcsV0FBVyxFQUFZLElBQUksQ0FBQyxTQUFTO0FBQUEsTUFBQztBQUFBO0FBQUEsUUFBUSxXQUFXLFlBQVksVUFBVSxtQkFBbUIsRUFBRTtBQUFBLFFBQ2hILGNBQVksVUFBVSxJQUFJO0FBQUEsUUFBRyxZQUFZLENBQUMsVUFBVSxNQUFNLGVBQWU7QUFBQSxRQUFHLFFBQVEsQ0FBQyxVQUFVLEtBQUssT0FBTyxJQUFJO0FBQUEsUUFDL0c7QUFBQSx1REFBQyxRQUFJO0FBQUEsc0JBQVUsSUFBSTtBQUFBLFlBQUU7QUFBQSxZQUFDLDRDQUFDLFVBQU0saUJBQU8sT0FBTyxPQUFPLENBQUMsVUFBVSxNQUFNLFNBQVMsSUFBSSxFQUFFLFFBQU87QUFBQSxhQUFPO0FBQUEsVUFDL0YsT0FBTyxPQUFPLE9BQU8sQ0FBQyxVQUFVLE1BQU0sU0FBUyxJQUFJLEVBQUUsSUFBSSxTQUFTO0FBQUEsVUFDbEUsQ0FBQyxPQUFPLE9BQU8sS0FBSyxDQUFDLFVBQVUsTUFBTSxTQUFTLElBQUksS0FBSyw0Q0FBQyxPQUFFLFdBQVUsa0JBQWlCLCtCQUFpQjtBQUFBO0FBQUE7QUFBQSxNQUprQjtBQUFBLElBSzNILENBQVUsR0FDWjtBQUFBLElBQ0EsNkNBQUMsYUFBUSxXQUFVLGNBQWEsY0FBVyxpQkFBZ0IsWUFBWSxDQUFDLFVBQVUsTUFBTSxlQUFlLEdBQUcsUUFBUSxDQUFDLFVBQVUsS0FBSyxPQUFPLFFBQVEsR0FDL0k7QUFBQSxtREFBQyxRQUFHO0FBQUE7QUFBQSxRQUFPLDRDQUFDLFVBQU0saUJBQU8sT0FBTyxPQUFPLENBQUMsVUFBVSxNQUFNLFNBQVMsUUFBUSxFQUFFLFFBQU87QUFBQSxTQUFPO0FBQUEsTUFDekYsNENBQUMsU0FBSSxXQUFVLG1CQUFtQixpQkFBTyxPQUFPLE9BQU8sQ0FBQyxVQUFVLE1BQU0sU0FBUyxRQUFRLEVBQUUsSUFBSSxTQUFTLEdBQUU7QUFBQSxNQUN6RyxDQUFDLE9BQU8sT0FBTyxLQUFLLENBQUMsVUFBVSxNQUFNLFNBQVMsUUFBUSxLQUFLLDRDQUFDLE9BQUUsV0FBVSxrQkFBaUIsMkNBQTZCO0FBQUEsT0FDekg7QUFBQSxJQUNBLDZDQUFDLFNBQUksV0FBVSxzQkFBcUI7QUFBQSxtREFBQyxXQUFNO0FBQUEsb0RBQUMsV0FBTSxNQUFLLFlBQVcsY0FBVyw4QkFBNkIsU0FBUyxPQUFPLGVBQWUsVUFBVSxDQUFDLFVBQVUsT0FBTyxFQUFFLEdBQUcsUUFBUSxlQUFlLE1BQU0sT0FBTyxRQUFRLENBQUMsR0FBRztBQUFBLFFBQUU7QUFBQSxTQUEyQjtBQUFBLE1BQ3JQLDZDQUFDLFdBQU07QUFBQSxvREFBQyxXQUFNLE1BQUssWUFBVyxTQUFTLE9BQU8sVUFBVSxPQUFPLGVBQWUsVUFBVSxPQUFPLGVBQWUsVUFBVSxDQUFDLFVBQVUsT0FBTyxFQUFFLEdBQUcsUUFBUSxRQUFRLE1BQU0sT0FBTyxRQUFRLENBQUMsR0FBRztBQUFBLFFBQUU7QUFBQSxTQUFvQjtBQUFBLE1BQzlNLDRDQUFDLFVBQUssbUdBQWdGO0FBQUEsT0FDeEY7QUFBQSxJQUNDLE9BQU8saUJBQWlCLDRDQUFDLE9BQUUsV0FBVSxZQUFXLHNKQUF3STtBQUFBLElBQ3pMLDZDQUFDLFNBQUksV0FBVSxxQkFBb0I7QUFBQSxrREFBQyxZQUFPLE1BQUssVUFBUyxTQUFTLFVBQVUsb0JBQU07QUFBQSxNQUFTLDRDQUFDLFlBQU8sV0FBVSxhQUFZLE1BQUssVUFBUyxTQUFTLE1BQU0sUUFBUSxFQUFFLEdBQUcsVUFBVSxRQUFRLEVBQUUsR0FBRyxRQUFRLENBQUMsTUFBTSxFQUFFLEdBQUcsb0JBQW9CLFFBQVEsT0FBTyxNQUFNLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxHQUFHLDBCQUFZO0FBQUEsT0FBUztBQUFBLEtBQ3pSO0FBQ0Y7OztBRHBJSSxJQUFBQyxzQkFBQTtBQUhHLElBQU0scUJBQXFCLENBQUMsVUFBdUI7QUFDeEQsUUFBTSxjQUFVLHFCQUFNO0FBQ3RCLFNBQU8sOENBQUMsYUFBUSxXQUFVLGFBQVksTUFBSyxVQUFTLGNBQVcsUUFBTyxtQkFBaUIsU0FDckY7QUFBQSxrREFBQyxZQUFPLFdBQVUsb0JBQ2hCO0FBQUEsbURBQUMsUUFBRyxJQUFJLFNBQVMsNkJBQWU7QUFBQSxNQUNoQyw2Q0FBQyxZQUFPLE1BQUssVUFBUyxjQUFXLHVCQUFzQixTQUFTLE1BQU0sVUFBVSxrQkFBTztBQUFBLE9BQ3pGO0FBQUEsSUFDQSw2Q0FBQyxTQUFJLFdBQVUscUJBQW9CLHVEQUFDLGdCQUFjLEdBQUcsT0FBTyxHQUFFO0FBQUEsS0FDaEU7QUFDRjs7O0FESlMsSUFBQUMsc0JBQUE7QUFKVCxJQUFNLHVCQUFtQixxQ0FBd0YsRUFBRSxlQUFlO0FBRWxJLElBQU0sY0FBYyxDQUFDLEVBQUUsT0FBTyxDQUFDLFFBQVEsUUFBUSxFQUFFLE1BQTJDO0FBQzFGLFFBQU0sY0FBVSw0Q0FBb0IsZ0JBQWdCO0FBQ3BELFNBQU8sNkNBQUMsc0JBQW1CLFFBQWdCLFVBQW9CLFNBQVMsQ0FBQyxVQUFVLFFBQVEsS0FBSyxHQUFHLFVBQVUsTUFBTSxRQUFRLElBQUksR0FBRztBQUNwSTtBQUVPLElBQU0sNkJBQXlCLGdEQUF3QixFQUFFLE1BQU0sa0JBQWtCLFdBQVcsYUFBYSxTQUFTLE1BQU0sS0FBSyxDQUFDO0FBRTlILElBQU0sMkJBQXVCLG1DQUFlO0FBQUEsRUFDakQsSUFBSTtBQUFBLEVBQ0osY0FBYyxDQUFDLDhDQUF1QjtBQUFBLEVBQ3RDLGFBQWEsQ0FBQyxPQUFPO0FBQ25CLFVBQU0sT0FBTyxHQUFHLE9BQU8sK0NBQXdCLElBQUksZ0JBQWdCLEVBQUUsSUFBSSxHQUFHLFFBQVEsQ0FBQyxFQUFFO0FBQ3ZGLFdBQU8sTUFBTTtBQUFBLEVBQ2Y7QUFDRixDQUFDOzs7QUpzQ0csSUFBQUMsc0JBQUE7QUFqREosSUFBTSxTQUFTLE1BQU07QUFDbkIsUUFBTSxtQkFBZSxpQ0FBYyxzQkFBc0I7QUFDekQsUUFBTSxpQkFBYSxpQ0FBYyxvQkFBb0I7QUFDckQsUUFBTSxDQUFDLFVBQVUsV0FBVyxRQUFJLHdCQUF5QixhQUFhO0FBQ3RFLFFBQU0sQ0FBQyxLQUFLLE1BQU0sUUFBSSx3QkFBNkIsSUFBSTtBQUN2RCxRQUFNLENBQUMsT0FBTyxRQUFRLFFBQUksd0JBQVMsRUFBRTtBQUNyQyxRQUFNLENBQUMsU0FBUyxVQUFVLFFBQUksd0JBQVMsS0FBSztBQUM1QyxRQUFNLENBQUMsUUFBUSxTQUFTLFFBQUksd0JBQXlCLENBQUMsQ0FBQztBQUN2RCxRQUFNLGtCQUFjLHNCQUFPLFFBQVE7QUFDbkMsUUFBTSxjQUFVLHNCQUFtQixNQUFNO0FBQUEsRUFBQyxDQUFDO0FBQzNDLFFBQU0sQ0FBQyxRQUFRLFNBQVMsUUFBSSx3QkFBdUIsRUFBRSxRQUFRLEdBQUcsYUFBYSxFQUFFLENBQUM7QUFDaEYsK0JBQVUsTUFBTTtBQUNkLFFBQUksWUFBWTtBQUNoQixRQUFJO0FBQ0osaUJBQWEsRUFBRSxLQUFLLENBQUMsVUFBVTtBQUM3QixVQUFJLFVBQVc7QUFDZixhQUFPLEtBQUs7QUFDWixrQkFBWSxpQkFBaUIsTUFBTSxJQUFJLENBQUMsQ0FBQztBQUN6QyxvQkFBVSxzQkFBUyxNQUFNLE1BQU0sSUFBSSxHQUFHLENBQUMsU0FBUyxZQUFZLGlCQUFpQixJQUFJLENBQUMsQ0FBQztBQUFBLElBQ3JGLENBQUMsRUFBRSxNQUFNLE1BQU07QUFBRSxVQUFJLENBQUMsVUFBVyxVQUFTLGdFQUFnRTtBQUFBLElBQUcsQ0FBQztBQUM5RyxXQUFPLE1BQU07QUFBRSxrQkFBWTtBQUFNO0FBQUEsSUFBYTtBQUFBLEVBQ2hELEdBQUcsQ0FBQyxZQUFZLENBQUM7QUFDakIsK0JBQVUsTUFBTTtBQUNkLGdCQUFZLFVBQVU7QUFDdEIsWUFBUSxRQUFRO0FBQUEsRUFDbEIsR0FBRyxDQUFDLFFBQVEsQ0FBQztBQUNiLCtCQUFVLE1BQU07QUFDZCxRQUFJLENBQUMsT0FBTyxDQUFDLFNBQVMsUUFBUztBQUMvQixXQUFPLFlBQVksVUFBVSxXQUFXO0FBQUEsTUFDdEMsV0FBVyxDQUFDLFNBQVMsUUFBUSxjQUFjLEtBQUssWUFBWSxRQUFRLE9BQU8sT0FBTyxDQUFDO0FBQUEsTUFDbkYsV0FBVztBQUFBLE1BQ1gsV0FBVyxDQUFDLGFBQWE7QUFBRSxnQkFBUSxVQUFVO0FBQVUsZUFBTyxNQUFNO0FBQUUsa0JBQVEsVUFBVSxNQUFNO0FBQUEsVUFBQztBQUFBLFFBQUc7QUFBQSxNQUFHO0FBQUEsSUFDdkcsQ0FBQztBQUFBLEVBQ0gsR0FBRyxDQUFDLEtBQUssU0FBUyxPQUFPLENBQUM7QUFDMUIsV0FBUyxLQUFLLE9BQXVCO0FBQ25DLFFBQUksQ0FBQyxJQUFLO0FBQ1YsaUNBQVksTUFBTSxJQUFJLElBQUksaUJBQWlCLEtBQUssQ0FBQyxDQUFDO0FBQUEsRUFDcEQ7QUFDQSxpQkFBZSxPQUFPO0FBQ3BCLFFBQUksUUFBUztBQUNiLGVBQVcsSUFBSTtBQUNmLFFBQUk7QUFDRixZQUFNLFNBQVMsTUFBTSxXQUFXLFFBQVEsUUFBUTtBQUNoRCxVQUFJLE9BQVEsTUFBSyxNQUFNO0FBQUEsSUFDekIsUUFBUTtBQUFFLGVBQVMsa0VBQWtFO0FBQUEsSUFBRyxVQUN4RjtBQUFVLGlCQUFXLEtBQUs7QUFBQSxJQUFHO0FBQUEsRUFDL0I7QUFDQSxRQUFNLFFBQVEsUUFBUSxnQkFBZ0IsQ0FBQyxNQUFNLGtCQUFrQixDQUFDLFNBQVMsVUFBVSxpQkFBaUIsT0FBTyxjQUFjLHNCQUFzQjtBQUMvSSxTQUNFLDhDQUFDLFVBQUssT0FBTyxFQUFFLFNBQVMsZUFBZSxLQUFLLE1BQU0sR0FBRztBQUFBO0FBQUEsTUFBQztBQUFBO0FBQUEsUUFDcEQsV0FBVTtBQUFBLFFBQ1YsTUFBSztBQUFBLFFBQ0wsVUFBVSxDQUFDO0FBQUEsUUFDWCxnQkFBYyxTQUFTO0FBQUEsUUFDdkIsT0FBTyxVQUFVLFNBQVMsVUFDdEIsc0JBQXNCLE9BQU8sTUFBTSxzREFDbkM7QUFBQSxRQUNKLFNBQVMsTUFBTSxLQUFLLEVBQUUsR0FBRyxVQUFVLFNBQVMsQ0FBQyxTQUFTLFFBQVEsQ0FBQztBQUFBLFFBQy9EO0FBQUE7QUFBQSxJQUFNO0FBQUEsSUFBUztBQUFBLE1BQUM7QUFBQTtBQUFBLFFBQU8sV0FBVTtBQUFBLFFBQWEsTUFBSztBQUFBLFFBQVMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxPQUFPLFVBQVUsV0FBVyxDQUFDLFNBQVM7QUFBQSxRQUNySCxPQUFNO0FBQUEsUUFBMEQsU0FBUztBQUFBLFFBQU07QUFBQTtBQUFBLElBQU87QUFBQSxLQUFTO0FBRXJHO0FBRU8sSUFBTSx5QkFBcUIsbUNBQWU7QUFBQSxFQUMvQyxJQUFJO0FBQUEsRUFDSixhQUFhLE1BQU0sT0FBTyxFQUFFLFdBQVcsUUFBUSxVQUFVLFNBQWtCLGFBQWEsR0FBRztBQUFBLEVBQzNGLGdCQUFnQjtBQUNsQixDQUFDOzs7QU83RU0sSUFBTSxZQUFZO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7OztBWFF6QixJQUFNLGlCQUFhLDBDQUFhLEVBQUUsSUFBSSw2QkFBNkIsS0FBSyxZQUFZLFVBQVUsQ0FBQztBQUV4RixJQUFNLDBCQUFzQixnQ0FBVztBQUFBLEVBQzVDLElBQUk7QUFBQSxFQUNKLFVBQVUsQ0FBQyxPQUFPLEdBQUcsU0FBUyxZQUFZLG9CQUFvQixxQkFBcUIsd0JBQXdCLHdCQUF3QixvQkFBb0I7QUFDekosQ0FBQzsiLAogICJuYW1lcyI6IFsiZG9jdW1lbnQiLCAiZmllbGQiLCAiX2EiLCAiaW1wb3J0X2luamVjdGFibGUiLCAiaW1wb3J0X3JlYWN0IiwgImRvY3VtZW50IiwgIl9hIiwgIl9iIiwgInJvdyIsICJpbXBvcnRfaW5qZWN0YWJsZSIsICJpbXBvcnRfcmVhY3QiLCAiX2EiLCAiaW1wb3J0X2pzeF9ydW50aW1lIiwgImltcG9ydF9qc3hfcnVudGltZSIsICJpbXBvcnRfanN4X3J1bnRpbWUiXQp9Cg==
