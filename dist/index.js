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
var import_react2 = require("react");
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
var import_modal_components = require("@k8slens/modal-components");

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

// src/editor-modal.injectable.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var layoutEditorKind = (0, import_modal_contracts.getModalKind)()("layout-editor");
var EditorModal = ({ input: [tables, settings] }) => {
  const respond = (0, import_modal_contracts.useRespondFromModal)(layoutEditorKind);
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(import_modal_components.ModalContainer, { $style: { width: "min(1020px, calc(100vw - 48px))", maxHeight: "calc(100vh - 48px)", overflowY: "auto" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_modal_components.ModalHeader, { onClose: () => respond(null), children: "Workload layout" }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(import_modal_components.ModalContent, { children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(LayoutEditor, { tables, settings, onApply: (value) => respond(value), onCancel: () => respond(null) }) })
  ] });
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
var import_jsx_runtime3 = require("react/jsx-runtime");
var Toggle = () => {
  const loadSettings = (0, import_use_inject.useSyncInject)(loadSettingsInjectable);
  const openEditor = (0, import_use_inject.useSyncInject)(openEditorInjectable);
  const [settings, setSettings] = (0, import_react2.useState)(emptySettings);
  const [box, setBox] = (0, import_react2.useState)(null);
  const [error, setError] = (0, import_react2.useState)("");
  const [editing, setEditing] = (0, import_react2.useState)(false);
  const [tables, setTables] = (0, import_react2.useState)([]);
  const settingsRef = (0, import_react2.useRef)(settings);
  const refresh = (0, import_react2.useRef)(() => {
  });
  const [status, setStatus] = (0, import_react2.useState)({ active: 0, unsupported: 0 });
  (0, import_react2.useEffect)(() => {
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
  (0, import_react2.useEffect)(() => {
    settingsRef.current = settings;
    refresh.current();
  }, [settings]);
  (0, import_react2.useEffect)(() => {
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
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("span", { style: { display: "inline-flex", gap: "5px" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
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
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL2luZGV4LnRzIiwgIi4uL3NyYy9jb25maWcudHMiLCAiLi4vc3JjL2F1dG8td2lkdGgudHMiLCAiLi4vc3JjL2xheW91dC50cyIsICIuLi9zcmMvc3RhdHVzLmluamVjdGFibGUudHN4IiwgIi4uL3NyYy92aXJ0dWFsaXplci50cyIsICIuLi9zcmMvY29udHJvbGxlci50cyIsICIuLi9zcmMvc2V0dGluZ3MuaW5qZWN0YWJsZS50cyIsICIuLi9zcmMvZWRpdG9yLW1vZGFsLmluamVjdGFibGUudHN4IiwgIi4uL3NyYy9lZGl0b3IudHN4IiwgIi4uL3NyYy9lZGl0b3Itc3R5bGVzLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgeyBnZXRGZWF0dXJlIH0gZnJvbSBcIkBrOHNsZW5zL2ZlYXR1cmUtY29yZVwiO1xuaW1wb3J0IHsgYXNTdHlsZXNoZWV0IH0gZnJvbSBcIkBrOHNsZW5zL3N0eWxlc2hlZXQtY29udHJhY3RzXCI7XG5pbXBvcnQgeyBsYXlvdXRDc3MgfSBmcm9tIFwiLi9sYXlvdXQudHNcIjtcbmltcG9ydCB7IHdvcmtsb2FkUm93c1RvZ2dsZSB9IGZyb20gXCIuL3N0YXR1cy5pbmplY3RhYmxlXCI7XG5pbXBvcnQgeyBlZGl0b3JDc3MgfSBmcm9tIFwiLi9lZGl0b3Itc3R5bGVzLnRzXCI7XG5pbXBvcnQgeyBsYXlvdXRTZXR0aW5nc0J1bmNoLCBsb2FkU2V0dGluZ3NJbmplY3RhYmxlIH0gZnJvbSBcIi4vc2V0dGluZ3MuaW5qZWN0YWJsZVwiO1xuaW1wb3J0IHsgbGF5b3V0RWRpdG9yTW9kYWxCdW5jaCwgb3BlbkVkaXRvckluamVjdGFibGUgfSBmcm9tIFwiLi9lZGl0b3ItbW9kYWwuaW5qZWN0YWJsZVwiO1xuXG5jb25zdCBzdHlsZXNoZWV0ID0gYXNTdHlsZXNoZWV0KHsgaWQ6IFwibGVucy13b3JrbG9hZC1yb3dzL2xheW91dFwiLCBjc3M6IGxheW91dENzcyArIGVkaXRvckNzcyB9KTtcblxuZXhwb3J0IGNvbnN0IHdvcmtsb2FkUm93c0ZlYXR1cmUgPSBnZXRGZWF0dXJlKHtcbiAgaWQ6IFwibGVucy13b3JrbG9hZC1yb3dzXCIsXG4gIHJlZ2lzdGVyOiAoZGkpID0+IGRpLnJlZ2lzdGVyKHN0eWxlc2hlZXQsIHdvcmtsb2FkUm93c1RvZ2dsZSwgbGF5b3V0U2V0dGluZ3NCdW5jaCwgbG9hZFNldHRpbmdzSW5qZWN0YWJsZSwgbGF5b3V0RWRpdG9yTW9kYWxCdW5jaCwgb3BlbkVkaXRvckluamVjdGFibGUpLFxufSk7XG4iLCAiZXhwb3J0IHR5cGUgRmllbGRMaW5lID0gXCJwcmltYXJ5XCIgfCBcInNlY29uZGFyeVwiIHwgXCJoaWRkZW5cIjtcbmV4cG9ydCB0eXBlIEZpZWxkQ29uZmlnID0geyBpZDogc3RyaW5nOyBsaW5lOiBGaWVsZExpbmU7IHdpZHRoOiBudW1iZXIgfTtcbmV4cG9ydCB0eXBlIFRhYmxlTGF5b3V0ID0geyBmaWVsZHM6IEZpZWxkQ29uZmlnW107IGxhYmVsczogYm9vbGVhbjsgYXV0b1NlY29uZGFyeTogYm9vbGVhbiB9O1xuZXhwb3J0IHR5cGUgTGF5b3V0U2V0dGluZ3MgPSB7IHZlcnNpb246IDE7IGVuYWJsZWQ6IGJvb2xlYW47IHRhYmxlczogUmVjb3JkPHN0cmluZywgVGFibGVMYXlvdXQ+IH07XG5leHBvcnQgdHlwZSBGaWVsZEluZm8gPSB7IGlkOiBzdHJpbmc7IGxhYmVsOiBzdHJpbmc7IHNhbXBsZT86IHN0cmluZyB9O1xuZXhwb3J0IHR5cGUgVGFibGVDYXRhbG9nID0geyBpZDogc3RyaW5nOyBmaWVsZHM6IEZpZWxkSW5mb1tdIH07XG5leHBvcnQgdHlwZSBQcmVzZXQgPSBcImJhbGFuY2VkXCIgfCBcImFsbFwiIHwgXCJ0cm91Ymxlc2hvb3RpbmdcIjtcblxuZXhwb3J0IGNvbnN0IGVtcHR5U2V0dGluZ3M6IExheW91dFNldHRpbmdzID0geyB2ZXJzaW9uOiAxLCBlbmFibGVkOiB0cnVlLCB0YWJsZXM6IHt9IH07XG5leHBvcnQgY29uc3Qgbm9ybWFsaXplID0gKGlkOiBzdHJpbmcpID0+IGlkLnJlcGxhY2UoL1teYS16MC05XS9naSwgXCJcIikudG9Mb3dlckNhc2UoKTtcbmV4cG9ydCBjb25zdCBpc1dhcm5pbmdJY29uID0gKGlkOiBzdHJpbmcpID0+IG5vcm1hbGl6ZShpZCkgPT09IFwic3RhdHVzaWNvblwiO1xuZXhwb3J0IGNvbnN0IGlzQ29udHJvbCA9IChpZDogc3RyaW5nKSA9PiBbXCJzZWxlY3Rpb25cIiwgXCJzZWxlY3RcIiwgXCJjaGVja2JveFwiLCBcImlkMFwiLCBcIm1lbnVcIiwgXCJhY3Rpb25zXCIsIFwiY29udGV4dG1lbnVcIl0uaW5jbHVkZXMobm9ybWFsaXplKGlkKSk7XG5jb25zdCBpc05hbWUgPSAoaWQ6IHN0cmluZykgPT4gbm9ybWFsaXplKGlkKSA9PT0gXCJuYW1lXCI7XG5jb25zdCBpc093bmVyID0gKGlkOiBzdHJpbmcpID0+IFtcImNvbnRyb2xsZWRieVwiLCBcIm93bmVyXCIsIFwib3duZXJzXCIsIFwib3duZXJyZWZlcmVuY2VzXCJdLmluY2x1ZGVzKG5vcm1hbGl6ZShpZCkpO1xuY29uc3QgaXNTdGF0dXMgPSAoaWQ6IHN0cmluZykgPT4gW1wic3RhdHVzXCIsIFwicGhhc2VcIl0uaW5jbHVkZXMobm9ybWFsaXplKGlkKSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBmaWVsZExhYmVsKGlkOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBsYWJlbHM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICAgbmFtZTogXCJOYW1lXCIsIG5hbWVzcGFjZTogXCJOYW1lc3BhY2VcIiwgY3B1OiBcIkNQVVwiLCBtZW1vcnk6IFwiTWVtb3J5XCIsIGNvbnRhaW5lcnM6IFwiQ29udGFpbmVyc1wiLFxuICAgIHJlc3RhcnRzOiBcIlJlc3RhcnRzXCIsIG5vZGU6IFwiTm9kZVwiLCBxb3M6IFwiUW9TXCIsIGFnZTogXCJBZ2VcIiwgc3RhdHVzOiBcIlN0YXR1c1wiLCBwaGFzZTogXCJTdGF0dXNcIixcbiAgICBvd25lcnM6IFwiQ29udHJvbGxlZCBCeVwiLCBvd25lcjogXCJDb250cm9sbGVkIEJ5XCIsIGNvbnRyb2xsZWRieTogXCJDb250cm9sbGVkIEJ5XCIsIHdhcm5pbmc6IFwiV2FybmluZ3NcIiwgd2FybmluZ3M6IFwiV2FybmluZ3NcIixcbiAgICBzdGF0dXNpY29uOiBcIldhcm5pbmdzXCIsXG4gIH07XG4gIHJldHVybiBsYWJlbHNbbm9ybWFsaXplKGlkKV0gPz8gaWQucmVwbGFjZSgvKFthLXpdKShbQS1aXSkvZywgXCIkMSAkMlwiKS5yZXBsYWNlKC9bLV9dL2csIFwiIFwiKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlZmF1bHRMYXlvdXQoaWRzOiBzdHJpbmdbXSwgcHJlc2V0OiBQcmVzZXQgPSBcImJhbGFuY2VkXCIpOiBUYWJsZUxheW91dCB7XG4gIGNvbnN0IGZpZWxkczogRmllbGRDb25maWdbXSA9IGlkcy5maWx0ZXIoKGlkKSA9PiAhaXNDb250cm9sKGlkKSkubWFwKChpZCkgPT4ge1xuICAgIGNvbnN0IGtleSA9IG5vcm1hbGl6ZShpZCk7XG4gICAgbGV0IGxpbmU6IEZpZWxkTGluZSA9IFwic2Vjb25kYXJ5XCI7XG4gICAgbGV0IHdpZHRoID0gL25hbWVzcGFjZXxub2RlL2kudGVzdChpZCkgPyAxMCA6IDU7XG4gICAgaWYgKGlzTmFtZShpZCkpIHsgbGluZSA9IFwicHJpbWFyeVwiOyB3aWR0aCA9IDM2OyB9XG4gICAgaWYgKGlzU3RhdHVzKGlkKSkgeyBsaW5lID0gXCJwcmltYXJ5XCI7IHdpZHRoID0gNzsgfVxuICAgIGlmIChrZXkgPT09IFwiYWdlXCIpIHsgbGluZSA9IFwicHJpbWFyeVwiOyB3aWR0aCA9IDU7IH1cbiAgICBpZiAoaXNXYXJuaW5nSWNvbihpZCkpIHsgbGluZSA9IFwicHJpbWFyeVwiOyB3aWR0aCA9IDE7IH1cbiAgICBpZiAocHJlc2V0ICE9PSBcImFsbFwiICYmIFtcInFvc1wiLCBcImNvbnRhaW5lcnNcIl0uaW5jbHVkZXMoa2V5KSkgbGluZSA9IFwiaGlkZGVuXCI7XG4gICAgaWYgKHByZXNldCA9PT0gXCJhbGxcIikge1xuICAgICAgaWYgKGtleSA9PT0gXCJhZ2VcIikgbGluZSA9IFwic2Vjb25kYXJ5XCI7XG4gICAgICBpZiAoaXNPd25lcihpZCkpIHsgbGluZSA9IFwicHJpbWFyeVwiOyB3aWR0aCA9IDEwOyB9XG4gICAgfVxuICAgIGlmIChwcmVzZXQgPT09IFwidHJvdWJsZXNob290aW5nXCIpIHtcbiAgICAgIGlmIChrZXkgPT09IFwicmVzdGFydHNcIiB8fCAvd2FybmluZy8udGVzdChrZXkpKSB7IGxpbmUgPSBcInByaW1hcnlcIjsgd2lkdGggPSA1OyB9XG4gICAgICBpZiAoa2V5ID09PSBcImNvbnRhaW5lcnNcIikgbGluZSA9IFwic2Vjb25kYXJ5XCI7XG4gICAgfVxuICAgIHJldHVybiB7IGlkLCBsaW5lLCB3aWR0aCB9O1xuICB9KTtcbiAgLy8gUHJlc2VydmUgY29sdW1uIG9yZGVyIHdpdGhpbiBlYWNoIGxpbmUsIHdpdGggTmFtZSBhbHdheXMgbGVhZGluZyB0aGUgZGVmYXVsdCBsYXlvdXQuXG4gIGZpZWxkcy5zb3J0KChhLCBiKSA9PiBOdW1iZXIoaXNOYW1lKGIuaWQpKSAtIE51bWJlcihpc05hbWUoYS5pZCkpKTtcbiAgcmV0dXJuIHsgZmllbGRzLCBsYWJlbHM6IHRydWUsIGF1dG9TZWNvbmRhcnk6IGZhbHNlIH07XG59XG5cbi8qKiBWYWxpZGF0ZSBwZXJzaXN0ZWQgb3IgaW1wb3J0ZWQgdmFsdWVzIGFuZCBtZXJnZSBjb2x1bW5zIGFkZGVkIGFmdGVyIGEgbGF5b3V0IHdhcyBzYXZlZC4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlTGF5b3V0KGlkczogc3RyaW5nW10sIHZhbHVlPzogdW5rbm93bik6IFRhYmxlTGF5b3V0IHtcbiAgY29uc3QgZGVmYXVsdHMgPSBkZWZhdWx0TGF5b3V0KGlkcyk7XG4gIGlmICghdmFsdWUgfHwgdHlwZW9mIHZhbHVlICE9PSBcIm9iamVjdFwiKSByZXR1cm4gZGVmYXVsdHM7XG4gIGNvbnN0IHJhdyA9IHZhbHVlIGFzIFBhcnRpYWw8VGFibGVMYXlvdXQ+O1xuICBpZiAoIUFycmF5LmlzQXJyYXkocmF3LmZpZWxkcykpIHJldHVybiBkZWZhdWx0cztcbiAgY29uc3QgYWxsb3dlZCA9IG5ldyBTZXQoZGVmYXVsdHMuZmllbGRzLm1hcCgoZmllbGQpID0+IGZpZWxkLmlkKSk7XG4gIGNvbnN0IHNlZW4gPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3QgZmllbGRzOiBGaWVsZENvbmZpZ1tdID0gW107XG4gIGZvciAoY29uc3QgZmllbGQgb2YgcmF3LmZpZWxkcykge1xuICAgIGlmICghZmllbGQgfHwgdHlwZW9mIGZpZWxkLmlkICE9PSBcInN0cmluZ1wiIHx8ICFhbGxvd2VkLmhhcyhmaWVsZC5pZCkgfHwgc2Vlbi5oYXMoZmllbGQuaWQpKSBjb250aW51ZTtcbiAgICBpZiAoIVtcInByaW1hcnlcIiwgXCJzZWNvbmRhcnlcIiwgXCJoaWRkZW5cIl0uaW5jbHVkZXMoZmllbGQubGluZSkpIGNvbnRpbnVlO1xuICAgIHNlZW4uYWRkKGZpZWxkLmlkKTtcbiAgICBmaWVsZHMucHVzaCh7XG4gICAgICBpZDogZmllbGQuaWQsXG4gICAgICBsaW5lOiAoaXNOYW1lKGZpZWxkLmlkKSAmJiBmaWVsZC5saW5lID09PSBcImhpZGRlblwiKSB8fCAoaXNXYXJuaW5nSWNvbihmaWVsZC5pZCkgJiYgZmllbGQubGluZSAhPT0gXCJoaWRkZW5cIikgPyBcInByaW1hcnlcIiA6IGZpZWxkLmxpbmUsXG4gICAgICB3aWR0aDogTnVtYmVyLmlzRmluaXRlKGZpZWxkLndpZHRoKSA/IE1hdGgubWF4KDEsIE1hdGgubWluKDQ4LCBNYXRoLnJvdW5kKGZpZWxkLndpZHRoKSkpIDogNSxcbiAgICB9KTtcbiAgfVxuICBmaWVsZHMucHVzaCguLi5kZWZhdWx0cy5maWVsZHMuZmlsdGVyKChmaWVsZCkgPT4gIXNlZW4uaGFzKGZpZWxkLmlkKSkpO1xuICByZXR1cm4geyBmaWVsZHMsIGxhYmVsczogcmF3LmxhYmVscyAhPT0gZmFsc2UsIGF1dG9TZWNvbmRhcnk6IHJhdy5hdXRvU2Vjb25kYXJ5ID09PSB0cnVlIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzYW5pdGl6ZVNldHRpbmdzKHZhbHVlOiB1bmtub3duKTogTGF5b3V0U2V0dGluZ3Mge1xuICBpZiAoIXZhbHVlIHx8IHR5cGVvZiB2YWx1ZSAhPT0gXCJvYmplY3RcIikgcmV0dXJuIHsgLi4uZW1wdHlTZXR0aW5ncywgdGFibGVzOiB7fSB9O1xuICBjb25zdCByYXcgPSB2YWx1ZSBhcyBQYXJ0aWFsPExheW91dFNldHRpbmdzPjtcbiAgY29uc3QgdGFibGVzOiBSZWNvcmQ8c3RyaW5nLCBUYWJsZUxheW91dD4gPSB7fTtcbiAgaWYgKHJhdy50YWJsZXMgJiYgdHlwZW9mIHJhdy50YWJsZXMgPT09IFwib2JqZWN0XCIgJiYgIUFycmF5LmlzQXJyYXkocmF3LnRhYmxlcykpIHtcbiAgICBmb3IgKGNvbnN0IFtpZCwgbGF5b3V0XSBvZiBPYmplY3QuZW50cmllcyhyYXcudGFibGVzKSkge1xuICAgICAgaWYgKCFsYXlvdXQgfHwgIUFycmF5LmlzQXJyYXkobGF5b3V0LmZpZWxkcykpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgaWRzID0gbGF5b3V0LmZpZWxkcy5maWx0ZXIoKGZpZWxkKSA9PiBmaWVsZCAmJiB0eXBlb2YgZmllbGQuaWQgPT09IFwic3RyaW5nXCIpLm1hcCgoZmllbGQpID0+IGZpZWxkLmlkKTtcbiAgICAgIHRhYmxlc1tpZF0gPSByZXNvbHZlTGF5b3V0KGlkcywgbGF5b3V0KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHsgdmVyc2lvbjogMSwgZW5hYmxlZDogcmF3LmVuYWJsZWQgIT09IGZhbHNlLCB0YWJsZXMgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1vdmVGaWVsZChsYXlvdXQ6IFRhYmxlTGF5b3V0LCBpZDogc3RyaW5nLCBsaW5lOiBGaWVsZExpbmUsIGJlZm9yZT86IHN0cmluZyk6IFRhYmxlTGF5b3V0IHtcbiAgY29uc3QgZmllbGQgPSBsYXlvdXQuZmllbGRzLmZpbmQoKGNhbmRpZGF0ZSkgPT4gY2FuZGlkYXRlLmlkID09PSBpZCk7XG4gIGlmICghZmllbGQgfHwgKGlzTmFtZShpZCkgJiYgbGluZSA9PT0gXCJoaWRkZW5cIikpIHJldHVybiBsYXlvdXQ7XG4gIGlmIChpZCA9PT0gYmVmb3JlICYmIGZpZWxkLmxpbmUgPT09IGxpbmUpIHJldHVybiBsYXlvdXQ7XG4gIGNvbnN0IGZpZWxkcyA9IGxheW91dC5maWVsZHMuZmlsdGVyKChjYW5kaWRhdGUpID0+IGNhbmRpZGF0ZS5pZCAhPT0gaWQpO1xuICBsZXQgcG9zaXRpb24gPSBiZWZvcmUgPyBmaWVsZHMuZmluZEluZGV4KChjYW5kaWRhdGUpID0+IGNhbmRpZGF0ZS5pZCA9PT0gYmVmb3JlICYmIGNhbmRpZGF0ZS5saW5lID09PSBsaW5lKSA6IC0xO1xuICBpZiAocG9zaXRpb24gPCAwKSB7XG4gICAgY29uc3QgbGFzdCA9IGZpZWxkcy5maW5kTGFzdEluZGV4KChjYW5kaWRhdGUpID0+IGNhbmRpZGF0ZS5saW5lID09PSBsaW5lKTtcbiAgICBwb3NpdGlvbiA9IGxhc3QgPCAwID8gZmllbGRzLmxlbmd0aCA6IGxhc3QgKyAxO1xuICB9XG4gIGZpZWxkcy5zcGxpY2UocG9zaXRpb24sIDAsIHsgLi4uZmllbGQsIGxpbmU6IGlzV2FybmluZ0ljb24oaWQpICYmIGxpbmUgIT09IFwiaGlkZGVuXCIgPyBcInByaW1hcnlcIiA6IGxpbmUgfSk7XG4gIHJldHVybiB7IC4uLmxheW91dCwgZmllbGRzIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXRhaWxHcm91cChpZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3Qga2V5ID0gbm9ybWFsaXplKGlkKTtcbiAgaWYgKFtcImNwdVwiLCBcIm1lbW9yeVwiLCBcImNvbnRhaW5lcnNcIiwgXCJyZXN0YXJ0c1wiXS5pbmNsdWRlcyhrZXkpKSByZXR1cm4gXCJyZXNvdXJjZXNcIjtcbiAgaWYgKGlzT3duZXIoaWQpIHx8IFtcIm5vZGVcIiwgXCJuYW1lc3BhY2VcIl0uaW5jbHVkZXMoa2V5KSkgcmV0dXJuIFwicmVsYXRpb25zXCI7XG4gIGlmIChrZXkgPT09IFwicW9zXCIpIHJldHVybiBcInF1YWxpdHlcIjtcbiAgcmV0dXJuIFwib3RoZXJcIjtcbn1cbiIsICJleHBvcnQgdHlwZSBOYXR1cmFsV2lkdGggPSB7IGlkOiBzdHJpbmc7IHByZWZlcnJlZDogbnVtYmVyOyBtaW5pbXVtOiBudW1iZXIgfTtcbmV4cG9ydCB0eXBlIEZpdHRlZFdpZHRoID0geyBpZDogc3RyaW5nOyBvZmZzZXQ6IG51bWJlcjsgd2lkdGg6IG51bWJlciB9O1xuXG4vKiogS2VlcCBzaG9ydCBmaWVsZHMgYXQgdGhlaXIgbmF0dXJhbCB3aWR0aDsgc2hyaW5rIGxvbmcgZmllbGRzIG9ubHkgd2hlbiBzcGFjZSBydW5zIG91dC4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaXROYXR1cmFsV2lkdGhzKGZpZWxkczogTmF0dXJhbFdpZHRoW10sIGF2YWlsYWJsZTogbnVtYmVyKTogRml0dGVkV2lkdGhbXSB7XG4gIGF2YWlsYWJsZSA9IE1hdGgubWF4KDAsIE51bWJlci5pc0Zpbml0ZShhdmFpbGFibGUpID8gYXZhaWxhYmxlIDogMCk7XG4gIGNvbnN0IHByZWZlcnJlZCA9IGZpZWxkcy5tYXAoKGZpZWxkKSA9PiBNYXRoLm1heCgwLCBmaWVsZC5wcmVmZXJyZWQpKTtcbiAgY29uc3QgbWluaW11bSA9IGZpZWxkcy5tYXAoKGZpZWxkLCBpbmRleCkgPT4gTWF0aC5tYXgoMCwgTWF0aC5taW4ocHJlZmVycmVkW2luZGV4XSwgZmllbGQubWluaW11bSkpKTtcbiAgY29uc3QgdG90YWwgPSBwcmVmZXJyZWQucmVkdWNlKChzdW0sIHdpZHRoKSA9PiBzdW0gKyB3aWR0aCwgMCk7XG4gIGNvbnN0IGZsb29yID0gbWluaW11bS5yZWR1Y2UoKHN1bSwgd2lkdGgpID0+IHN1bSArIHdpZHRoLCAwKTtcbiAgbGV0IHdpZHRocyA9IHByZWZlcnJlZDtcbiAgaWYgKHRvdGFsID4gYXZhaWxhYmxlKSB7XG4gICAgd2lkdGhzID0gZmxvb3IgPj0gYXZhaWxhYmxlXG4gICAgICA/IG1pbmltdW0ubWFwKCh3aWR0aCkgPT4gZmxvb3IgPyB3aWR0aCAqIGF2YWlsYWJsZSAvIGZsb29yIDogMClcbiAgICAgIDogcHJlZmVycmVkLm1hcCgod2lkdGgsIGluZGV4KSA9PiB3aWR0aCAtICh3aWR0aCAtIG1pbmltdW1baW5kZXhdKSAqICh0b3RhbCAtIGF2YWlsYWJsZSkgLyAodG90YWwgLSBmbG9vcikpO1xuICB9XG4gIGxldCBvZmZzZXQgPSAwO1xuICByZXR1cm4gZmllbGRzLm1hcCgoZmllbGQsIGluZGV4KSA9PiB7XG4gICAgY29uc3QgcmVzdWx0ID0geyBpZDogZmllbGQuaWQsIG9mZnNldCwgd2lkdGg6IHdpZHRoc1tpbmRleF0gfTtcbiAgICBvZmZzZXQgKz0gd2lkdGhzW2luZGV4XTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9KTtcbn1cblxuY29uc3QgY29udGV4dHMgPSBuZXcgV2Vha01hcDxEb2N1bWVudCwgeyBjb250ZXh0OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQgfCBudWxsOyBjYWNoZTogTWFwPHN0cmluZywgbnVtYmVyPiB9PigpO1xuXG5leHBvcnQgZnVuY3Rpb24gbWVhc3VyZVRleHQoZG9jdW1lbnQ6IERvY3VtZW50LCB0ZXh0OiBzdHJpbmcsIGZvbnQ6IHN0cmluZyk6IG51bWJlciB7XG4gIGxldCBzdGF0ZSA9IGNvbnRleHRzLmdldChkb2N1bWVudCk7XG4gIGlmICghc3RhdGUpIHtcbiAgICAvLyBUZXN0cyBhbmQgbm9uLWJyb3dzZXIgZW52aXJvbm1lbnRzIGNhbiBsYWNrIGNhbnZhcyBzdXBwb3J0LlxuICAgIGNvbnN0IHN1cHBvcnRlZCA9IHR5cGVvZiBkb2N1bWVudC5kZWZhdWx0Vmlldz8uQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEID09PSBcImZ1bmN0aW9uXCI7XG4gICAgc3RhdGUgPSB7IGNvbnRleHQ6IHN1cHBvcnRlZCA/IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIikuZ2V0Q29udGV4dChcIjJkXCIpIDogbnVsbCwgY2FjaGU6IG5ldyBNYXAoKSB9O1xuICAgIGNvbnRleHRzLnNldChkb2N1bWVudCwgc3RhdGUpO1xuICB9XG4gIGNvbnN0IGtleSA9IGAke2ZvbnR9XFxuJHt0ZXh0fWA7XG4gIGNvbnN0IGNhY2hlZCA9IHN0YXRlLmNhY2hlLmdldChrZXkpO1xuICBpZiAoY2FjaGVkICE9PSB1bmRlZmluZWQpIHJldHVybiBjYWNoZWQ7XG4gIGxldCB3aWR0aDogbnVtYmVyO1xuICBpZiAoc3RhdGUuY29udGV4dCkge1xuICAgIHN0YXRlLmNvbnRleHQuZm9udCA9IGZvbnQ7XG4gICAgd2lkdGggPSBzdGF0ZS5jb250ZXh0Lm1lYXN1cmVUZXh0KHRleHQpLndpZHRoO1xuICB9IGVsc2Ugd2lkdGggPSB0ZXh0Lmxlbmd0aCAqIChOdW1iZXIucGFyc2VGbG9hdChmb250Lm1hdGNoKC9bXFxkLl0rcHgvKT8uWzBdID8/IFwiMTNcIikgKiAwLjU1KTtcbiAgaWYgKHN0YXRlLmNhY2hlLnNpemUgPiAyMDQ4KSBzdGF0ZS5jYWNoZS5jbGVhcigpO1xuICBzdGF0ZS5jYWNoZS5zZXQoa2V5LCB3aWR0aCk7XG4gIHJldHVybiB3aWR0aDtcbn1cbiIsICJpbXBvcnQgeyBkZWZhdWx0TGF5b3V0LCBkZXRhaWxHcm91cCwgZmllbGRMYWJlbCwgaXNXYXJuaW5nSWNvbiwgbm9ybWFsaXplLCByZXNvbHZlTGF5b3V0LCB0eXBlIFRhYmxlTGF5b3V0IH0gZnJvbSBcIi4vY29uZmlnLnRzXCI7XG5pbXBvcnQgeyBmaXROYXR1cmFsV2lkdGhzLCBtZWFzdXJlVGV4dCB9IGZyb20gXCIuL2F1dG8td2lkdGgudHNcIjtcbnR5cGUgUGxhY2VtZW50ID0geyBjb2x1bW46IHN0cmluZzsgbGluZTogc3RyaW5nOyBoaWRkZW4/OiBib29sZWFuOyBzZWNvbmRhcnk/OiBib29sZWFuOyB3YXJuaW5nPzogYm9vbGVhbiB9O1xuXG4vKiogT25lIGNvbW1vbiBncmlkIGxldHMgdGhlIHR3byBsaW5lcyB1c2UgZGlmZmVyZW50IGNvbHVtbiB3aWR0aHMgd2l0aG91dCBtb3ZpbmcgRE9NIG5vZGVzLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBsYWNlbWVudHMoaWRzOiBzdHJpbmdbXSwgbGF5b3V0OiBUYWJsZUxheW91dCA9IGRlZmF1bHRMYXlvdXQoaWRzLCBcImFsbFwiKSk6IE1hcDxzdHJpbmcsIFBsYWNlbWVudD4ge1xuICBjb25zdCByZXN1bHQgPSBuZXcgTWFwPHN0cmluZywgUGxhY2VtZW50PigpO1xuICBjb25zdCBmaW5kID0gKC4uLm5hbWVzOiBzdHJpbmdbXSkgPT4gaWRzLmZpbmQoKGlkKSA9PiBuYW1lcy5pbmNsdWRlcyhub3JtYWxpemUoaWQpKSk7XG4gIGNvbnN0IHNlbGVjdGlvbiA9IGZpbmQoXCJzZWxlY3Rpb25cIiwgXCJzZWxlY3RcIiwgXCJjaGVja2JveFwiLCBcImlkMFwiKTtcbiAgY29uc3QgbWVudSA9IGZpbmQoXCJtZW51XCIsIFwiYWN0aW9uc1wiLCBcImNvbnRleHRtZW51XCIpO1xuICBpZiAoc2VsZWN0aW9uKSByZXN1bHQuc2V0KHNlbGVjdGlvbiwgeyBjb2x1bW46IFwiMSAvIDJcIiwgbGluZTogXCIxIC8gM1wiIH0pO1xuICBpZiAobWVudSkgcmVzdWx0LnNldChtZW51LCB7IGNvbHVtbjogXCIxMjIgLyAxMjNcIiwgbGluZTogXCIxIC8gM1wiIH0pO1xuXG4gIGNvbnN0IGZpZWxkcyA9IHJlc29sdmVMYXlvdXQoaWRzLCBsYXlvdXQpLmZpZWxkcztcbiAgZnVuY3Rpb24gZGlzdHJpYnV0ZShpdGVtczogeyBpZDogc3RyaW5nOyB3aWR0aDogbnVtYmVyIH1bXSwgbGluZTogc3RyaW5nLCBzZWNvbmRhcnkgPSBmYWxzZSkge1xuICAgIGNvbnN0IHRvdGFsID0gaXRlbXMucmVkdWNlKChzdW0sIGl0ZW0pID0+IHN1bSArIGl0ZW0ud2lkdGgsIDApO1xuICAgIGxldCB1c2VkID0gMDtcbiAgICBsZXQgc3RhcnQgPSAyO1xuICAgIGl0ZW1zLmZvckVhY2goKGl0ZW0sIGluZGV4KSA9PiB7XG4gICAgICB1c2VkICs9IGl0ZW0ud2lkdGg7XG4gICAgICAvLyBSZXNlcnZlIGF0IGxlYXN0IG9uZSB0cmFjayBmb3IgdGhpcyBmaWVsZCBhbmQgZXZlcnkgcmVtYWluaW5nIGZpZWxkLlxuICAgICAgY29uc3QgZW5kID0gaW5kZXggPT09IGl0ZW1zLmxlbmd0aCAtIDEgPyAxMjIgOiBNYXRoLm1heChzdGFydCArIDEsXG4gICAgICAgIE1hdGgubWluKDEyMiAtIChpdGVtcy5sZW5ndGggLSBpbmRleCAtIDEpLCAyICsgTWF0aC5yb3VuZCgxMjAgKiB1c2VkIC8gdG90YWwpKSk7XG4gICAgICByZXN1bHQuc2V0KGl0ZW0uaWQsIHsgY29sdW1uOiBgJHtzdGFydH0gLyAke2VuZH1gLCBsaW5lLCAuLi4oc2Vjb25kYXJ5ID8geyBzZWNvbmRhcnk6IHRydWUgfSA6IHt9KSB9KTtcbiAgICAgIHN0YXJ0ID0gZW5kO1xuICAgIH0pO1xuICB9XG4gIGRpc3RyaWJ1dGUoZmllbGRzLmZpbHRlcigoZmllbGQpID0+IGZpZWxkLmxpbmUgPT09IFwicHJpbWFyeVwiICYmICFpc1dhcm5pbmdJY29uKGZpZWxkLmlkKSksIFwiMSAvIDJcIik7XG4gIGRpc3RyaWJ1dGUoZmllbGRzLmZpbHRlcigoZmllbGQpID0+IGZpZWxkLmxpbmUgPT09IFwic2Vjb25kYXJ5XCIgJiYgIWlzV2FybmluZ0ljb24oZmllbGQuaWQpKSwgXCIyIC8gM1wiLCB0cnVlKTtcbiAgZm9yIChjb25zdCBmaWVsZCBvZiBmaWVsZHMuZmlsdGVyKChmaWVsZCkgPT4gZmllbGQubGluZSA9PT0gXCJoaWRkZW5cIikpIHtcbiAgICByZXN1bHQuc2V0KGZpZWxkLmlkLCB7IGNvbHVtbjogXCIyIC8gMTIyXCIsIGxpbmU6IFwiMiAvIDNcIiwgaGlkZGVuOiB0cnVlIH0pO1xuICB9XG4gIGNvbnN0IG5hbWUgPSBmaWVsZHMuZmluZCgoZmllbGQpID0+IG5vcm1hbGl6ZShmaWVsZC5pZCkgPT09IFwibmFtZVwiKTtcbiAgY29uc3Qgd2FybmluZyA9IGZpZWxkcy5maW5kKChmaWVsZCkgPT4gaXNXYXJuaW5nSWNvbihmaWVsZC5pZCkgJiYgZmllbGQubGluZSAhPT0gXCJoaWRkZW5cIik7XG4gIGNvbnN0IG5hbWVQb3NpdGlvbiA9IG5hbWUgJiYgcmVzdWx0LmdldChuYW1lLmlkKTtcbiAgaWYgKHdhcm5pbmcgJiYgbmFtZVBvc2l0aW9uKSByZXN1bHQuc2V0KHdhcm5pbmcuaWQsIHsgLi4ubmFtZVBvc2l0aW9uLCB3YXJuaW5nOiB0cnVlIH0pO1xuICByZXR1cm4gcmVzdWx0O1xufVxuXG5jb25zdCByb3dBdHRyaWJ1dGUgPSBcImRhdGEtbHdyLXJvd1wiO1xuY29uc3QgY2VsbEF0dHJpYnV0ZSA9IFwiZGF0YS1sd3ItY2VsbFwiO1xuXG5leHBvcnQgZnVuY3Rpb24gbGF5b3V0Um93KHJvdzogSFRNTEVsZW1lbnQsIGhlYWRlciA9IGZhbHNlLCBsYXlvdXQ/OiBUYWJsZUxheW91dCwgbGFiZWxzPzogTWFwPHN0cmluZywgc3RyaW5nPiwgY29udGV4dDogeyBpbmRleD86IG51bWJlcjsgYXZhaWxhYmxlV2lkdGg/OiBudW1iZXIgfSA9IHt9KTogdm9pZCB7XG4gIGNvbnN0IGNlbGxzID0gQXJyYXkuZnJvbShyb3cuY2hpbGRyZW4pLmZpbHRlcigoY2hpbGQpOiBjaGlsZCBpcyBIVE1MRWxlbWVudCA9PlxuICAgIGNoaWxkIGluc3RhbmNlb2Ygcm93Lm93bmVyRG9jdW1lbnQuZGVmYXVsdFZpZXchLkhUTUxFbGVtZW50KTtcbiAgY29uc3QgZ2V0SWQgPSAoY2VsbDogSFRNTEVsZW1lbnQpID0+XG4gICAgY2VsbC5nZXRBdHRyaWJ1dGUoaGVhZGVyID8gXCJkYXRhLWNvbHVtbi1pZC10ZXN0XCIgOiBcImRhdGEtY29sdW1uLWlkXCIpID8/XG4gICAgKGhlYWRlciAmJiBjZWxsLnF1ZXJ5U2VsZWN0b3IoXCJbZGF0YS1zZWxlY3QtYWxsLWNoZWNrYm94LXRlc3RdXCIpID8gXCJpZC0wXCIgOiBcIlwiKTtcbiAgY29uc3QgaWRzID0gY2VsbHMubWFwKGdldElkKTtcbiAgLy8gUmVmdXNlIGFuIHVua25vd24gc3RydWN0dXJlIHJhdGhlciB0aGFuIG1pc3BsYWNpbmcgY29udHJvbHMuXG4gIGlmIChpZHMuc29tZSgoaWQpID0+ICFpZCkgfHwgIWlkcy5zb21lKChpZCkgPT4gbm9ybWFsaXplKGlkKSA9PT0gXCJuYW1lXCIpKSB7XG4gICAgY2xlYXJMYXlvdXQocm93KTtcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc3QgcG9zaXRpb25zID0gcGxhY2VtZW50cyhpZHMsIGxheW91dCk7XG4gIGNvbnN0IHJlc29sdmVkID0gcmVzb2x2ZUxheW91dChpZHMsIGxheW91dCA/PyBkZWZhdWx0TGF5b3V0KGlkcywgXCJhbGxcIikpO1xuICBjb25zdCBzaG93TGFiZWxzID0gQm9vbGVhbihsYXlvdXQ/LmxhYmVscykgfHwgcmVzb2x2ZWQuYXV0b1NlY29uZGFyeTtcbiAgY29uc3QgZGV0YWlscyA9IHJlc29sdmVkLmZpZWxkcy5maWx0ZXIoKGZpZWxkKSA9PiBmaWVsZC5saW5lID09PSBcInNlY29uZGFyeVwiICYmICFpc1dhcm5pbmdJY29uKGZpZWxkLmlkKSk7XG4gIGNvbnN0IGdyb3VwU3RhcnRzID0gbmV3IFNldChkZXRhaWxzLmZpbHRlcigoZmllbGQsIGluZGV4KSA9PiBpbmRleCA+IDAgJiYgZGV0YWlsR3JvdXAoZmllbGQuaWQpICE9PSBkZXRhaWxHcm91cChkZXRhaWxzW2luZGV4IC0gMV0uaWQpKS5tYXAoKGZpZWxkKSA9PiBmaWVsZC5pZCkpO1xuICBjb25zdCB3YXJuaW5nQ2VsbCA9IGNlbGxzLmZpbmQoKGNlbGwpID0+IGlzV2FybmluZ0ljb24oZ2V0SWQoY2VsbCkpKTtcbiAgY29uc3Qgd2FybmluZ1Zpc2libGUgPSB3YXJuaW5nQ2VsbCAmJiAhcG9zaXRpb25zLmdldChnZXRJZCh3YXJuaW5nQ2VsbCkpPy5oaWRkZW4gJiYgQm9vbGVhbih3YXJuaW5nQ2VsbC5xdWVyeVNlbGVjdG9yKFwiYnV0dG9uLCBzdmcsIGlucHV0XCIpIHx8IHdhcm5pbmdDZWxsLnRleHRDb250ZW50Py50cmltKCkpO1xuICByb3cuc2V0QXR0cmlidXRlKHJvd0F0dHJpYnV0ZSwgaGVhZGVyID8gXCJoZWFkZXJcIiA6IFwiZGF0YVwiKTtcbiAgcm93LnNldEF0dHJpYnV0ZShcImRhdGEtbHdyLWxhYmVsc1wiLCBzaG93TGFiZWxzID8gXCJ0cnVlXCIgOiBcImZhbHNlXCIpO1xuICByb3cuc2V0QXR0cmlidXRlKFwiZGF0YS1sd3Itc3RyaXBlXCIsIChjb250ZXh0LmluZGV4ID8/IDApICUgMiA/IFwib2RkXCIgOiBcImV2ZW5cIik7XG4gIGZvciAoY29uc3QgY2VsbCBvZiBjZWxscykge1xuICAgIGNvbnN0IHBsYWNlbWVudCA9IHBvc2l0aW9ucy5nZXQoZ2V0SWQoY2VsbCkpO1xuICAgIGlmICghcGxhY2VtZW50KSBjb250aW51ZTtcbiAgICBjZWxsLnNldEF0dHJpYnV0ZShjZWxsQXR0cmlidXRlLCBcIlwiKTtcbiAgICBjZWxsLnN0eWxlLnNldFByb3BlcnR5KFwiLS1sd3ItY29sdW1uXCIsIHBsYWNlbWVudC5jb2x1bW4pO1xuICAgIGNlbGwuc3R5bGUuc2V0UHJvcGVydHkoXCItLWx3ci1saW5lXCIsIHBsYWNlbWVudC5saW5lKTtcbiAgICBjZWxsLnRvZ2dsZUF0dHJpYnV0ZShcImRhdGEtbHdyLWhpZGRlblwiLCBwbGFjZW1lbnQuaGlkZGVuID09PSB0cnVlKTtcbiAgICBjZWxsLnRvZ2dsZUF0dHJpYnV0ZShcImRhdGEtbHdyLXNlY29uZGFyeVwiLCBwbGFjZW1lbnQuc2Vjb25kYXJ5ID09PSB0cnVlKTtcbiAgICBjZWxsLnRvZ2dsZUF0dHJpYnV0ZShcImRhdGEtbHdyLW5hbWVcIiwgbm9ybWFsaXplKGdldElkKGNlbGwpKSA9PT0gXCJuYW1lXCIpO1xuICAgIGNlbGwudG9nZ2xlQXR0cmlidXRlKFwiZGF0YS1sd3Itc3RhdHVzXCIsIFtcInN0YXR1c1wiLCBcInBoYXNlXCJdLmluY2x1ZGVzKG5vcm1hbGl6ZShnZXRJZChjZWxsKSkpKTtcbiAgICBpZiAoY2VsbC5oYXNBdHRyaWJ1dGUoXCJkYXRhLWx3ci1zdGF0dXNcIikpIHtcbiAgICAgIGNvbnN0IHZhbHVlID0gY2VsbC5xdWVyeVNlbGVjdG9yKFwic3BhbiwgYVwiKSA/PyBjZWxsLmZpcnN0RWxlbWVudENoaWxkO1xuICAgICAgaWYgKHZhbHVlKSBjZWxsLnN0eWxlLnNldFByb3BlcnR5KFwiLS1sd3Itc3RhdHVzLWNvbG9yXCIsIHJvdy5vd25lckRvY3VtZW50LmRlZmF1bHRWaWV3IS5nZXRDb21wdXRlZFN0eWxlKHZhbHVlKS5jb2xvcik7XG4gICAgfVxuICAgIGNlbGwudG9nZ2xlQXR0cmlidXRlKFwiZGF0YS1sd3ItZ3JvdXAtc3RhcnRcIiwgZ3JvdXBTdGFydHMuaGFzKGdldElkKGNlbGwpKSk7XG4gICAgY2VsbC50b2dnbGVBdHRyaWJ1dGUoXCJkYXRhLWx3ci13YXJuaW5nXCIsIHBsYWNlbWVudC53YXJuaW5nID09PSB0cnVlKTtcbiAgICBjZWxsLnRvZ2dsZUF0dHJpYnV0ZShcImRhdGEtbHdyLWVtcHR5LWljb25cIiwgcGxhY2VtZW50Lndhcm5pbmcgPT09IHRydWUgJiYgIXdhcm5pbmdWaXNpYmxlKTtcbiAgICBjZWxsLnRvZ2dsZUF0dHJpYnV0ZShcImRhdGEtbHdyLWhhcy13YXJuaW5nXCIsIG5vcm1hbGl6ZShnZXRJZChjZWxsKSkgPT09IFwibmFtZVwiICYmIEJvb2xlYW4od2FybmluZ1Zpc2libGUpKTtcbiAgICBjZWxsLnRvZ2dsZUF0dHJpYnV0ZShcImRhdGEtbHdyLWF1dG9cIiwgIWhlYWRlciAmJiBwbGFjZW1lbnQuc2Vjb25kYXJ5ID09PSB0cnVlICYmIHJlc29sdmVkLmF1dG9TZWNvbmRhcnkpO1xuICAgIGNlbGwuc2V0QXR0cmlidXRlKFwiZGF0YS1sd3ItbGFiZWxcIiwgaXNXYXJuaW5nSWNvbihnZXRJZChjZWxsKSkgPyBcIlwiIDogbGFiZWxzPy5nZXQoZ2V0SWQoY2VsbCkpID8/IGZpZWxkTGFiZWwoZ2V0SWQoY2VsbCkpKTtcbiAgICBjZWxsLnN0eWxlLnJlbW92ZVByb3BlcnR5KFwiLS1sd3Itb2Zmc2V0XCIpO1xuICAgIGNlbGwuc3R5bGUucmVtb3ZlUHJvcGVydHkoXCItLWx3ci1uYXR1cmFsLXdpZHRoXCIpO1xuICB9XG4gIGlmICghaGVhZGVyICYmIHJlc29sdmVkLmF1dG9TZWNvbmRhcnkpIHtcbiAgICBjb25zdCBhdmFpbGFibGUgPSBNYXRoLm1heCgwLCAoY29udGV4dC5hdmFpbGFibGVXaWR0aCA/PyByb3cuY2xpZW50V2lkdGgpIC0gODApO1xuICAgIGNvbnN0IG5hdHVyYWwgPSBkZXRhaWxzLm1hcCgoZmllbGQpID0+IHtcbiAgICAgIGNvbnN0IGNlbGwgPSBjZWxscy5maW5kKChjYW5kaWRhdGUpID0+IGdldElkKGNhbmRpZGF0ZSkgPT09IGZpZWxkLmlkKSE7XG4gICAgICBjb25zdCB2YWx1ZSA9IGNlbGwudGV4dENvbnRlbnQ/LnRyaW0oKSA/PyBcIlwiO1xuICAgICAgY29uc3Qgc3R5bGUgPSByb3cub3duZXJEb2N1bWVudC5kZWZhdWx0VmlldyEuZ2V0Q29tcHV0ZWRTdHlsZShjZWxsKTtcbiAgICAgIGNvbnN0IGZvbnRTaXplID0gTnVtYmVyLnBhcnNlRmxvYXQoc3R5bGUuZm9udFNpemUpIHx8IDEzO1xuICAgICAgY29uc3QgZm9udCA9IGAke3N0eWxlLmZvbnRXZWlnaHQgfHwgXCI0MDBcIn0gJHtmb250U2l6ZX1weCAke3N0eWxlLmZvbnRGYW1pbHkgfHwgXCJzeXN0ZW0tdWlcIn1gO1xuICAgICAgY29uc3QgbGFiZWwgPSBjZWxsLmdldEF0dHJpYnV0ZShcImRhdGEtbHdyLWxhYmVsXCIpID8/IFwiXCI7XG4gICAgICBjb25zdCBsYWJlbFdpZHRoID0gc2hvd0xhYmVscyA/IG1lYXN1cmVUZXh0KHJvdy5vd25lckRvY3VtZW50LCBsYWJlbCwgYDQwMCAke2ZvbnRTaXplICogMC44NX1weCAke3N0eWxlLmZvbnRGYW1pbHkgfHwgXCJzeXN0ZW0tdWlcIn1gKSArIDYgOiAwO1xuICAgICAgY29uc3QgY29udHJvbHMgPSB2YWx1ZSA/IDAgOiBNYXRoLm1heCgxNiwgY2VsbC5xdWVyeVNlbGVjdG9yQWxsKFwic3ZnLCBpbnB1dCwgYnV0dG9uXCIpLmxlbmd0aCAqIDE4KTtcbiAgICAgIGNvbnN0IHBhZGRpbmcgPSAxMiArIChncm91cFN0YXJ0cy5oYXMoZmllbGQuaWQpID8gMTMgOiAwKSArIChjZWxsLmhhc0F0dHJpYnV0ZShcImRhdGEtbHdyLWhhcy13YXJuaW5nXCIpID8gMjYgOiAwKTtcbiAgICAgIGNvbnN0IHByZWZlcnJlZCA9IE1hdGguY2VpbChtZWFzdXJlVGV4dChyb3cub3duZXJEb2N1bWVudCwgdmFsdWUsIGZvbnQpICsgY29udHJvbHMgKyBsYWJlbFdpZHRoICsgcGFkZGluZyArIDIpO1xuICAgICAgcmV0dXJuIHsgaWQ6IGZpZWxkLmlkLCBwcmVmZXJyZWQsIG1pbmltdW06IE1hdGgubWluKHByZWZlcnJlZCwgbGFiZWxXaWR0aCArIHBhZGRpbmcgKyA0MCkgfTtcbiAgICB9KTtcbiAgICBmb3IgKGNvbnN0IGZpdHRlZCBvZiBmaXROYXR1cmFsV2lkdGhzKG5hdHVyYWwsIGF2YWlsYWJsZSkpIHtcbiAgICAgIGNvbnN0IGNlbGwgPSBjZWxscy5maW5kKChjYW5kaWRhdGUpID0+IGdldElkKGNhbmRpZGF0ZSkgPT09IGZpdHRlZC5pZCkhO1xuICAgICAgY2VsbC5zdHlsZS5zZXRQcm9wZXJ0eShcIi0tbHdyLW9mZnNldFwiLCBgJHtmaXR0ZWQub2Zmc2V0LnRvRml4ZWQoMil9cHhgKTtcbiAgICAgIGNlbGwuc3R5bGUuc2V0UHJvcGVydHkoXCItLWx3ci1uYXR1cmFsLXdpZHRoXCIsIGAke2ZpdHRlZC53aWR0aC50b0ZpeGVkKDIpfXB4YCk7XG4gICAgICBpZiAoY2VsbC5oYXNBdHRyaWJ1dGUoXCJkYXRhLWx3ci1uYW1lXCIpICYmIHdhcm5pbmdDZWxsICYmIHdhcm5pbmdWaXNpYmxlKSB7XG4gICAgICAgIHdhcm5pbmdDZWxsLnNldEF0dHJpYnV0ZShcImRhdGEtbHdyLWF1dG9cIiwgXCJcIik7XG4gICAgICAgIHdhcm5pbmdDZWxsLnN0eWxlLnNldFByb3BlcnR5KFwiLS1sd3Itb2Zmc2V0XCIsIGAke2ZpdHRlZC5vZmZzZXQudG9GaXhlZCgyKX1weGApO1xuICAgICAgICB3YXJuaW5nQ2VsbC5zdHlsZS5zZXRQcm9wZXJ0eShcIi0tbHdyLW5hdHVyYWwtd2lkdGhcIiwgXCIyNHB4XCIpO1xuICAgICAgfVxuICAgIH1cbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gY2xlYXJMYXlvdXQocm9vdDogSFRNTEVsZW1lbnQpOiB2b2lkIHtcbiAgZm9yIChjb25zdCByb3cgb2YgWy4uLihyb290Lm1hdGNoZXMoYFske3Jvd0F0dHJpYnV0ZX1dYCkgPyBbcm9vdF0gOiBbXSksIC4uLnJvb3QucXVlcnlTZWxlY3RvckFsbChgWyR7cm93QXR0cmlidXRlfV1gKV0pIHtcbiAgICByb3cucmVtb3ZlQXR0cmlidXRlKHJvd0F0dHJpYnV0ZSk7XG4gICAgcm93LnJlbW92ZUF0dHJpYnV0ZShcImRhdGEtbHdyLWxhYmVsc1wiKTtcbiAgICByb3cucmVtb3ZlQXR0cmlidXRlKFwiZGF0YS1sd3Itc3RyaXBlXCIpO1xuICB9XG4gIGZvciAoY29uc3QgY2VsbCBvZiByb290LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KGBbJHtjZWxsQXR0cmlidXRlfV1gKSkge1xuICAgIGNlbGwucmVtb3ZlQXR0cmlidXRlKGNlbGxBdHRyaWJ1dGUpO1xuICAgIGZvciAoY29uc3QgYXR0cmlidXRlIG9mIFtcImRhdGEtbHdyLWhpZGRlblwiLCBcImRhdGEtbHdyLXNlY29uZGFyeVwiLCBcImRhdGEtbHdyLW5hbWVcIiwgXCJkYXRhLWx3ci1sYWJlbFwiLCBcImRhdGEtbHdyLWF1dG9cIiwgXCJkYXRhLWx3ci1ncm91cC1zdGFydFwiLCBcImRhdGEtbHdyLXN0YXR1c1wiLCBcImRhdGEtbHdyLXdhcm5pbmdcIiwgXCJkYXRhLWx3ci1lbXB0eS1pY29uXCIsIFwiZGF0YS1sd3ItaGFzLXdhcm5pbmdcIl0pIGNlbGwucmVtb3ZlQXR0cmlidXRlKGF0dHJpYnV0ZSk7XG4gICAgY2VsbC5zdHlsZS5yZW1vdmVQcm9wZXJ0eShcIi0tbHdyLWNvbHVtblwiKTtcbiAgICBjZWxsLnN0eWxlLnJlbW92ZVByb3BlcnR5KFwiLS1sd3ItbGluZVwiKTtcbiAgICBjZWxsLnN0eWxlLnJlbW92ZVByb3BlcnR5KFwiLS1sd3Itb2Zmc2V0XCIpO1xuICAgIGNlbGwuc3R5bGUucmVtb3ZlUHJvcGVydHkoXCItLWx3ci1uYXR1cmFsLXdpZHRoXCIpO1xuICAgIGNlbGwuc3R5bGUucmVtb3ZlUHJvcGVydHkoXCItLWx3ci1zdGF0dXMtY29sb3JcIik7XG4gIH1cbn1cblxuZXhwb3J0IGNvbnN0IGxheW91dENzcyA9IGBcbltkYXRhLWx3ci1yb3ddIHtcbiAgZGlzcGxheTogZ3JpZCAhaW1wb3J0YW50O1xuICBncmlkLXRlbXBsYXRlLWNvbHVtbnM6IDQwcHggcmVwZWF0KDEyMCwgbWlubWF4KDAsIDFmcikpIDQwcHggIWltcG9ydGFudDtcbiAgZ3JpZC10ZW1wbGF0ZS1yb3dzOiByZXBlYXQoMiwgbWlubWF4KDAsIDFmcikpICFpbXBvcnRhbnQ7XG4gIHdpZHRoOiAxMDAlICFpbXBvcnRhbnQ7XG4gIG1pbi13aWR0aDogMCAhaW1wb3J0YW50O1xuICBib3gtc2l6aW5nOiBib3JkZXItYm94O1xufVxuW2RhdGEtbHdyLXJvdz1cImhlYWRlclwiXSB7IGhlaWdodDogNTZweCAhaW1wb3J0YW50OyB0cmFuc2Zvcm06IG5vbmUgIWltcG9ydGFudDsgfVxuW2RhdGEtbHdyLXJvdz1cImhlYWRlclwiXVtkYXRhLWx3ci1sYWJlbHM9XCJ0cnVlXCJdIHsgaGVpZ2h0OiAzMHB4ICFpbXBvcnRhbnQ7IH1cbltkYXRhLWx3ci1yb3c9XCJoZWFkZXJcIl1bZGF0YS1sd3ItbGFiZWxzPVwidHJ1ZVwiXSBbZGF0YS1sd3ItY2VsbF0geyBncmlkLXJvdzogMSAvIDMgIWltcG9ydGFudDsgfVxuW2RhdGEtbHdyLXJvdz1cImhlYWRlclwiXVtkYXRhLWx3ci1sYWJlbHM9XCJ0cnVlXCJdIFtkYXRhLWx3ci1zZWNvbmRhcnldIHsgZGlzcGxheTogbm9uZSAhaW1wb3J0YW50OyB9XG5bZGF0YS1sd3Itcm93PVwiaGVhZGVyXCJdIFtkYXRhLWx3ci1ncm91cC1zdGFydF0geyBib3JkZXI6IDA7IH1cbltkYXRhLXRhYmxlLWhlYWQtdGVzdF06aGFzKFtkYXRhLWx3ci1yb3ddKSB7IHBhZGRpbmctaW5saW5lOiAwICFpbXBvcnRhbnQ7IH1cbltkYXRhLWx3ci1jZWxsXSB7XG4gIGdyaWQtY29sdW1uOiB2YXIoLS1sd3ItY29sdW1uKSAhaW1wb3J0YW50O1xuICBncmlkLXJvdzogdmFyKC0tbHdyLWxpbmUpICFpbXBvcnRhbnQ7XG4gIHdpZHRoOiBhdXRvICFpbXBvcnRhbnQ7XG4gIG1pbi13aWR0aDogMCAhaW1wb3J0YW50O1xuICBtYXgtd2lkdGg6IG5vbmUgIWltcG9ydGFudDtcbiAgb3ZlcmZsb3c6IGhpZGRlbjtcbiAgd2hpdGUtc3BhY2U6IG5vd3JhcCAhaW1wb3J0YW50O1xuICBhbGlnbi1pdGVtczogY2VudGVyO1xuICBwYWRkaW5nLWlubGluZTogNnB4ICFpbXBvcnRhbnQ7XG4gIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XG59XG5bZGF0YS1sd3ItY2VsbF0gPiAqIHsgbWluLXdpZHRoOiAwOyBtYXgtd2lkdGg6IDEwMCU7IH1cbltkYXRhLWx3ci1oaWRkZW5dIHsgZGlzcGxheTogbm9uZSAhaW1wb3J0YW50OyB9XG5bZGF0YS1sd3ItZW1wdHktaWNvbl0geyBkaXNwbGF5OiBub25lICFpbXBvcnRhbnQ7IH1cbltkYXRhLWx3ci1uYW1lXSB7IGZvbnQtd2VpZ2h0OiA2MDA7IH1cbltkYXRhLWx3ci1oYXMtd2FybmluZ10geyBwYWRkaW5nLWlubGluZS1zdGFydDogMzJweCAhaW1wb3J0YW50OyB9XG5bZGF0YS1sd3Itd2FybmluZ10geyB3aWR0aDogMjRweCAhaW1wb3J0YW50OyBqdXN0aWZ5LXNlbGY6IHN0YXJ0OyBhbGlnbi1zZWxmOiBjZW50ZXI7IHotaW5kZXg6IDM7IHBhZGRpbmc6IDAgIWltcG9ydGFudDsgbWFyZ2luLWlubGluZS1zdGFydDogNnB4OyB9XG5bZGF0YS1sd3Itd2FybmluZ106OmJlZm9yZSB7IGNvbnRlbnQ6IG5vbmUgIWltcG9ydGFudDsgfVxuW2RhdGEtbHdyLXdhcm5pbmddID4gKiB7IG1heC13aWR0aDogMjRweDsgfVxuW2RhdGEtbHdyLXJvdz1cImRhdGFcIl0ge1xuICBib3JkZXItYm90dG9tOiAxcHggc29saWQgdmFyKC0tYm9yZGVyQ29sb3IsICNjYmQ1ZTEpO1xuICAtLWx3ci1yb3ctdGludDogY29sb3ItbWl4KGluIHNyZ2IsIHZhcigtLXRleHRDb2xvclByaW1hcnksICM2NDc0OGIpIDMlLCB0cmFuc3BhcmVudCk7XG4gIGJhY2tncm91bmQtaW1hZ2U6IGxpbmVhci1ncmFkaWVudCh0byBib3R0b20sIHZhcigtLWx3ci1yb3ctdGludCkgNTAlLCB0cmFuc3BhcmVudCA1MCUpO1xufVxuW2RhdGEtbHdyLXJvdz1cImRhdGFcIl1bZGF0YS1sd3Itc3RyaXBlPVwib2RkXCJdOm5vdChbZGF0YS1zZWxlY3RlZD1cInRydWVcIl0pOm5vdCg6aG92ZXIpOm5vdCg6Zm9jdXMtd2l0aGluKSB7XG4gIC0tbHdyLXJvdy10aW50OiBjb2xvci1taXgoaW4gc3JnYiwgdmFyKC0tdGV4dENvbG9yUHJpbWFyeSwgIzY0NzQ4YikgNS41JSwgdHJhbnNwYXJlbnQpO1xufVxuW2RhdGEtbHdyLXJvdz1cImRhdGFcIl0gW2RhdGEtbHdyLXNlY29uZGFyeV0geyBmb250LXNpemU6IC45MmVtOyB9XG5bZGF0YS1sd3Itcm93PVwiZGF0YVwiXSBbZGF0YS1sd3ItZ3JvdXAtc3RhcnRdIHsgYm9yZGVyLWlubGluZS1zdGFydDogMXB4IHNvbGlkIHZhcigtLWJvcmRlckNvbG9yLCAjY2JkNWUxKTsgcGFkZGluZy1pbmxpbmUtc3RhcnQ6IDE4cHggIWltcG9ydGFudDsgfVxuW2RhdGEtbHdyLXJvdz1cImRhdGFcIl0gW2RhdGEtbHdyLWhhcy13YXJuaW5nXSB7IHBhZGRpbmctaW5saW5lLXN0YXJ0OiAzMnB4ICFpbXBvcnRhbnQ7IH1cbltkYXRhLWx3ci1hdXRvXSB7XG4gIHBvc2l0aW9uOiBhYnNvbHV0ZSAhaW1wb3J0YW50OyBncmlkLWNvbHVtbjogMiAvIDEyMiAhaW1wb3J0YW50OyBncmlkLXJvdzogMiAvIDMgIWltcG9ydGFudDtcbiAgbGVmdDogdmFyKC0tbHdyLW9mZnNldCk7IHRvcDogMDsgYm90dG9tOiAwO1xuICB3aWR0aDogdmFyKC0tbHdyLW5hdHVyYWwtd2lkdGgpICFpbXBvcnRhbnQ7IGp1c3RpZnktc2VsZjogc3RhcnQ7XG59XG5bZGF0YS1sd3Itcm93PVwiZGF0YVwiXVtkYXRhLWx3ci1sYWJlbHM9XCJ0cnVlXCJdIFtkYXRhLWx3ci1zZWNvbmRhcnldOjpiZWZvcmUge1xuICBjb250ZW50OiBhdHRyKGRhdGEtbHdyLWxhYmVsKTtcbiAgcG9zaXRpb246IHN0YXRpYzsgaW5zZXQ6IGF1dG87IGJvcmRlcjogMDsgYmFja2dyb3VuZDogbm9uZTsgZmxleC1zaHJpbms6IDA7XG4gIGZvbnQtc2l6ZTogMC44NWVtOyBmb250LXdlaWdodDogNDAwOyBjb2xvcjogdmFyKC0tdGV4dENvbG9yU2Vjb25kYXJ5LCAjNzg4MzkzKTtcbiAgbWFyZ2luLXJpZ2h0OiA2cHg7IHdpZHRoOiBhdXRvOyBoZWlnaHQ6IGF1dG87XG59XG5bZGF0YS1sd3ItY2VsbF0gLlRhYmxlQ2VsbCB7IHBhZGRpbmc6IDAgIWltcG9ydGFudDsgfVxuW2RhdGEtbHdyLWNlbGxdW2RhdGEtbHdyLXN0YXR1c10gPiAqIHtcbiAgZGlzcGxheTogaW5saW5lLWZsZXg7IGFsaWduLWl0ZW1zOiBjZW50ZXI7IHBhZGRpbmc6IDJweCA4cHggIWltcG9ydGFudDsgYm9yZGVyLXJhZGl1czogOTk5cHg7XG4gIGJhY2tncm91bmQ6IGNvbG9yLW1peChpbiBzcmdiLCB2YXIoLS1sd3Itc3RhdHVzLWNvbG9yLCBjdXJyZW50Q29sb3IpIDklLCB0cmFuc3BhcmVudCk7IGZvbnQtd2VpZ2h0OiA1MDA7XG59XG5bZGF0YS1sd3ItY2VsbF0gW2RhdGEtY29sdW1uLXJlc2l6ZXItdGVzdF0sXG5bZGF0YS1sd3ItY2VsbF0gW2NsYXNzKj1cInRoLW1vZHVsZV9fc2VwYXJhdG9yXCJdIHsgZGlzcGxheTogbm9uZSAhaW1wb3J0YW50OyB9XG5bZGF0YS1sd3ItY2VsbF0gW2NsYXNzKj1cInNlbGVjdGlvbi1oZWFkZXItbW9kdWxlX19Ub2dnbGVTZWxlY3RBbGxcIl0ge1xuICBtYXJnaW46IDAgIWltcG9ydGFudDsgcGFkZGluZzogMCAhaW1wb3J0YW50OyB3aWR0aDogMTAwJTtcbn1cbi5sd3ItdG9nZ2xlIHtcbiAgZm9udDogaW5oZXJpdDsgY29sb3I6IGluaGVyaXQ7IGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLWJvcmRlckNvbG9yLCAjODg4KTtcbiAgYm9yZGVyLXJhZGl1czogNHB4OyBwYWRkaW5nOiAwIDZweDsgYmFja2dyb3VuZDogdHJhbnNwYXJlbnQ7IGN1cnNvcjogcG9pbnRlcjtcbn1cbmA7XG4iLCAiaW1wb3J0IHsgZ2V0SW5qZWN0YWJsZTIgfSBmcm9tIFwiQGs4c2xlbnMvaW5qZWN0YWJsZVwiO1xuaW1wb3J0IHsgc3RhdHVzQmFySXRlbUluamVjdGlvblRva2VuIH0gZnJvbSBcIkBrOHNsZW5zL3N0YXR1cy1iYXItY29udHJhY3RzXCI7XG5pbXBvcnQgeyB1c2VFZmZlY3QsIHVzZVJlZiwgdXNlU3RhdGUgfSBmcm9tIFwicmVhY3RcIjtcbmltcG9ydCB7IHVzZVN5bmNJbmplY3QgfSBmcm9tIFwiQGs4c2xlbnMvdXNlLWluamVjdFwiO1xuaW1wb3J0IHsgcmVhY3Rpb24sIHJ1bkluQWN0aW9uIH0gZnJvbSBcIm1vYnhcIjtcbmltcG9ydCB7IHN0YXJ0TGF5b3V0LCB0eXBlIExheW91dFN0YXR1cyB9IGZyb20gXCIuL2NvbnRyb2xsZXIudHNcIjtcbmltcG9ydCB7IGVtcHR5U2V0dGluZ3MsIHJlc29sdmVMYXlvdXQsIHNhbml0aXplU2V0dGluZ3MsIHR5cGUgTGF5b3V0U2V0dGluZ3MsIHR5cGUgVGFibGVDYXRhbG9nIH0gZnJvbSBcIi4vY29uZmlnLnRzXCI7XG5pbXBvcnQgeyBsb2FkU2V0dGluZ3NJbmplY3RhYmxlLCB0eXBlIFNldHRpbmdzQm94IH0gZnJvbSBcIi4vc2V0dGluZ3MuaW5qZWN0YWJsZVwiO1xuaW1wb3J0IHsgb3BlbkVkaXRvckluamVjdGFibGUgfSBmcm9tIFwiLi9lZGl0b3ItbW9kYWwuaW5qZWN0YWJsZVwiO1xuXG5jb25zdCBUb2dnbGUgPSAoKSA9PiB7XG4gIGNvbnN0IGxvYWRTZXR0aW5ncyA9IHVzZVN5bmNJbmplY3QobG9hZFNldHRpbmdzSW5qZWN0YWJsZSk7XG4gIGNvbnN0IG9wZW5FZGl0b3IgPSB1c2VTeW5jSW5qZWN0KG9wZW5FZGl0b3JJbmplY3RhYmxlKTtcbiAgY29uc3QgW3NldHRpbmdzLCBzZXRTZXR0aW5nc10gPSB1c2VTdGF0ZTxMYXlvdXRTZXR0aW5ncz4oZW1wdHlTZXR0aW5ncyk7XG4gIGNvbnN0IFtib3gsIHNldEJveF0gPSB1c2VTdGF0ZTxTZXR0aW5nc0JveCB8IG51bGw+KG51bGwpO1xuICBjb25zdCBbZXJyb3IsIHNldEVycm9yXSA9IHVzZVN0YXRlKFwiXCIpO1xuICBjb25zdCBbZWRpdGluZywgc2V0RWRpdGluZ10gPSB1c2VTdGF0ZShmYWxzZSk7XG4gIGNvbnN0IFt0YWJsZXMsIHNldFRhYmxlc10gPSB1c2VTdGF0ZTxUYWJsZUNhdGFsb2dbXT4oW10pO1xuICBjb25zdCBzZXR0aW5nc1JlZiA9IHVzZVJlZihzZXR0aW5ncyk7XG4gIGNvbnN0IHJlZnJlc2ggPSB1c2VSZWY8KCkgPT4gdm9pZD4oKCkgPT4ge30pO1xuICBjb25zdCBbc3RhdHVzLCBzZXRTdGF0dXNdID0gdXNlU3RhdGU8TGF5b3V0U3RhdHVzPih7IGFjdGl2ZTogMCwgdW5zdXBwb3J0ZWQ6IDAgfSk7XG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgbGV0IGNhbmNlbGxlZCA9IGZhbHNlO1xuICAgIGxldCBkaXNwb3NlOiAoKCkgPT4gdm9pZCkgfCB1bmRlZmluZWQ7XG4gICAgbG9hZFNldHRpbmdzKCkudGhlbigodmFsdWUpID0+IHtcbiAgICAgIGlmIChjYW5jZWxsZWQpIHJldHVybjtcbiAgICAgIHNldEJveCh2YWx1ZSk7XG4gICAgICBzZXRTZXR0aW5ncyhzYW5pdGl6ZVNldHRpbmdzKHZhbHVlLmdldCgpKSk7XG4gICAgICBkaXNwb3NlID0gcmVhY3Rpb24oKCkgPT4gdmFsdWUuZ2V0KCksIChuZXh0KSA9PiBzZXRTZXR0aW5ncyhzYW5pdGl6ZVNldHRpbmdzKG5leHQpKSk7XG4gICAgfSkuY2F0Y2goKCkgPT4geyBpZiAoIWNhbmNlbGxlZCkgc2V0RXJyb3IoXCJDb3VsZCBub3QgbG9hZCBsYXlvdXQgc2V0dGluZ3MuIFJlbG9hZCB0aGUgZXh0ZW5zaW9uIHRvIHJldHJ5LlwiKTsgfSk7XG4gICAgcmV0dXJuICgpID0+IHsgY2FuY2VsbGVkID0gdHJ1ZTsgZGlzcG9zZT8uKCk7IH07XG4gIH0sIFtsb2FkU2V0dGluZ3NdKTtcbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBzZXR0aW5nc1JlZi5jdXJyZW50ID0gc2V0dGluZ3M7XG4gICAgcmVmcmVzaC5jdXJyZW50KCk7XG4gIH0sIFtzZXR0aW5nc10pO1xuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIGlmICghYm94IHx8ICFzZXR0aW5ncy5lbmFibGVkKSByZXR1cm47XG4gICAgcmV0dXJuIHN0YXJ0TGF5b3V0KGRvY3VtZW50LCBzZXRTdGF0dXMsIHtcbiAgICAgIGdldExheW91dDogKHRhYmxlSWQsIGlkcykgPT4gcmVzb2x2ZUxheW91dChpZHMsIHNldHRpbmdzUmVmLmN1cnJlbnQudGFibGVzW3RhYmxlSWRdKSxcbiAgICAgIG9uQ2F0YWxvZzogc2V0VGFibGVzLFxuICAgICAgc3Vic2NyaWJlOiAoY2FsbGJhY2spID0+IHsgcmVmcmVzaC5jdXJyZW50ID0gY2FsbGJhY2s7IHJldHVybiAoKSA9PiB7IHJlZnJlc2guY3VycmVudCA9ICgpID0+IHt9OyB9OyB9LFxuICAgIH0pO1xuICB9LCBbYm94LCBzZXR0aW5ncy5lbmFibGVkXSk7XG4gIGZ1bmN0aW9uIHNhdmUodmFsdWU6IExheW91dFNldHRpbmdzKSB7XG4gICAgaWYgKCFib3gpIHJldHVybjtcbiAgICBydW5JbkFjdGlvbigoKSA9PiBib3guc2V0KHNhbml0aXplU2V0dGluZ3ModmFsdWUpKSk7XG4gIH1cbiAgYXN5bmMgZnVuY3Rpb24gZWRpdCgpIHtcbiAgICBpZiAoZWRpdGluZykgcmV0dXJuO1xuICAgIHNldEVkaXRpbmcodHJ1ZSk7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IG9wZW5FZGl0b3IodGFibGVzLCBzZXR0aW5ncyk7XG4gICAgICBpZiAocmVzdWx0KSBzYXZlKHJlc3VsdCk7XG4gICAgfSBjYXRjaCB7IHNldEVycm9yKFwiQ291bGQgbm90IG9wZW4gdGhlIGxheW91dCBlZGl0b3IuIFJlbG9hZCB0aGUgZXh0ZW5zaW9uIHRvIHJldHJ5LlwiKTsgfVxuICAgIGZpbmFsbHkgeyBzZXRFZGl0aW5nKGZhbHNlKTsgfVxuICB9XG4gIGNvbnN0IGxhYmVsID0gZXJyb3IgPyBcIlJvd3M6IGVycm9yXCIgOiAhYm94ID8gXCJSb3dzOiBsb2FkaW5nXCIgOiAhc2V0dGluZ3MuZW5hYmxlZCA/IFwiUm93czogbm9ybWFsXCIgOiBzdGF0dXMudW5zdXBwb3J0ZWQgPyBcIlJvd3M6IHVuc3VwcG9ydGVkXCIgOiBcIlJvd3M6IDIgbGluZXNcIjtcbiAgcmV0dXJuIChcbiAgICA8c3BhbiBzdHlsZT17eyBkaXNwbGF5OiBcImlubGluZS1mbGV4XCIsIGdhcDogXCI1cHhcIiB9fT48YnV0dG9uXG4gICAgICBjbGFzc05hbWU9XCJsd3ItdG9nZ2xlXCJcbiAgICAgIHR5cGU9XCJidXR0b25cIlxuICAgICAgZGlzYWJsZWQ9eyFib3h9XG4gICAgICBhcmlhLXByZXNzZWQ9e3NldHRpbmdzLmVuYWJsZWR9XG4gICAgICB0aXRsZT17ZXJyb3IgfHwgKHNldHRpbmdzLmVuYWJsZWRcbiAgICAgICAgPyBgVHdvLWxpbmUgbGF5b3V0IG9uICR7c3RhdHVzLmFjdGl2ZX0gd29ya2xvYWQgdGFibGUocykuIENsaWNrIHRvIHJlc3RvcmUgbm9ybWFsIHJvd3MuYFxuICAgICAgICA6IFwiQ2xpY2sgdG8gZW5hYmxlIHRoZSB0d28tbGluZSB3b3JrbG9hZCBsYXlvdXQuXCIpfVxuICAgICAgb25DbGljaz17KCkgPT4gc2F2ZSh7IC4uLnNldHRpbmdzLCBlbmFibGVkOiAhc2V0dGluZ3MuZW5hYmxlZCB9KX1cbiAgICA+e2xhYmVsfTwvYnV0dG9uPjxidXR0b24gY2xhc3NOYW1lPVwibHdyLXRvZ2dsZVwiIHR5cGU9XCJidXR0b25cIiBkaXNhYmxlZD17IWJveCB8fCAhdGFibGVzLmxlbmd0aCB8fCBlZGl0aW5nIHx8ICFzZXR0aW5ncy5lbmFibGVkfVxuICAgICAgdGl0bGU9XCJDb25maWd1cmUgZmllbGQgcGxhY2VtZW50LCBvcmRlciwgd2lkdGhzIGFuZCB2aXNpYmlsaXR5XCIgb25DbGljaz17ZWRpdH0+TGF5b3V0XHUyMDI2PC9idXR0b24+PC9zcGFuPlxuICApO1xufTtcblxuZXhwb3J0IGNvbnN0IHdvcmtsb2FkUm93c1RvZ2dsZSA9IGdldEluamVjdGFibGUyKHtcbiAgaWQ6IFwibGVucy13b3JrbG9hZC1yb3dzLnRvZ2dsZVwiLFxuICBpbnN0YW50aWF0ZTogKCkgPT4gKCkgPT4gKHsgQ29tcG9uZW50OiBUb2dnbGUsIHBvc2l0aW9uOiBcInJpZ2h0XCIgYXMgY29uc3QsIG9yZGVyTnVtYmVyOiA5MCB9KSxcbiAgaW5qZWN0aW9uVG9rZW46IHN0YXR1c0Jhckl0ZW1JbmplY3Rpb25Ub2tlbixcbn0pO1xuIiwgIi8qKiBFeHBlcmltZW50YWwgYWRhcHRlcjogTGVucyBjdXJyZW50bHkgZXhwb3NlcyBubyBwdWJsaWMgcm93LWhlaWdodCBjb250cmlidXRpb24uICovXG5leHBvcnQgaW50ZXJmYWNlIFZpcnR1YWxpemVyT3B0aW9ucyB7XG4gIGNvdW50OiBudW1iZXI7XG4gIGVzdGltYXRlU2l6ZTogKGluZGV4OiBudW1iZXIpID0+IG51bWJlcjtcbiAgZ2V0U2Nyb2xsRWxlbWVudDogKCkgPT4gRWxlbWVudCB8IG51bGw7XG4gIFtrZXk6IHN0cmluZ106IHVua25vd247XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVmlydHVhbGl6ZXJMaWtlIHtcbiAgb3B0aW9uczogVmlydHVhbGl6ZXJPcHRpb25zO1xuICBzZXRPcHRpb25zOiAob3B0aW9uczogVmlydHVhbGl6ZXJPcHRpb25zKSA9PiB2b2lkO1xuICBtZWFzdXJlOiAoKSA9PiB2b2lkO1xuICBnZXRWaXJ0dWFsSXRlbXM6ICgpID0+IHVua25vd25bXTtcbiAgc2Nyb2xsVG9PZmZzZXQ6IChvZmZzZXQ6IG51bWJlcikgPT4gdm9pZDtcbiAgc2Nyb2xsT2Zmc2V0OiBudW1iZXIgfCBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZG91YmxlUm93SGVpZ2h0cyhcbiAgdmlydHVhbGl6ZXI6IFZpcnR1YWxpemVyTGlrZSxcbiAgYWZ0ZXJSZW5kZXI6IChjYWxsYmFjazogKCkgPT4gdm9pZCkgPT4gdm9pZCA9IChjYWxsYmFjaykgPT4gY2FsbGJhY2soKSxcbik6ICgpID0+IHZvaWQge1xuICBjb25zdCBvcmlnaW5hbFNldE9wdGlvbnMgPSB2aXJ0dWFsaXplci5zZXRPcHRpb25zO1xuICBsZXQgYmFzZU9wdGlvbnMgPSB2aXJ0dWFsaXplci5vcHRpb25zO1xuICBsZXQgYmFzZUVzdGltYXRlID0gYmFzZU9wdGlvbnMuZXN0aW1hdGVTaXplO1xuICBsZXQgYWN0aXZlID0gdHJ1ZTtcbiAgY29uc3Qgc2NhbGVkRXN0aW1hdGUgPSAoaW5kZXg6IG51bWJlcikgPT4gYmFzZUVzdGltYXRlKGluZGV4KSAqIDI7XG5cbiAgY29uc3Qgc2V0T3B0aW9ucyA9IChvcHRpb25zOiBWaXJ0dWFsaXplck9wdGlvbnMpID0+IHtcbiAgICBpZiAob3B0aW9ucy5lc3RpbWF0ZVNpemUgIT09IHNjYWxlZEVzdGltYXRlKSBiYXNlRXN0aW1hdGUgPSBvcHRpb25zLmVzdGltYXRlU2l6ZTtcbiAgICBiYXNlT3B0aW9ucyA9IHsgLi4ub3B0aW9ucywgZXN0aW1hdGVTaXplOiBiYXNlRXN0aW1hdGUgfTtcbiAgICBvcmlnaW5hbFNldE9wdGlvbnMuY2FsbCh2aXJ0dWFsaXplciwgeyAuLi5vcHRpb25zLCBlc3RpbWF0ZVNpemU6IHNjYWxlZEVzdGltYXRlIH0pO1xuICB9O1xuXG4gIGNvbnN0IG9yaWdpbmFsT2Zmc2V0ID0gdmlydHVhbGl6ZXIuc2Nyb2xsT2Zmc2V0ID8/IDA7XG4gIHZpcnR1YWxpemVyLnNldE9wdGlvbnMgPSBzZXRPcHRpb25zO1xuICB0cnkge1xuICAgIHNldE9wdGlvbnMoYmFzZU9wdGlvbnMpO1xuICAgIHZpcnR1YWxpemVyLm1lYXN1cmUoKTtcbiAgICAvLyBUaGUgc2Nyb2xsIHNwYWNlciBtdXN0IHJlbmRlciBpdHMgbmV3IGhlaWdodCBiZWZvcmUgYSBuZWFyLWJvdHRvbSBvZmZzZXQgaXMgYXBwbGllZC5cbiAgICBhZnRlclJlbmRlcigoKSA9PiB7IGlmIChhY3RpdmUpIHZpcnR1YWxpemVyLnNjcm9sbFRvT2Zmc2V0KG9yaWdpbmFsT2Zmc2V0ICogMik7IH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIHZpcnR1YWxpemVyLnNldE9wdGlvbnMgPSBvcmlnaW5hbFNldE9wdGlvbnM7XG4gICAgb3JpZ2luYWxTZXRPcHRpb25zLmNhbGwodmlydHVhbGl6ZXIsIGJhc2VPcHRpb25zKTtcbiAgICB2aXJ0dWFsaXplci5tZWFzdXJlKCk7XG4gICAgdGhyb3cgZXJyb3I7XG4gIH1cblxuICByZXR1cm4gKCkgPT4ge1xuICAgIGlmICghYWN0aXZlKSByZXR1cm47XG4gICAgYWN0aXZlID0gZmFsc2U7XG4gICAgY29uc3Qgb2Zmc2V0ID0gKHZpcnR1YWxpemVyLnNjcm9sbE9mZnNldCA/PyAwKSAvIDI7XG4gICAgLy8gRG8gbm90IG92ZXJ3cml0ZSBhbiBhZGFwdGVyIGluc3RhbGxlZCBieSBzb21ldGhpbmcgZWxzZSBhZnRlciBvdXJzLlxuICAgIGlmICh2aXJ0dWFsaXplci5zZXRPcHRpb25zICE9PSBzZXRPcHRpb25zKSByZXR1cm47XG4gICAgdmlydHVhbGl6ZXIuc2V0T3B0aW9ucyA9IG9yaWdpbmFsU2V0T3B0aW9ucztcbiAgICBvcmlnaW5hbFNldE9wdGlvbnMuY2FsbCh2aXJ0dWFsaXplciwgYmFzZU9wdGlvbnMpO1xuICAgIHZpcnR1YWxpemVyLm1lYXN1cmUoKTtcbiAgICBhZnRlclJlbmRlcigoKSA9PiB7XG4gICAgICBpZiAodmlydHVhbGl6ZXIuc2V0T3B0aW9ucyA9PT0gb3JpZ2luYWxTZXRPcHRpb25zKSB2aXJ0dWFsaXplci5zY3JvbGxUb09mZnNldChvZmZzZXQpO1xuICAgIH0pO1xuICB9O1xufVxuXG50eXBlIEZpYmVyID0ge1xuICByZXR1cm4/OiBGaWJlciB8IG51bGw7XG4gIGFsdGVybmF0ZT86IEZpYmVyIHwgbnVsbDtcbiAgbWVtb2l6ZWRQcm9wcz86IHsgdGFibGVJZD86IHVua25vd24gfTtcbiAgbWVtb2l6ZWRTdGF0ZT86IEhvb2sgfCBudWxsO1xuICBzdGF0ZU5vZGU/OiB7IGN1cnJlbnQ/OiBGaWJlciB9O1xufTtcbnR5cGUgSG9vayA9IHsgbWVtb2l6ZWRTdGF0ZT86IHVua25vd247IG5leHQ/OiBIb29rIHwgbnVsbCB9O1xuXG5jb25zdCB3b3JrbG9hZHMgPSBuZXcgU2V0KFtcbiAgXCJwb2RzXCIsIFwiZGVwbG95bWVudHNcIiwgXCJkYWVtb24tc2V0c1wiLCBcInN0YXRlZnVsLXNldHNcIiwgXCJyZXBsaWNhLXNldHNcIixcbiAgXCJyZXBsaWNhdGlvbi1jb250cm9sbGVyc1wiLCBcImpvYnNcIiwgXCJjcm9uLWpvYnNcIixcbl0pO1xuXG5mdW5jdGlvbiBpc1ZpcnR1YWxpemVyKHZhbHVlOiB1bmtub3duLCBlbGVtZW50OiBFbGVtZW50KTogdmFsdWUgaXMgVmlydHVhbGl6ZXJMaWtlIHtcbiAgaWYgKCF2YWx1ZSB8fCB0eXBlb2YgdmFsdWUgIT09IFwib2JqZWN0XCIpIHJldHVybiBmYWxzZTtcbiAgY29uc3QgdiA9IHZhbHVlIGFzIFBhcnRpYWw8VmlydHVhbGl6ZXJMaWtlPjtcbiAgcmV0dXJuIHR5cGVvZiB2LnNldE9wdGlvbnMgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2Ygdi5tZWFzdXJlID09PSBcImZ1bmN0aW9uXCIgJiZcbiAgICB0eXBlb2Ygdi5nZXRWaXJ0dWFsSXRlbXMgPT09IFwiZnVuY3Rpb25cIiAmJiB0eXBlb2Ygdi5zY3JvbGxUb09mZnNldCA9PT0gXCJmdW5jdGlvblwiICYmXG4gICAgdHlwZW9mIHYub3B0aW9ucz8uZXN0aW1hdGVTaXplID09PSBcImZ1bmN0aW9uXCIgJiZcbiAgICB2Lm9wdGlvbnMuZ2V0U2Nyb2xsRWxlbWVudCgpID09PSBlbGVtZW50O1xufVxuXG4vKiogUmVhZHMgb25seSB0aGUgb3duaW5nIGNvbXBvbmVudCdzIGhvb2sgbGlzdCwgbmV2ZXIgdGhlIHdob2xlIFJlYWN0IHRyZWUuICovXG5leHBvcnQgZnVuY3Rpb24gZmluZFdvcmtsb2FkVmlydHVhbGl6ZXIoZWxlbWVudDogRWxlbWVudCk6IHtcbiAgd29ya2xvYWQ6IGJvb2xlYW47XG4gIHZpcnR1YWxpemVyPzogVmlydHVhbGl6ZXJMaWtlO1xuICB0YWJsZUlkPzogc3RyaW5nO1xufSB7XG4gIGNvbnN0IGtleSA9IE9iamVjdC5rZXlzKGVsZW1lbnQpLmZpbmQoKG5hbWUpID0+IG5hbWUuc3RhcnRzV2l0aChcIl9fcmVhY3RGaWJlciRcIikpO1xuICBpZiAoIWtleSkgcmV0dXJuIHsgd29ya2xvYWQ6IGZhbHNlIH07XG4gIGNvbnN0IG5vZGUgPSBlbGVtZW50IGFzIHVua25vd24gYXMgUmVjb3JkPHN0cmluZywgRmliZXI+O1xuICBsZXQgZmliZXI6IEZpYmVyIHwgbnVsbCB8IHVuZGVmaW5lZCA9IG5vZGVba2V5XTtcbiAgLy8gQSBET00gbm9kZSBjYW4gcmV0YWluIHRoZSBwcmV2aW91cyBmaWJlciBhZnRlciBSZWFjdCBzd2FwcyBpdHMgZG91YmxlIGJ1ZmZlci5cbiAgbGV0IHJvb3QgPSBmaWJlcjtcbiAgZm9yIChsZXQgZGVwdGggPSAwOyByb290Py5yZXR1cm4gJiYgZGVwdGggPCAxMjg7IGRlcHRoKyspIHJvb3QgPSByb290LnJldHVybjtcbiAgaWYgKHJvb3Q/LnN0YXRlTm9kZT8uY3VycmVudCAmJiByb290LnN0YXRlTm9kZS5jdXJyZW50ICE9PSByb290ICYmIGZpYmVyPy5hbHRlcm5hdGUpIGZpYmVyID0gZmliZXIuYWx0ZXJuYXRlO1xuICBmb3IgKGxldCBkZXB0aCA9IDA7IGZpYmVyICYmIGRlcHRoIDwgNjQ7IGRlcHRoKyssIGZpYmVyID0gZmliZXIucmV0dXJuKSB7XG4gICAgY29uc3QgdGFibGVJZCA9IGZpYmVyLm1lbW9pemVkUHJvcHM/LnRhYmxlSWQ7XG4gICAgaWYgKHR5cGVvZiB0YWJsZUlkICE9PSBcInN0cmluZ1wiKSBjb250aW51ZTtcbiAgICBpZiAoIXdvcmtsb2Fkcy5oYXModGFibGVJZCkpIHJldHVybiB7IHdvcmtsb2FkOiBmYWxzZSB9O1xuICAgIGZvciAoY29uc3Qgb3duZXIgb2YgW2ZpYmVyLCBmaWJlci5hbHRlcm5hdGVdKSB7XG4gICAgICBsZXQgaG9vayA9IG93bmVyPy5tZW1vaXplZFN0YXRlO1xuICAgICAgZm9yIChsZXQgY291bnQgPSAwOyBob29rICYmIGNvdW50IDwgMTI4OyBjb3VudCsrLCBob29rID0gaG9vay5uZXh0KSB7XG4gICAgICAgIGNvbnN0IHN0YXRlID0gaG9vay5tZW1vaXplZFN0YXRlO1xuICAgICAgICBjb25zdCBjYW5kaWRhdGVzID0gW3N0YXRlXTtcbiAgICAgICAgaWYgKHN0YXRlICYmIHR5cGVvZiBzdGF0ZSA9PT0gXCJvYmplY3RcIiAmJiBcImN1cnJlbnRcIiBpbiBzdGF0ZSkgY2FuZGlkYXRlcy5wdXNoKHN0YXRlLmN1cnJlbnQpO1xuICAgICAgICBmb3IgKGNvbnN0IGNhbmRpZGF0ZSBvZiBjYW5kaWRhdGVzKSB7XG4gICAgICAgICAgaWYgKGlzVmlydHVhbGl6ZXIoY2FuZGlkYXRlLCBlbGVtZW50KSkgcmV0dXJuIHsgd29ya2xvYWQ6IHRydWUsIHZpcnR1YWxpemVyOiBjYW5kaWRhdGUsIHRhYmxlSWQgfTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4geyB3b3JrbG9hZDogdHJ1ZSB9O1xuICB9XG4gIHJldHVybiB7IHdvcmtsb2FkOiBmYWxzZSB9O1xufVxuIiwgImltcG9ydCB7IGRvdWJsZVJvd0hlaWdodHMsIGZpbmRXb3JrbG9hZFZpcnR1YWxpemVyLCB0eXBlIFZpcnR1YWxpemVyTGlrZSB9IGZyb20gXCIuL3ZpcnR1YWxpemVyLnRzXCI7XG5pbXBvcnQgeyBjbGVhckxheW91dCwgbGF5b3V0Um93IH0gZnJvbSBcIi4vbGF5b3V0LnRzXCI7XG5pbXBvcnQgeyBkZWZhdWx0TGF5b3V0LCBmaWVsZExhYmVsLCBpc0NvbnRyb2wsIHR5cGUgVGFibGVDYXRhbG9nLCB0eXBlIFRhYmxlTGF5b3V0IH0gZnJvbSBcIi4vY29uZmlnLnRzXCI7XG5cbmV4cG9ydCB0eXBlIExheW91dFN0YXR1cyA9IHsgYWN0aXZlOiBudW1iZXI7IHVuc3VwcG9ydGVkOiBudW1iZXIgfTtcblxuZXhwb3J0IGZ1bmN0aW9uIHN0YXJ0TGF5b3V0KGRvY3VtZW50OiBEb2N1bWVudCwgcmVwb3J0OiAoc3RhdHVzOiBMYXlvdXRTdGF0dXMpID0+IHZvaWQsIG9wdGlvbnM6IHtcbiAgZ2V0TGF5b3V0PzogKHRhYmxlSWQ6IHN0cmluZywgaWRzOiBzdHJpbmdbXSkgPT4gVGFibGVMYXlvdXQ7XG4gIG9uQ2F0YWxvZz86ICh0YWJsZXM6IFRhYmxlQ2F0YWxvZ1tdKSA9PiB2b2lkO1xuICBzdWJzY3JpYmU/OiAocmVmcmVzaDogKCkgPT4gdm9pZCkgPT4gKCkgPT4gdm9pZDtcbn0gPSB7fSk6ICgpID0+IHZvaWQge1xuICBjb25zdCB3aW5kb3cgPSBkb2N1bWVudC5kZWZhdWx0VmlldyE7XG4gIGNvbnN0IGF0dGFjaGVkID0gbmV3IE1hcDxIVE1MRWxlbWVudCwgeyB0YWJsZUlkOiBzdHJpbmc7IHZpcnR1YWxpemVyOiBWaXJ0dWFsaXplckxpa2U7IHJlc3RvcmU6ICgpID0+IHZvaWQ7IHJvb3Q6IEhUTUxFbGVtZW50IH0+KCk7XG4gIGxldCBmcmFtZSA9IDA7XG4gIGxldCBzdG9wcGVkID0gZmFsc2U7XG4gIGxldCBsYXN0UmVwb3J0ID0gXCJcIjtcbiAgbGV0IGxhc3RDYXRhbG9nID0gXCJcIjtcbiAgY29uc3QgcmVzaXplT2JzZXJ2ZXIgPSB0eXBlb2Ygd2luZG93LlJlc2l6ZU9ic2VydmVyID09PSBcImZ1bmN0aW9uXCIgPyBuZXcgd2luZG93LlJlc2l6ZU9ic2VydmVyKCgpID0+IHNjaGVkdWxlKCkpIDogdW5kZWZpbmVkO1xuXG4gIGZ1bmN0aW9uIHNjYW4oKSB7XG4gICAgZnJhbWUgPSAwO1xuICAgIGlmIChzdG9wcGVkKSByZXR1cm47XG4gICAgZm9yIChjb25zdCBbZWxlbWVudCwgZW50cnldIG9mIGF0dGFjaGVkKSB7XG4gICAgICBpZiAoIWVsZW1lbnQuaXNDb25uZWN0ZWQpIHtcbiAgICAgICAgcmVzaXplT2JzZXJ2ZXI/LnVub2JzZXJ2ZShlbGVtZW50KTtcbiAgICAgICAgZW50cnkucmVzdG9yZSgpO1xuICAgICAgICBjbGVhckxheW91dChlbnRyeS5yb290KTtcbiAgICAgICAgYXR0YWNoZWQuZGVsZXRlKGVsZW1lbnQpO1xuICAgICAgfVxuICAgIH1cbiAgICBsZXQgdW5zdXBwb3J0ZWQgPSAwO1xuICAgIGNvbnN0IGNhdGFsb2dzID0gbmV3IE1hcDxzdHJpbmcsIFRhYmxlQ2F0YWxvZz4oKTtcbiAgICBmb3IgKGNvbnN0IGVsZW1lbnQgb2YgZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbDxIVE1MRWxlbWVudD4oXCJbZGF0YS10YWJsZS1jb250YWluZXItdGVzdF1cIikpIHtcbiAgICAgIGxldCBlbnRyeSA9IGF0dGFjaGVkLmdldChlbGVtZW50KTtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGZvdW5kID0gZmluZFdvcmtsb2FkVmlydHVhbGl6ZXIoZWxlbWVudCk7XG4gICAgICAgIGlmIChlbnRyeSAmJiAoIWZvdW5kLndvcmtsb2FkIHx8IGZvdW5kLnZpcnR1YWxpemVyICE9PSBlbnRyeS52aXJ0dWFsaXplcikpIHtcbiAgICAgICAgICBlbnRyeS5yZXN0b3JlKCk7XG4gICAgICAgICAgY2xlYXJMYXlvdXQoZW50cnkucm9vdCk7XG4gICAgICAgICAgYXR0YWNoZWQuZGVsZXRlKGVsZW1lbnQpO1xuICAgICAgICAgIHJlc2l6ZU9ic2VydmVyPy51bm9ic2VydmUoZWxlbWVudCk7XG4gICAgICAgICAgZW50cnkgPSB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFlbnRyeSkge1xuICAgICAgICAgIGlmICghZm91bmQud29ya2xvYWQpIGNvbnRpbnVlO1xuICAgICAgICAgIGlmICghZm91bmQudmlydHVhbGl6ZXIpIHsgdW5zdXBwb3J0ZWQrKzsgY29udGludWU7IH1cbiAgICAgICAgICAvLyBJbiB0aGlzIExlbnMgYnVpbGQsIHRoZSBoZWFkZXIgYW5kIHNjcm9sbCBib2R5IGFyZSBzaWJsaW5ncy5cbiAgICAgICAgICBjb25zdCByb290ID0gZWxlbWVudC5wYXJlbnRFbGVtZW50O1xuICAgICAgICAgIGlmICghcm9vdD8ucXVlcnlTZWxlY3RvcihcIltkYXRhLXRhYmxlLWhlYWQtdGVzdF1cIikpIHsgdW5zdXBwb3J0ZWQrKzsgY29udGludWU7IH1cbiAgICAgICAgICBlbnRyeSA9IHtcbiAgICAgICAgICAgIHRhYmxlSWQ6IGZvdW5kLnRhYmxlSWQhLFxuICAgICAgICAgICAgdmlydHVhbGl6ZXI6IGZvdW5kLnZpcnR1YWxpemVyLFxuICAgICAgICAgICAgcmVzdG9yZTogZG91YmxlUm93SGVpZ2h0cyhmb3VuZC52aXJ0dWFsaXplciwgKGNhbGxiYWNrKSA9PiB7IHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUoY2FsbGJhY2spOyB9KSxcbiAgICAgICAgICAgIHJvb3QsXG4gICAgICAgICAgfTtcbiAgICAgICAgICBhdHRhY2hlZC5zZXQoZWxlbWVudCwgZW50cnkpO1xuICAgICAgICAgIHJlc2l6ZU9ic2VydmVyPy5vYnNlcnZlKGVsZW1lbnQpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIHtcbiAgICAgICAgLy8gVW5zdXBwb3J0ZWQgaG9zdCBzaGFwZXMgYXJlIGRlbGliZXJhdGVseSBsZWZ0IHVuY2hhbmdlZC5cbiAgICAgICAgdW5zdXBwb3J0ZWQrKztcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG4gICAgICBjb25zdCByb3cgPSBlbGVtZW50LnF1ZXJ5U2VsZWN0b3I8SFRNTEVsZW1lbnQ+KFwiW2RhdGEtcm93XVwiKTtcbiAgICAgIGNvbnN0IGhlYWRlckNlbGxzID0gQXJyYXkuZnJvbShlbnRyeS5yb290LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KFwiW2RhdGEtdGFibGUtaGVhZC10ZXN0XSBbZGF0YS1jb2x1bW4taWQtdGVzdF1cIikpO1xuICAgICAgY29uc3QgZmllbGRzID0gaGVhZGVyQ2VsbHMubWFwKChjZWxsKSA9PiB7XG4gICAgICAgIGNvbnN0IGlkID0gY2VsbC5nZXRBdHRyaWJ1dGUoXCJkYXRhLWNvbHVtbi1pZC10ZXN0XCIpITtcbiAgICAgICAgY29uc3Qgc2FtcGxlID0gQXJyYXkuZnJvbShyb3c/LmNoaWxkcmVuID8/IFtdKS5maW5kKChjaGlsZCkgPT4gY2hpbGQuZ2V0QXR0cmlidXRlKFwiZGF0YS1jb2x1bW4taWRcIikgPT09IGlkKT8udGV4dENvbnRlbnQ/LnRyaW0oKS5zbGljZSgwLCAyNTYpO1xuICAgICAgICByZXR1cm4geyBpZCwgbGFiZWw6IGNlbGwudGV4dENvbnRlbnQ/LnRyaW0oKSB8fCBmaWVsZExhYmVsKGlkKSwgc2FtcGxlIH07XG4gICAgICB9KS5maWx0ZXIoKGZpZWxkKSA9PiAhaXNDb250cm9sKGZpZWxkLmlkKSk7XG4gICAgICBjYXRhbG9ncy5zZXQoZW50cnkudGFibGVJZCwgeyBpZDogZW50cnkudGFibGVJZCwgZmllbGRzIH0pO1xuICAgICAgY29uc3QgbGF5b3V0ID0gb3B0aW9ucy5nZXRMYXlvdXQ/LihlbnRyeS50YWJsZUlkLCBmaWVsZHMubWFwKChmaWVsZCkgPT4gZmllbGQuaWQpKSA/PyBkZWZhdWx0TGF5b3V0KGZpZWxkcy5tYXAoKGZpZWxkKSA9PiBmaWVsZC5pZCkpO1xuICAgICAgY29uc3QgbGFiZWxzID0gbmV3IE1hcChmaWVsZHMubWFwKChmaWVsZCkgPT4gW2ZpZWxkLmlkLCBmaWVsZC5sYWJlbF0pKTtcbiAgICAgIGNvbnN0IHZpcnR1YWxSb3dzID0gZW50cnkudmlydHVhbGl6ZXIuZ2V0VmlydHVhbEl0ZW1zKCkgYXMgeyBpbmRleDogbnVtYmVyIH1bXTtcbiAgICAgIEFycmF5LmZyb20oZWxlbWVudC5xdWVyeVNlbGVjdG9yQWxsPEhUTUxFbGVtZW50PihcIltkYXRhLXJvd11cIikpLmZvckVhY2goKHJvdywgaW5kZXgpID0+XG4gICAgICAgIGxheW91dFJvdyhyb3csIGZhbHNlLCBsYXlvdXQsIGxhYmVscywgeyBpbmRleDogdmlydHVhbFJvd3NbaW5kZXhdPy5pbmRleCA/PyBpbmRleCwgYXZhaWxhYmxlV2lkdGg6IGVsZW1lbnQuY2xpZW50V2lkdGggfSkpO1xuICAgICAgZm9yIChjb25zdCBoZWFkZXIgb2YgZW50cnkucm9vdC5xdWVyeVNlbGVjdG9yQWxsPEhUTUxFbGVtZW50PihcIltkYXRhLXRhYmxlLWhlYWQtdGVzdF0gPiBkaXZcIikpIGxheW91dFJvdyhoZWFkZXIsIHRydWUsIGxheW91dCwgbGFiZWxzKTtcbiAgICB9XG4gICAgY29uc3Qgc3RhdHVzID0geyBhY3RpdmU6IGF0dGFjaGVkLnNpemUsIHVuc3VwcG9ydGVkIH07XG4gICAgY29uc3Qgc2lnbmF0dXJlID0gSlNPTi5zdHJpbmdpZnkoc3RhdHVzKTtcbiAgICBpZiAoc2lnbmF0dXJlICE9PSBsYXN0UmVwb3J0KSB7IGxhc3RSZXBvcnQgPSBzaWduYXR1cmU7IHJlcG9ydChzdGF0dXMpOyB9XG4gICAgY29uc3QgdGFibGVzID0gWy4uLmNhdGFsb2dzLnZhbHVlcygpXTtcbiAgICBjb25zdCBjYXRhbG9nU2lnbmF0dXJlID0gSlNPTi5zdHJpbmdpZnkodGFibGVzLm1hcCgodGFibGUpID0+ICh7IC4uLnRhYmxlLCBmaWVsZHM6IHRhYmxlLmZpZWxkcy5tYXAoKHsgaWQsIGxhYmVsIH0pID0+ICh7IGlkLCBsYWJlbCB9KSkgfSkpKTtcbiAgICBpZiAoY2F0YWxvZ1NpZ25hdHVyZSAhPT0gbGFzdENhdGFsb2cpIHsgbGFzdENhdGFsb2cgPSBjYXRhbG9nU2lnbmF0dXJlOyBvcHRpb25zLm9uQ2F0YWxvZz8uKHRhYmxlcyk7IH1cbiAgfVxuXG4gIGZ1bmN0aW9uIHNjaGVkdWxlKCkge1xuICAgIGlmICghc3RvcHBlZCAmJiAhZnJhbWUpIGZyYW1lID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShzY2FuKTtcbiAgfVxuICBjb25zdCBvYnNlcnZlciA9IG5ldyB3aW5kb3cuTXV0YXRpb25PYnNlcnZlcihzY2hlZHVsZSk7XG4gIG9ic2VydmVyLm9ic2VydmUoZG9jdW1lbnQuYm9keSwgeyBzdWJ0cmVlOiB0cnVlLCBjaGlsZExpc3Q6IHRydWUsIGNoYXJhY3RlckRhdGE6IHRydWUgfSk7XG4gIGRvY3VtZW50LmZvbnRzPy5yZWFkeS50aGVuKHNjaGVkdWxlKS5jYXRjaCgoKSA9PiB7fSk7XG4gIC8vIEEgZmliZXIncyBsYXlvdXQgZWZmZWN0IG1heSBmaW5pc2ggYWZ0ZXIgdGhlIERPTSBtdXRhdGlvbiB0aGF0IGludHJvZHVjZWQgaXQuXG4gIGNvbnN0IHJldHJ5ID0gd2luZG93LnNldEludGVydmFsKHNjaGVkdWxlLCAxMDAwKTtcbiAgY29uc3QgdW5zdWJzY3JpYmUgPSBvcHRpb25zLnN1YnNjcmliZT8uKHNjaGVkdWxlKTtcbiAgc2NoZWR1bGUoKTtcblxuICByZXR1cm4gKCkgPT4ge1xuICAgIHN0b3BwZWQgPSB0cnVlO1xuICAgIG9ic2VydmVyLmRpc2Nvbm5lY3QoKTtcbiAgICByZXNpemVPYnNlcnZlcj8uZGlzY29ubmVjdCgpO1xuICAgIHVuc3Vic2NyaWJlPy4oKTtcbiAgICB3aW5kb3cuY2xlYXJJbnRlcnZhbChyZXRyeSk7XG4gICAgd2luZG93LmNhbmNlbEFuaW1hdGlvbkZyYW1lKGZyYW1lKTtcbiAgICBmb3IgKGNvbnN0IHsgcmVzdG9yZSwgcm9vdCB9IG9mIGF0dGFjaGVkLnZhbHVlcygpKSB7XG4gICAgICByZXN0b3JlKCk7XG4gICAgICBjbGVhckxheW91dChyb290KTtcbiAgICB9XG4gICAgYXR0YWNoZWQuY2xlYXIoKTtcbiAgfTtcbn1cbiIsICJpbXBvcnQgeyBnZXRJbmplY3RhYmxlMiB9IGZyb20gXCJAazhzbGVucy9pbmplY3RhYmxlXCI7XG5pbXBvcnQgeyBnZXRQZXJzaXN0YWJsZVZhbHVlSW5qZWN0YWJsZUJ1bmNoIH0gZnJvbSBcIkBrOHNsZW5zL3BlcnNpc3RhYmxlLWNvbnRyYWN0c1wiO1xuaW1wb3J0IHsgZW1wdHlTZXR0aW5ncywgdHlwZSBMYXlvdXRTZXR0aW5ncyB9IGZyb20gXCIuL2NvbmZpZy50c1wiO1xuXG5leHBvcnQgdHlwZSBTZXR0aW5nc0JveCA9IHsgZ2V0OiAoKSA9PiBMYXlvdXRTZXR0aW5nczsgc2V0OiAodmFsdWU6IExheW91dFNldHRpbmdzKSA9PiB2b2lkIH07XG5cbmV4cG9ydCBjb25zdCBsYXlvdXRTZXR0aW5nc0J1bmNoID0gZ2V0UGVyc2lzdGFibGVWYWx1ZUluamVjdGFibGVCdW5jaDxMYXlvdXRTZXR0aW5ncz4oKSh7XG4gIGlkOiBcImxheW91dC1zZXR0aW5nc1wiLFxuICBkZWZhdWx0VmFsdWU6IHsgaW5zdGFudGlhdGU6ICgpID0+IGFzeW5jICgpID0+IGVtcHR5U2V0dGluZ3MgfSxcbn0pO1xuXG5leHBvcnQgY29uc3QgbG9hZFNldHRpbmdzSW5qZWN0YWJsZSA9IGdldEluamVjdGFibGUyKHtcbiAgaWQ6IFwibGVucy13b3JrbG9hZC1yb3dzLmxvYWQtc2V0dGluZ3NcIixcbiAgaW5zdGFudGlhdGU6IChkaSkgPT4ge1xuICAgIGNvbnN0IGxvYWQgPSBkaS5pbmplY3QobGF5b3V0U2V0dGluZ3NCdW5jaC5wZXJzaXN0YWJsZSk7XG4gICAgY29uc3QgbG9hZFNldHRpbmdzID0gKCk6IFByb21pc2U8U2V0dGluZ3NCb3g+ID0+IGxvYWQoKTtcbiAgICByZXR1cm4gKCkgPT4gbG9hZFNldHRpbmdzO1xuICB9LFxufSk7XG4iLCAiaW1wb3J0IHsgZ2V0SW5qZWN0YWJsZTIgfSBmcm9tIFwiQGs4c2xlbnMvaW5qZWN0YWJsZVwiO1xuaW1wb3J0IHsgZ2V0TW9kYWxJbmplY3RhYmxlQnVuY2gsIGdldE1vZGFsS2luZCwgb3Blbk1vZGFsSW5qZWN0aW9uVG9rZW4sIHVzZVJlc3BvbmRGcm9tTW9kYWwsIHR5cGUgTW9kYWxQcm9wcyB9IGZyb20gXCJAazhzbGVucy9tb2RhbC1jb250cmFjdHNcIjtcbmltcG9ydCB7IE1vZGFsQ29udGFpbmVyLCBNb2RhbENvbnRlbnQsIE1vZGFsSGVhZGVyIH0gZnJvbSBcIkBrOHNsZW5zL21vZGFsLWNvbXBvbmVudHNcIjtcbmltcG9ydCB7IExheW91dEVkaXRvciB9IGZyb20gXCIuL2VkaXRvclwiO1xuaW1wb3J0IHR5cGUgeyBMYXlvdXRTZXR0aW5ncywgVGFibGVDYXRhbG9nIH0gZnJvbSBcIi4vY29uZmlnLnRzXCI7XG5cbmNvbnN0IGxheW91dEVkaXRvcktpbmQgPSBnZXRNb2RhbEtpbmQ8W3RhYmxlczogVGFibGVDYXRhbG9nW10sIHNldHRpbmdzOiBMYXlvdXRTZXR0aW5nc10sIExheW91dFNldHRpbmdzIHwgbnVsbD4oKShcImxheW91dC1lZGl0b3JcIik7XG5cbmNvbnN0IEVkaXRvck1vZGFsID0gKHsgaW5wdXQ6IFt0YWJsZXMsIHNldHRpbmdzXSB9OiBNb2RhbFByb3BzPHR5cGVvZiBsYXlvdXRFZGl0b3JLaW5kPikgPT4ge1xuICBjb25zdCByZXNwb25kID0gdXNlUmVzcG9uZEZyb21Nb2RhbChsYXlvdXRFZGl0b3JLaW5kKTtcbiAgcmV0dXJuIDxNb2RhbENvbnRhaW5lciAkc3R5bGU9e3sgd2lkdGg6IFwibWluKDEwMjBweCwgY2FsYygxMDB2dyAtIDQ4cHgpKVwiLCBtYXhIZWlnaHQ6IFwiY2FsYygxMDB2aCAtIDQ4cHgpXCIsIG92ZXJmbG93WTogXCJhdXRvXCIgfX0+XG4gICAgPE1vZGFsSGVhZGVyIG9uQ2xvc2U9eygpID0+IHJlc3BvbmQobnVsbCl9Pldvcmtsb2FkIGxheW91dDwvTW9kYWxIZWFkZXI+XG4gICAgPE1vZGFsQ29udGVudD48TGF5b3V0RWRpdG9yIHRhYmxlcz17dGFibGVzfSBzZXR0aW5ncz17c2V0dGluZ3N9IG9uQXBwbHk9eyh2YWx1ZSkgPT4gcmVzcG9uZCh2YWx1ZSl9IG9uQ2FuY2VsPXsoKSA9PiByZXNwb25kKG51bGwpfSAvPjwvTW9kYWxDb250ZW50PlxuICA8L01vZGFsQ29udGFpbmVyPjtcbn07XG5cbmV4cG9ydCBjb25zdCBsYXlvdXRFZGl0b3JNb2RhbEJ1bmNoID0gZ2V0TW9kYWxJbmplY3RhYmxlQnVuY2goeyBraW5kOiBsYXlvdXRFZGl0b3JLaW5kLCBDb21wb25lbnQ6IEVkaXRvck1vZGFsLCBvbkNsb3NlOiAoKSA9PiBudWxsIH0pO1xuXG5leHBvcnQgY29uc3Qgb3BlbkVkaXRvckluamVjdGFibGUgPSBnZXRJbmplY3RhYmxlMih7XG4gIGlkOiBcImxlbnMtd29ya2xvYWQtcm93cy5vcGVuLWVkaXRvclwiLFxuICBjb25zdW1wdGlvbnM6IFtvcGVuTW9kYWxJbmplY3Rpb25Ub2tlbl0sXG4gIGluc3RhbnRpYXRlOiAoZGkpID0+IHtcbiAgICBjb25zdCBvcGVuID0gZGkuaW5qZWN0KG9wZW5Nb2RhbEluamVjdGlvblRva2VuLmZvcihsYXlvdXRFZGl0b3JLaW5kKS5mb3IoZGkuc2NvcGVJZHMpKSgpO1xuICAgIHJldHVybiAoKSA9PiBvcGVuO1xuICB9LFxufSk7XG4iLCAiaW1wb3J0IHsgdXNlU3RhdGUsIHR5cGUgRHJhZ0V2ZW50IH0gZnJvbSBcInJlYWN0XCI7XG5pbXBvcnQgeyBkZWZhdWx0TGF5b3V0LCBkZXRhaWxHcm91cCwgaXNXYXJuaW5nSWNvbiwgbW92ZUZpZWxkLCBub3JtYWxpemUsIHJlc29sdmVMYXlvdXQsIHR5cGUgRmllbGRDb25maWcsIHR5cGUgRmllbGRMaW5lLCB0eXBlIExheW91dFNldHRpbmdzLCB0eXBlIFRhYmxlQ2F0YWxvZywgdHlwZSBUYWJsZUxheW91dCB9IGZyb20gXCIuL2NvbmZpZy50c1wiO1xuXG5leHBvcnQgdHlwZSBFZGl0b3JQcm9wcyA9IHtcbiAgdGFibGVzOiBUYWJsZUNhdGFsb2dbXTtcbiAgc2V0dGluZ3M6IExheW91dFNldHRpbmdzO1xuICBvbkFwcGx5OiAoc2V0dGluZ3M6IExheW91dFNldHRpbmdzKSA9PiB2b2lkO1xuICBvbkNhbmNlbDogKCkgPT4gdm9pZDtcbn07XG5cbmNvbnN0IGxpbmVOYW1lczogUmVjb3JkPEZpZWxkTGluZSwgc3RyaW5nPiA9IHsgcHJpbWFyeTogXCJGaXJzdCBsaW5lXCIsIHNlY29uZGFyeTogXCJTZWNvbmQgbGluZVwiLCBoaWRkZW46IFwiSGlkZGVuXCIgfTtcbmNvbnN0IGV4YW1wbGVzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuICBuYW1lOiBcImV4YW1wbGUtYXBpLTY1ZGY1NjlmZjYtYWJjMTJcIiwgbmFtZXNwYWNlOiBcImV4YW1wbGUtYXBwXCIsIHN0YXR1czogXCJSdW5uaW5nXCIsIHBoYXNlOiBcIlJ1bm5pbmdcIixcbiAgb3duZXJzOiBcIlJlcGxpY2FTZXRcIiwgY29udHJvbGxlZGJ5OiBcIlJlcGxpY2FTZXRcIiwgYWdlOiBcIjE5aFwiLCBjcHU6IFwiMC4wMTBcIiwgbWVtb3J5OiBcIjE0MS4xIE1pQlwiLFxuICByZXN0YXJ0czogXCI2XCIsIG5vZGU6IFwid29ya2VyLW5vZGUtMDFcIiwgcW9zOiBcIkJ1cnN0YWJsZVwiLCBjb250YWluZXJzOiBcIjEvMVwiLFxufTtcblxuZXhwb3J0IGNvbnN0IExheW91dEVkaXRvciA9ICh7IHRhYmxlcywgc2V0dGluZ3MsIG9uQXBwbHksIG9uQ2FuY2VsIH06IEVkaXRvclByb3BzKSA9PiB7XG4gIGNvbnN0IFt0YWJsZUlkLCBzZXRUYWJsZUlkXSA9IHVzZVN0YXRlKHRhYmxlc1swXT8uaWQgPz8gXCJwb2RzXCIpO1xuICBjb25zdCBbZHJhZnRzLCBzZXREcmFmdHNdID0gdXNlU3RhdGUoc2V0dGluZ3MudGFibGVzKTtcbiAgY29uc3QgW2RyYWdnZWQsIHNldERyYWdnZWRdID0gdXNlU3RhdGU8c3RyaW5nIHwgbnVsbD4obnVsbCk7XG4gIGNvbnN0IHRhYmxlID0gdGFibGVzLmZpbmQoKGNhbmRpZGF0ZSkgPT4gY2FuZGlkYXRlLmlkID09PSB0YWJsZUlkKSA/PyB0YWJsZXNbMF07XG4gIGlmICghdGFibGUpIHJldHVybiA8ZGl2IGNsYXNzTmFtZT1cImx3ci1lZGl0b3JcIj48cD5PcGVuIGEgd29ya2xvYWQgbGlzdCBmaXJzdC48L3A+PGJ1dHRvbiBvbkNsaWNrPXtvbkNhbmNlbH0+Q2xvc2U8L2J1dHRvbj48L2Rpdj47XG4gIGNvbnN0IGlkcyA9IHRhYmxlLmZpZWxkcy5tYXAoKGZpZWxkKSA9PiBmaWVsZC5pZCk7XG4gIGNvbnN0IGxheW91dCA9IHJlc29sdmVMYXlvdXQoaWRzLCBkcmFmdHNbdGFibGUuaWRdKTtcbiAgY29uc3QgaW5mbyA9IG5ldyBNYXAodGFibGUuZmllbGRzLm1hcCgoZmllbGQpID0+IFtmaWVsZC5pZCwgZmllbGRdKSk7XG4gIC8vIExlbnMgY2FuIHRlbXBvcmFyaWx5IG9taXQgY29sdW1ucy4gS2VlcCB0aGVpciBzYXZlZCBjb25maWd1cmF0aW9uIGluIGl0c1xuICAvLyBleGlzdGluZyBzbG90cyB3aGlsZSByZXBsYWNpbmcgdmlzaWJsZSBmaWVsZHMgd2l0aCB0aGUgZWRpdG9yJ3MgbmV3IG9yZGVyLlxuICBjb25zdCBwcmVzZXJ2ZVVuYXZhaWxhYmxlID0gKG5leHQ6IFRhYmxlTGF5b3V0LCBwcmV2aW91cz86IFRhYmxlTGF5b3V0KTogVGFibGVMYXlvdXQgPT4ge1xuICAgIGNvbnN0IHZpc2libGUgPSBuZXcgU2V0KGlkcyk7XG4gICAgY29uc3QgcmVtYWluaW5nID0gWy4uLm5leHQuZmllbGRzXTtcbiAgICBjb25zdCBmaWVsZHMgPSAocHJldmlvdXM/LmZpZWxkcyA/PyBbXSkuZmxhdE1hcCgoZmllbGQpID0+IHtcbiAgICAgIGlmICghdmlzaWJsZS5oYXMoZmllbGQuaWQpKSByZXR1cm4gW2ZpZWxkXTtcbiAgICAgIGNvbnN0IHJlcGxhY2VtZW50ID0gcmVtYWluaW5nLnNoaWZ0KCk7XG4gICAgICByZXR1cm4gcmVwbGFjZW1lbnQgPyBbcmVwbGFjZW1lbnRdIDogW107XG4gICAgfSk7XG4gICAgcmV0dXJuIHsgLi4ubmV4dCwgZmllbGRzOiBbLi4uZmllbGRzLCAuLi5yZW1haW5pbmddIH07XG4gIH07XG4gIGNvbnN0IHVwZGF0ZSA9IChuZXh0OiBUYWJsZUxheW91dCkgPT4gc2V0RHJhZnRzKChwcmV2aW91cykgPT4gKHsgLi4ucHJldmlvdXMsIFt0YWJsZS5pZF06IHByZXNlcnZlVW5hdmFpbGFibGUobmV4dCwgcHJldmlvdXNbdGFibGUuaWRdKSB9KSk7XG4gIGNvbnN0IG1vdmUgPSAoaWQ6IHN0cmluZywgbGluZTogRmllbGRMaW5lLCBiZWZvcmU/OiBzdHJpbmcpID0+IHVwZGF0ZShtb3ZlRmllbGQobGF5b3V0LCBpZCwgbGluZSwgYmVmb3JlKSk7XG5cbiAgZnVuY3Rpb24gZHJvcChldmVudDogRHJhZ0V2ZW50LCBsaW5lOiBGaWVsZExpbmUsIGJlZm9yZT86IHN0cmluZykge1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgY29uc3QgaWQgPSBldmVudC5kYXRhVHJhbnNmZXIuZ2V0RGF0YShcInRleHQvcGxhaW5cIikgfHwgZHJhZ2dlZDtcbiAgICBpZiAoaWQgJiYgaWRzLmluY2x1ZGVzKGlkKSkgbW92ZShpZCwgbGluZSwgYmVmb3JlKTtcbiAgICBzZXREcmFnZ2VkKG51bGwpO1xuICB9XG5cbiAgZnVuY3Rpb24gbnVkZ2UoZmllbGQ6IEZpZWxkQ29uZmlnLCBkaXJlY3Rpb246IC0xIHwgMSkge1xuICAgIGNvbnN0IHBlZXJzID0gbGF5b3V0LmZpZWxkcy5maWx0ZXIoKGNhbmRpZGF0ZSkgPT4gY2FuZGlkYXRlLmxpbmUgPT09IGZpZWxkLmxpbmUpO1xuICAgIGNvbnN0IGluZGV4ID0gcGVlcnMuZmluZEluZGV4KChjYW5kaWRhdGUpID0+IGNhbmRpZGF0ZS5pZCA9PT0gZmllbGQuaWQpO1xuICAgIGlmIChkaXJlY3Rpb24gPT09IC0xICYmIGluZGV4ID4gMCkgbW92ZShmaWVsZC5pZCwgZmllbGQubGluZSwgcGVlcnNbaW5kZXggLSAxXS5pZCk7XG4gICAgaWYgKGRpcmVjdGlvbiA9PT0gMSAmJiBpbmRleCA8IHBlZXJzLmxlbmd0aCAtIDEpIG1vdmUoZmllbGQuaWQsIGZpZWxkLmxpbmUsIHBlZXJzW2luZGV4ICsgMl0/LmlkKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpZWxkQ2FyZChmaWVsZDogRmllbGRDb25maWcpIHtcbiAgICBjb25zdCBsYWJlbCA9IGluZm8uZ2V0KGZpZWxkLmlkKT8ubGFiZWwgPz8gZmllbGQuaWQ7XG4gICAgY29uc3QgcGVlcnMgPSBsYXlvdXQuZmllbGRzLmZpbHRlcigoY2FuZGlkYXRlKSA9PiBjYW5kaWRhdGUubGluZSA9PT0gZmllbGQubGluZSk7XG4gICAgY29uc3QgaW5kZXggPSBwZWVycy5maW5kSW5kZXgoKGNhbmRpZGF0ZSkgPT4gY2FuZGlkYXRlLmlkID09PSBmaWVsZC5pZCk7XG4gICAgcmV0dXJuIChcbiAgICAgIDxkaXYgY2xhc3NOYW1lPXtgbHdyLWZpZWxkICR7ZHJhZ2dlZCA9PT0gZmllbGQuaWQgPyBcImx3ci1kcmFnZ2luZ1wiIDogXCJcIn1gfSBrZXk9e2ZpZWxkLmlkfVxuICAgICAgICBkcmFnZ2FibGUgb25EcmFnU3RhcnQ9eyhldmVudCkgPT4geyBldmVudC5kYXRhVHJhbnNmZXIuc2V0RGF0YShcInRleHQvcGxhaW5cIiwgZmllbGQuaWQpOyBldmVudC5kYXRhVHJhbnNmZXIuZWZmZWN0QWxsb3dlZCA9IFwibW92ZVwiOyBzZXREcmFnZ2VkKGZpZWxkLmlkKTsgfX1cbiAgICAgICAgb25EcmFnRW5kPXsoKSA9PiBzZXREcmFnZ2VkKG51bGwpfSBvbkRyYWdPdmVyPXsoZXZlbnQpID0+IGV2ZW50LnByZXZlbnREZWZhdWx0KCl9IG9uRHJvcD17KGV2ZW50KSA9PiBkcm9wKGV2ZW50LCBmaWVsZC5saW5lLCBmaWVsZC5pZCl9PlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImx3ci1maWVsZC10aXRsZVwiPjxzcGFuIGNsYXNzTmFtZT1cImx3ci1ncmlwXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+XHUyMkVFXHUyMkVFPC9zcGFuPjxzdHJvbmc+e2xhYmVsfTwvc3Ryb25nPjwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImx3ci1maWVsZC1hY3Rpb25zXCI+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgYXJpYS1sYWJlbD17YE1vdmUgJHtsYWJlbH0gbGVmdGB9IGRpc2FibGVkPXtpbmRleCA9PT0gMH0gb25DbGljaz17KCkgPT4gbnVkZ2UoZmllbGQsIC0xKX0+XHUyMTkwPC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgYXJpYS1sYWJlbD17YE1vdmUgJHtsYWJlbH0gcmlnaHRgfSBkaXNhYmxlZD17aW5kZXggPT09IHBlZXJzLmxlbmd0aCAtIDF9IG9uQ2xpY2s9eygpID0+IG51ZGdlKGZpZWxkLCAxKX0+XHUyMTkyPC9idXR0b24+XG4gICAgICAgICAgPHNlbGVjdCBhcmlhLWxhYmVsPXtgTGluZSBmb3IgJHtsYWJlbH1gfSB2YWx1ZT17ZmllbGQubGluZX0gb25DaGFuZ2U9eyhldmVudCkgPT4gbW92ZShmaWVsZC5pZCwgZXZlbnQudGFyZ2V0LnZhbHVlIGFzIEZpZWxkTGluZSl9PlxuICAgICAgICAgICAgPG9wdGlvbiB2YWx1ZT1cInByaW1hcnlcIj57aXNXYXJuaW5nSWNvbihmaWVsZC5pZCkgPyBcIkJlc2lkZSBuYW1lXCIgOiBcIkZpcnN0IGxpbmVcIn08L29wdGlvbj5cbiAgICAgICAgICAgIHshaXNXYXJuaW5nSWNvbihmaWVsZC5pZCkgJiYgPG9wdGlvbiB2YWx1ZT1cInNlY29uZGFyeVwiPlNlY29uZCBsaW5lPC9vcHRpb24+fVxuICAgICAgICAgICAgPG9wdGlvbiB2YWx1ZT1cImhpZGRlblwiIGRpc2FibGVkPXtub3JtYWxpemUoZmllbGQuaWQpID09PSBcIm5hbWVcIn0+SGlkZGVuPC9vcHRpb24+XG4gICAgICAgICAgPC9zZWxlY3Q+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICB7ZmllbGQubGluZSAhPT0gXCJoaWRkZW5cIiAmJiAhaXNXYXJuaW5nSWNvbihmaWVsZC5pZCkgJiYgPGxhYmVsIGNsYXNzTmFtZT1cImx3ci13aWR0aFwiPntsYXlvdXQuYXV0b1NlY29uZGFyeSAmJiBmaWVsZC5saW5lID09PSBcInNlY29uZGFyeVwiID8gXCJBdXRvbWF0aWMgd2lkdGhcIiA6IFwiV2lkdGhcIn1cbiAgICAgICAgICA8aW5wdXQgdHlwZT1cInJhbmdlXCIgbWluPVwiMVwiIG1heD1cIjQ4XCIgdmFsdWU9e2ZpZWxkLndpZHRofSBkaXNhYmxlZD17bGF5b3V0LmF1dG9TZWNvbmRhcnkgJiYgZmllbGQubGluZSA9PT0gXCJzZWNvbmRhcnlcIn0gYXJpYS1sYWJlbD17YFdpZHRoIGZvciAke2xhYmVsfWB9XG4gICAgICAgICAgICBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGUoeyAuLi5sYXlvdXQsIGZpZWxkczogbGF5b3V0LmZpZWxkcy5tYXAoKGNhbmRpZGF0ZSkgPT4gY2FuZGlkYXRlLmlkID09PSBmaWVsZC5pZCA/IHsgLi4uY2FuZGlkYXRlLCB3aWR0aDogTnVtYmVyKGV2ZW50LnRhcmdldC52YWx1ZSkgfSA6IGNhbmRpZGF0ZSkgfSl9IC8+XG4gICAgICAgICAgPG91dHB1dD57ZmllbGQud2lkdGh9PC9vdXRwdXQ+XG4gICAgICAgIDwvbGFiZWw+fVxuICAgICAgPC9kaXY+XG4gICAgKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByZXZpZXdMaW5lKGxpbmU6IFwicHJpbWFyeVwiIHwgXCJzZWNvbmRhcnlcIikge1xuICAgIGNvbnN0IGZpZWxkcyA9IGxheW91dC5maWVsZHMuZmlsdGVyKChmaWVsZCkgPT4gZmllbGQubGluZSA9PT0gbGluZSAmJiAhaXNXYXJuaW5nSWNvbihmaWVsZC5pZCkpO1xuICAgIGNvbnN0IGF1dG8gPSBsaW5lID09PSBcInNlY29uZGFyeVwiICYmIGxheW91dC5hdXRvU2Vjb25kYXJ5O1xuICAgIHJldHVybiA8ZGl2IGNsYXNzTmFtZT17YGx3ci1wcmV2aWV3LWxpbmUgbHdyLXByZXZpZXctJHtsaW5lfSAke2F1dG8gPyBcImx3ci1wcmV2aWV3LWF1dG9cIiA6IFwiXCJ9YH0gc3R5bGU9e3sgZ3JpZFRlbXBsYXRlQ29sdW1uczogYXV0byA/IHVuZGVmaW5lZCA6IGZpZWxkcy5tYXAoKGZpZWxkKSA9PiBgbWlubWF4KDAsICR7ZmllbGQud2lkdGh9ZnIpYCkuam9pbihcIiBcIikgfX0+XG4gICAgICB7ZmllbGRzLm1hcCgoZmllbGQsIGluZGV4KSA9PiB7XG4gICAgICAgIGNvbnN0IGNvbHVtbiA9IGluZm8uZ2V0KGZpZWxkLmlkKTtcbiAgICAgICAgY29uc3Qgc2FtcGxlID0gY29sdW1uPy5zYW1wbGUgfHwgZXhhbXBsZXNbbm9ybWFsaXplKGZpZWxkLmlkKV0gfHwgXCJcdTIwMTRcIjtcbiAgICAgICAgY29uc3Qgc3RhdHVzQ2xhc3MgPSBbXCJzdGF0dXNcIiwgXCJwaGFzZVwiXS5pbmNsdWRlcyhub3JtYWxpemUoZmllbGQuaWQpKVxuICAgICAgICAgID8gL2ZhaWxlZHxlcnJvcnxjcmFzaHxiYWNrb2ZmL2kudGVzdChzYW1wbGUpID8gXCJsd3ItcHJldmlldy1lcnJvclwiIDogL3J1bm5pbmd8cmVhZHl8aGVhbHRoeXxzdWNjZWVkZWQvaS50ZXN0KHNhbXBsZSkgPyBcImx3ci1wcmV2aWV3LXN0YXR1c1wiIDogXCJcIlxuICAgICAgICAgIDogXCJcIjtcbiAgICAgICAgY29uc3QgZ3JvdXBTdGFydCA9IGxpbmUgPT09IFwic2Vjb25kYXJ5XCIgJiYgaW5kZXggPiAwICYmIGRldGFpbEdyb3VwKGZpZWxkLmlkKSAhPT0gZGV0YWlsR3JvdXAoZmllbGRzW2luZGV4IC0gMV0uaWQpO1xuICAgICAgICByZXR1cm4gPGRpdiBjbGFzc05hbWU9e2Bsd3ItcHJldmlldy12YWx1ZSAke2dyb3VwU3RhcnQgPyBcImx3ci1wcmV2aWV3LWdyb3VwXCIgOiBcIlwifWB9IGtleT17ZmllbGQuaWR9IHRpdGxlPXtgJHtjb2x1bW4/LmxhYmVsfTogJHtzYW1wbGV9YH0+XG4gICAgICAgICAgeyhsaW5lID09PSBcInByaW1hcnlcIiB8fCBsYXlvdXQubGFiZWxzIHx8IGF1dG8pICYmIDxzcGFuIGNsYXNzTmFtZT1cImx3ci1wcmV2aWV3LWxhYmVsXCI+e2NvbHVtbj8ubGFiZWx9PC9zcGFuPn1cbiAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9e2Ake25vcm1hbGl6ZShmaWVsZC5pZCkgPT09IFwibmFtZVwiID8gXCJsd3ItcHJldmlldy1uYW1lXCIgOiBcIlwifSAke3N0YXR1c0NsYXNzfWB9PntzYW1wbGV9PC9zcGFuPlxuICAgICAgICA8L2Rpdj47XG4gICAgICB9KX1cbiAgICAgIHshZmllbGRzLmxlbmd0aCAmJiA8c3BhbiBjbGFzc05hbWU9XCJsd3ItZW1wdHktbGluZVwiPk5vIGZpZWxkcyBvbiB0aGlzIGxpbmU8L3NwYW4+fVxuICAgIDwvZGl2PjtcbiAgfVxuXG4gIHJldHVybiA8ZGl2IGNsYXNzTmFtZT1cImx3ci1lZGl0b3JcIj5cbiAgICA8ZGl2IGNsYXNzTmFtZT1cImx3ci1lZGl0b3ItdG9vbGJhclwiPlxuICAgICAgPGxhYmVsPlZpZXcgPHNlbGVjdCBhcmlhLWxhYmVsPVwiV29ya2xvYWQgdmlld1wiIHZhbHVlPXt0YWJsZS5pZH0gb25DaGFuZ2U9eyhldmVudCkgPT4geyBzZXRUYWJsZUlkKGV2ZW50LnRhcmdldC52YWx1ZSk7IHNldERyYWdnZWQobnVsbCk7IH19PlxuICAgICAgICB7dGFibGVzLm1hcCgoY2FuZGlkYXRlKSA9PiA8b3B0aW9uIGtleT17Y2FuZGlkYXRlLmlkfSB2YWx1ZT17Y2FuZGlkYXRlLmlkfT57Y2FuZGlkYXRlLmlkLnJlcGxhY2UoLy0vZywgXCIgXCIpfTwvb3B0aW9uPil9XG4gICAgICA8L3NlbGVjdD48L2xhYmVsPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJsd3ItcHJlc2V0c1wiPjxzcGFuPlN0YXJ0IGZyb208L3NwYW4+XG4gICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHVwZGF0ZShkZWZhdWx0TGF5b3V0KGlkcywgXCJiYWxhbmNlZFwiKSl9PkJhbGFuY2VkPC9idXR0b24+XG4gICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHVwZGF0ZShkZWZhdWx0TGF5b3V0KGlkcywgXCJ0cm91Ymxlc2hvb3RpbmdcIikpfT5Ucm91Ymxlc2hvb3Rpbmc8L2J1dHRvbj5cbiAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gdXBkYXRlKGRlZmF1bHRMYXlvdXQoaWRzLCBcImFsbFwiKSl9PkFsbCBmaWVsZHM8L2J1dHRvbj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICAgIDxkaXYgY2xhc3NOYW1lPVwibHdyLXByZXZpZXdcIiBhcmlhLWxhYmVsPVwiTGF5b3V0IHByZXZpZXdcIj5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwibHdyLXNlY3Rpb24tbGFiZWxcIj5MaXZlIHByZXZpZXc8L2Rpdj5cbiAgICAgIHtwcmV2aWV3TGluZShcInByaW1hcnlcIil9e3ByZXZpZXdMaW5lKFwic2Vjb25kYXJ5XCIpfVxuICAgIDwvZGl2PlxuICAgIDxwIGNsYXNzTmFtZT1cImx3ci1oZWxwXCI+RHJhZyBmaWVsZHMgYmV0d2VlbiBsaW5lcyBvciBjaGFuZ2UgdGhlaXIgZHJvcGRvd24uIEFycm93cyBjaGFuZ2Ugb3JkZXIuIFdpZHRoIHNoYXJlcyBzcGFjZSB3aXRoaW4gZWFjaCBsaW5lLjwvcD5cbiAgICA8ZGl2IGNsYXNzTmFtZT1cImx3ci1sYW5lc1wiPlxuICAgICAgeyhbXCJwcmltYXJ5XCIsIFwic2Vjb25kYXJ5XCJdIGFzIGNvbnN0KS5tYXAoKGxpbmUpID0+IDxzZWN0aW9uIGNsYXNzTmFtZT17YGx3ci1sYW5lICR7ZHJhZ2dlZCA/IFwibHdyLWRyb3AtcmVhZHlcIiA6IFwiXCJ9YH0ga2V5PXtsaW5lfVxuICAgICAgICBhcmlhLWxhYmVsPXtsaW5lTmFtZXNbbGluZV19IG9uRHJhZ092ZXI9eyhldmVudCkgPT4gZXZlbnQucHJldmVudERlZmF1bHQoKX0gb25Ecm9wPXsoZXZlbnQpID0+IGRyb3AoZXZlbnQsIGxpbmUpfT5cbiAgICAgICAgPGgzPntsaW5lTmFtZXNbbGluZV19IDxzcGFuPntsYXlvdXQuZmllbGRzLmZpbHRlcigoZmllbGQpID0+IGZpZWxkLmxpbmUgPT09IGxpbmUpLmxlbmd0aH08L3NwYW4+PC9oMz5cbiAgICAgICAge2xheW91dC5maWVsZHMuZmlsdGVyKChmaWVsZCkgPT4gZmllbGQubGluZSA9PT0gbGluZSkubWFwKGZpZWxkQ2FyZCl9XG4gICAgICAgIHshbGF5b3V0LmZpZWxkcy5zb21lKChmaWVsZCkgPT4gZmllbGQubGluZSA9PT0gbGluZSkgJiYgPHAgY2xhc3NOYW1lPVwibHdyLWVtcHR5LWxpbmVcIj5Ecm9wIGEgZmllbGQgaGVyZTwvcD59XG4gICAgICA8L3NlY3Rpb24+KX1cbiAgICA8L2Rpdj5cbiAgICA8c2VjdGlvbiBjbGFzc05hbWU9XCJsd3ItaGlkZGVuXCIgYXJpYS1sYWJlbD1cIkhpZGRlbiBmaWVsZHNcIiBvbkRyYWdPdmVyPXsoZXZlbnQpID0+IGV2ZW50LnByZXZlbnREZWZhdWx0KCl9IG9uRHJvcD17KGV2ZW50KSA9PiBkcm9wKGV2ZW50LCBcImhpZGRlblwiKX0+XG4gICAgICA8aDM+SGlkZGVuIDxzcGFuPntsYXlvdXQuZmllbGRzLmZpbHRlcigoZmllbGQpID0+IGZpZWxkLmxpbmUgPT09IFwiaGlkZGVuXCIpLmxlbmd0aH08L3NwYW4+PC9oMz5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwibHdyLWhpZGRlbi1saXN0XCI+e2xheW91dC5maWVsZHMuZmlsdGVyKChmaWVsZCkgPT4gZmllbGQubGluZSA9PT0gXCJoaWRkZW5cIikubWFwKGZpZWxkQ2FyZCl9PC9kaXY+XG4gICAgICB7IWxheW91dC5maWVsZHMuc29tZSgoZmllbGQpID0+IGZpZWxkLmxpbmUgPT09IFwiaGlkZGVuXCIpICYmIDxwIGNsYXNzTmFtZT1cImx3ci1lbXB0eS1saW5lXCI+RHJvcCBmaWVsZHMgaGVyZSB0byBoaWRlIHRoZW08L3A+fVxuICAgIDwvc2VjdGlvbj5cbiAgICA8ZGl2IGNsYXNzTmFtZT1cImx3ci1lZGl0b3Itb3B0aW9uc1wiPjxsYWJlbD48aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgYXJpYS1sYWJlbD1cIkF1dG8gd2lkdGggZm9yIHNlY29uZCBsaW5lXCIgY2hlY2tlZD17bGF5b3V0LmF1dG9TZWNvbmRhcnl9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZSh7IC4uLmxheW91dCwgYXV0b1NlY29uZGFyeTogZXZlbnQudGFyZ2V0LmNoZWNrZWQgfSl9IC8+IEF1dG8gd2lkdGggZm9yIHNlY29uZCBsaW5lPC9sYWJlbD5cbiAgICAgIDxsYWJlbD48aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgY2hlY2tlZD17bGF5b3V0LmxhYmVscyB8fCBsYXlvdXQuYXV0b1NlY29uZGFyeX0gZGlzYWJsZWQ9e2xheW91dC5hdXRvU2Vjb25kYXJ5fSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGUoeyAuLi5sYXlvdXQsIGxhYmVsczogZXZlbnQudGFyZ2V0LmNoZWNrZWQgfSl9IC8+IExhYmVsIGRldGFpbCB2YWx1ZXM8L2xhYmVsPlxuICAgICAgPHNwYW4+TGF5b3V0cyBzYXZlIHBlciB3b3JrbG9hZCB0eXBlLiBGaWVsZHMgaGlkZGVuIGluIExlbnNcdTIwMTlzIGNvbHVtbiBtZW51IHN0YXkgaGlkZGVuLjwvc3Bhbj5cbiAgICA8L2Rpdj5cbiAgICB7bGF5b3V0LmF1dG9TZWNvbmRhcnkgJiYgPHAgY2xhc3NOYW1lPVwibHdyLWhlbHBcIj5EZXRhaWwgZmllbGRzIGZpdCB0aGVpciB0ZXh0IGluIGVhY2ggcm93LiBMb25nIHZhbHVlcyBzaHJpbmsgd2hlbiBzcGFjZSBpcyBsaW1pdGVkLiBNYW51YWwgd2lkdGhzIGFyZSBrZXB0IGZvciB3aGVuIHlvdSBzd2l0Y2ggdGhpcyBvZmYuPC9wPn1cbiAgICA8ZGl2IGNsYXNzTmFtZT1cImx3ci1lZGl0b3ItZm9vdGVyXCI+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17b25DYW5jZWx9PkNhbmNlbDwvYnV0dG9uPjxidXR0b24gY2xhc3NOYW1lPVwibHdyLWFwcGx5XCIgdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IG9uQXBwbHkoeyAuLi5zZXR0aW5ncywgdGFibGVzOiB7IC4uLmRyYWZ0cywgW3RhYmxlLmlkXTogcHJlc2VydmVVbmF2YWlsYWJsZShsYXlvdXQsIGRyYWZ0c1t0YWJsZS5pZF0pIH0gfSl9PkFwcGx5IGxheW91dDwvYnV0dG9uPjwvZGl2PlxuICA8L2Rpdj47XG59O1xuIiwgImV4cG9ydCBjb25zdCBlZGl0b3JDc3MgPSBgXG4ubHdyLWVkaXRvciB7IGNvbG9yOiB2YXIoLS10ZXh0Q29sb3JQcmltYXJ5LCAjMjYzNTQ4KTsgZm9udDogMTNweC8xLjQ1IHN5c3RlbS11aSwgc2Fucy1zZXJpZjsgfVxuLmx3ci1lZGl0b3IgKiwgLmx3ci1lZGl0b3IgKjo6YmVmb3JlLCAubHdyLWVkaXRvciAqOjphZnRlciB7IGJveC1zaXppbmc6IGJvcmRlci1ib3g7IH1cbi5sd3ItZWRpdG9yIGJ1dHRvbiwgLmx3ci1lZGl0b3Igc2VsZWN0IHsgZm9udDogaW5oZXJpdDsgY29sb3I6IGluaGVyaXQ7IGJhY2tncm91bmQ6IHZhcigtLWNvbnRlbnRDb2xvciwgI2ZmZik7IGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLWJvcmRlckNvbG9yLCAjY2FkNGRmKTsgYm9yZGVyLXJhZGl1czogNnB4OyBwYWRkaW5nOiA1cHggOXB4OyBjdXJzb3I6IHBvaW50ZXI7IH1cbi5sd3ItZWRpdG9yIGJ1dHRvbjpob3ZlciB7IGJhY2tncm91bmQ6IHZhcigtLXRhYmxlQmdjU2VsZWN0ZWQsICNlYWYxZmEpOyB9XG4ubHdyLWVkaXRvciBidXR0b246ZGlzYWJsZWQgeyBvcGFjaXR5OiAuMzU7IGN1cnNvcjogZGVmYXVsdDsgfVxuLmx3ci1lZGl0b3IgYnV0dG9uOmZvY3VzLXZpc2libGUsIC5sd3ItZWRpdG9yIHNlbGVjdDpmb2N1cy12aXNpYmxlLCAubHdyLWVkaXRvciBpbnB1dDpmb2N1cy12aXNpYmxlIHsgb3V0bGluZTogMnB4IHNvbGlkIHZhcigtLXByaW1hcnksICMyODc0ZDApOyBvdXRsaW5lLW9mZnNldDogMnB4OyB9XG4ubHdyLWVkaXRvci10b29sYmFyIHsgZGlzcGxheTogZmxleDsgZmxleC13cmFwOiB3cmFwOyBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47IGFsaWduLWl0ZW1zOiBjZW50ZXI7IGdhcDogMTJweDsgbWFyZ2luLWJvdHRvbTogMTZweDsgfVxuLmx3ci1lZGl0b3ItdG9vbGJhciBsYWJlbCB7IGRpc3BsYXk6IGZsZXg7IGFsaWduLWl0ZW1zOiBjZW50ZXI7IGdhcDogOHB4OyBmb250LXdlaWdodDogNjAwOyB9XG4ubHdyLXByZXNldHMgeyBkaXNwbGF5OiBmbGV4OyBmbGV4LXdyYXA6IHdyYXA7IGFsaWduLWl0ZW1zOiBjZW50ZXI7IGdhcDogNnB4OyB9XG4ubHdyLXByZXNldHMgPiBzcGFuLCAubHdyLWhlbHAsIC5sd3ItZW1wdHktbGluZSB7IGNvbG9yOiB2YXIoLS10ZXh0Q29sb3JTZWNvbmRhcnksICM3NTgzOTkpOyB9XG4ubHdyLXByZXZpZXcgeyBib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1ib3JkZXJDb2xvciwgI2NhZDRkZik7IGJvcmRlci1yYWRpdXM6IDEwcHg7IG92ZXJmbG93OiBoaWRkZW47IGJhY2tncm91bmQ6IHZhcigtLWNvbnRlbnRDb2xvciwgI2ZmZik7IH1cbi5sd3Itc2VjdGlvbi1sYWJlbCB7IHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7IGxldHRlci1zcGFjaW5nOiAuMDhlbTsgZm9udC1zaXplOiAxMHB4OyBmb250LXdlaWdodDogNzAwOyBjb2xvcjogdmFyKC0tdGV4dENvbG9yU2Vjb25kYXJ5LCAjNzU4Mzk5KTsgcGFkZGluZzogMTBweCAxNHB4IDA7IH1cbi5sd3ItcHJldmlldy1saW5lIHsgZGlzcGxheTogZ3JpZDsgZ2FwOiAxNHB4OyBwYWRkaW5nOiAxMHB4IDE0cHg7IG1pbi1oZWlnaHQ6IDQ1cHg7IH1cbi5sd3ItcHJldmlldy1wcmltYXJ5IHsgYmFja2dyb3VuZDogY29sb3ItbWl4KGluIHNyZ2IsIHZhcigtLXRleHRDb2xvclByaW1hcnksICM2NDc0OGIpIDMlLCB2YXIoLS1jb250ZW50Q29sb3IsICNmZmYpKTsgfVxuLmx3ci1wcmV2aWV3LXNlY29uZGFyeSB7IGJvcmRlci10b3A6IDFweCBzb2xpZCB2YXIoLS1ib3JkZXJDb2xvciwgI2U0ZWFmMSk7IGJhY2tncm91bmQ6IHZhcigtLWNvbnRlbnRDb2xvciwgI2ZmZik7IH1cbi5sd3ItcHJldmlldy1zZWNvbmRhcnkgLmx3ci1wcmV2aWV3LXZhbHVlIHsgZmxleC1kaXJlY3Rpb246IHJvdzsgYWxpZ24taXRlbXM6IGNlbnRlcjsgZ2FwOiA2cHg7IH1cbi5sd3ItcHJldmlldy1zZWNvbmRhcnkgLmx3ci1wcmV2aWV3LWxhYmVsIHsgZmxleC1zaHJpbms6IDA7IG1hcmdpbi1ib3R0b206IDA7IH1cbi5sd3ItcHJldmlldy1zZWNvbmRhcnkgLmx3ci1wcmV2aWV3LWdyb3VwIHsgYm9yZGVyLWlubGluZS1zdGFydDogMXB4IHNvbGlkIHZhcigtLWJvcmRlckNvbG9yLCAjY2JkNWUxKTsgcGFkZGluZy1pbmxpbmUtc3RhcnQ6IDE0cHg7IH1cbi5sd3ItcHJldmlldy1hdXRvIHsgZGlzcGxheTogZmxleDsgZ2FwOiAxMnB4OyBvdmVyZmxvdzogaGlkZGVuOyB9XG4ubHdyLXByZXZpZXctYXV0byAubHdyLXByZXZpZXctdmFsdWUgeyBmbGV4OiAwIDEgYXV0bzsgfVxuLmx3ci1wcmV2aWV3LWF1dG8gLmx3ci1wcmV2aWV3LXZhbHVlOmhhcygubHdyLXByZXZpZXctbmFtZSkgeyBtaW4td2lkdGg6IDgwcHg7IH1cbi5sd3ItcHJldmlldy1zZWNvbmRhcnkgLmx3ci1wcmV2aWV3LXN0YXR1cywgLmx3ci1wcmV2aWV3LXByaW1hcnkgLmx3ci1wcmV2aWV3LXN0YXR1cyxcbi5sd3ItcHJldmlldy1zZWNvbmRhcnkgLmx3ci1wcmV2aWV3LWVycm9yLCAubHdyLXByZXZpZXctcHJpbWFyeSAubHdyLXByZXZpZXctZXJyb3IgeyBhbGlnbi1zZWxmOiBmbGV4LXN0YXJ0OyBib3JkZXItcmFkaXVzOiA5OTlweDsgcGFkZGluZzogMXB4IDdweDsgYmFja2dyb3VuZDogY29sb3ItbWl4KGluIHNyZ2IsIGN1cnJlbnRDb2xvciA5JSwgdHJhbnNwYXJlbnQpOyB9XG4ubHdyLXByZXZpZXctdmFsdWUgeyBtaW4td2lkdGg6IDA7IG92ZXJmbG93OiBoaWRkZW47IGRpc3BsYXk6IGZsZXg7IGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47IH1cbi5sd3ItcHJldmlldy12YWx1ZSA+IHNwYW4geyBvdmVyZmxvdzogaGlkZGVuOyB0ZXh0LW92ZXJmbG93OiBlbGxpcHNpczsgd2hpdGUtc3BhY2U6IG5vd3JhcDsgfVxuLmx3ci1wcmV2aWV3LWxhYmVsIHsgY29sb3I6IHZhcigtLXRleHRDb2xvclNlY29uZGFyeSwgIzc1ODM5OSk7IGZvbnQtc2l6ZTogMTBweDsgbWFyZ2luLWJvdHRvbTogM3B4OyB9XG4ubHdyLXByZXZpZXctbmFtZSB7IGZvbnQtd2VpZ2h0OiA2NTA7IH1cbi5sd3ItcHJldmlldy1zdGF0dXMgeyBjb2xvcjogdmFyKC0tY29sb3JPaywgIzI1ODI0Zik7IH1cbi5sd3ItcHJldmlldy1lcnJvciB7IGNvbG9yOiB2YXIoLS1jb2xvckVycm9yLCAjY2YzZjRiKTsgfVxuLmx3ci1oZWxwIHsgbWFyZ2luOiAxMnB4IDA7IGZvbnQtc2l6ZTogMTJweDsgfVxuLmx3ci1sYW5lcyB7IGRpc3BsYXk6IGdyaWQ7IGdyaWQtdGVtcGxhdGUtY29sdW1uczogMWZyIDFmcjsgZ2FwOiAxMnB4OyBtYXgtaGVpZ2h0OiAzN3ZoOyBtaW4taGVpZ2h0OiAxMjBweDsgb3ZlcmZsb3cteTogYXV0bzsgcGFkZGluZzogMnB4OyB9XG4ubHdyLWxhbmUsIC5sd3ItaGlkZGVuIHsgYm9yZGVyOiAxcHggc29saWQgdmFyKC0tYm9yZGVyQ29sb3IsICNkY2UzZWMpOyBib3JkZXItcmFkaXVzOiA5cHg7IHBhZGRpbmc6IDEwcHg7IG1pbi13aWR0aDogMDsgfVxuLmx3ci1sYW5lIGgzLCAubHdyLWhpZGRlbiBoMyB7IGZvbnQ6IDYwMCAxMnB4LzEuNCBzeXN0ZW0tdWk7IG1hcmdpbjogMCAwIDhweDsgZGlzcGxheTogZmxleDsgZ2FwOiA3cHg7IGFsaWduLWl0ZW1zOiBjZW50ZXI7IH1cbi5sd3ItbGFuZSBoMyA+IHNwYW4sIC5sd3ItaGlkZGVuIGgzID4gc3BhbiB7IGNvbG9yOiB2YXIoLS10ZXh0Q29sb3JTZWNvbmRhcnksICM3NTgzOTkpOyBmb250LXdlaWdodDogNDAwOyB9XG4ubHdyLWRyb3AtcmVhZHkgeyBib3JkZXItc3R5bGU6IGRhc2hlZDsgfVxuLmx3ci1maWVsZCB7IGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLWJvcmRlckNvbG9yLCAjZGNlM2VjKTsgYm9yZGVyLXJhZGl1czogN3B4OyBwYWRkaW5nOiA4cHggMTBweDsgbWFyZ2luLXRvcDogN3B4OyBiYWNrZ3JvdW5kOiB2YXIoLS1jb250ZW50Q29sb3IsICNmZmYpOyBkaXNwbGF5OiBncmlkOyBncmlkLXRlbXBsYXRlLWNvbHVtbnM6IG1pbm1heCg4MHB4LCAxZnIpIGF1dG87IGdhcDogNnB4IDhweDsgfVxuLmx3ci1maWVsZC10aXRsZSB7IGRpc3BsYXk6IGZsZXg7IGdhcDogNnB4OyBhbGlnbi1pdGVtczogY2VudGVyOyBtaW4td2lkdGg6IDA7IH1cbi5sd3ItZmllbGQtdGl0bGUgc3Ryb25nIHsgZm9udC1zaXplOiAxMnB4OyBvdmVyZmxvdzogaGlkZGVuOyB0ZXh0LW92ZXJmbG93OiBlbGxpcHNpczsgd2hpdGUtc3BhY2U6IG5vd3JhcDsgfVxuLmx3ci1ncmlwIHsgY29sb3I6IHZhcigtLXRleHRDb2xvclNlY29uZGFyeSwgIzc1ODM5OSk7IGN1cnNvcjogZ3JhYjsgfVxuLmx3ci1maWVsZC1hY3Rpb25zIHsgZGlzcGxheTogZmxleDsgZ2FwOiAzcHg7IGFsaWduLWl0ZW1zOiBjZW50ZXI7IH1cbi5sd3ItZmllbGQtYWN0aW9ucyBidXR0b24geyBwYWRkaW5nOiAycHggNXB4OyB9XG4ubHdyLWZpZWxkLWFjdGlvbnMgc2VsZWN0IHsgbWF4LXdpZHRoOiAxMDRweDsgcGFkZGluZzogM3B4OyBmb250LXNpemU6IDExcHg7IH1cbi5sd3Itd2lkdGggeyBncmlkLWNvbHVtbjogMSAvIC0xOyBkaXNwbGF5OiBmbGV4OyBnYXA6IDhweDsgYWxpZ24taXRlbXM6IGNlbnRlcjsgZm9udC1zaXplOiAxMHB4OyBjb2xvcjogdmFyKC0tdGV4dENvbG9yU2Vjb25kYXJ5LCAjNzU4Mzk5KTsgfVxuLmx3ci13aWR0aCBpbnB1dCB7IGZsZXg6IDE7IG1pbi13aWR0aDogMDsgYWNjZW50LWNvbG9yOiB2YXIoLS1wcmltYXJ5LCAjMjg3NGQwKTsgaGVpZ2h0OiAxM3B4OyB9XG4ubHdyLXdpZHRoIGlucHV0OmRpc2FibGVkIHsgb3BhY2l0eTogLjM1OyB9XG4ubHdyLXdpZHRoIG91dHB1dCB7IG1pbi13aWR0aDogMThweDsgdGV4dC1hbGlnbjogcmlnaHQ7IH1cbi5sd3ItZHJhZ2dpbmcgeyBvcGFjaXR5OiAuNDsgfVxuLmx3ci1oaWRkZW4geyBtYXJnaW4tdG9wOiAxMnB4OyB9XG4ubHdyLWhpZGRlbi1saXN0IHsgZGlzcGxheTogZmxleDsgZmxleC13cmFwOiB3cmFwOyBnYXA6IDZweDsgfVxuLmx3ci1oaWRkZW4tbGlzdCAubHdyLWZpZWxkIHsgbWFyZ2luOiAwOyB9XG4ubHdyLWVtcHR5LWxpbmUgeyBmb250LXNpemU6IDExcHg7IG1hcmdpbjogNnB4IDA7IH1cbi5sd3ItZWRpdG9yLW9wdGlvbnMgeyBkaXNwbGF5OiBmbGV4OyBmbGV4LXdyYXA6IHdyYXA7IGdhcDogOHB4IDIwcHg7IGFsaWduLWl0ZW1zOiBjZW50ZXI7IG1hcmdpbjogMTJweCAwOyBmb250LXNpemU6IDExcHg7IH1cbi5sd3ItZWRpdG9yLW9wdGlvbnMgbGFiZWwgeyBkaXNwbGF5OiBmbGV4OyBnYXA6IDZweDsgYWxpZ24taXRlbXM6IGNlbnRlcjsgfVxuLmx3ci1lZGl0b3Itb3B0aW9ucyA+IHNwYW4geyBjb2xvcjogdmFyKC0tdGV4dENvbG9yU2Vjb25kYXJ5LCAjNzU4Mzk5KTsgfVxuLmx3ci1lZGl0b3ItZm9vdGVyIHsgZGlzcGxheTogZmxleDsganVzdGlmeS1jb250ZW50OiBmbGV4LWVuZDsgZ2FwOiA4cHg7IGJvcmRlci10b3A6IDFweCBzb2xpZCB2YXIoLS1ib3JkZXJDb2xvciwgI2RjZTNlYyk7IHBhZGRpbmctdG9wOiAxMnB4OyB9XG4ubHdyLWVkaXRvciBidXR0b24ubHdyLWFwcGx5IHsgYmFja2dyb3VuZDogdmFyKC0tcHJpbWFyeSwgIzI4NzRkMCk7IGNvbG9yOiB3aGl0ZTsgYm9yZGVyLWNvbG9yOiB0cmFuc3BhcmVudDsgfVxuQG1lZGlhIChtYXgtd2lkdGg6IDY1MHB4KSB7IC5sd3ItbGFuZXMgeyBncmlkLXRlbXBsYXRlLWNvbHVtbnM6IDFmcjsgfSAubHdyLWZpZWxkIHsgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiAxZnI7IH0gLmx3ci1maWVsZC1hY3Rpb25zIHsganVzdGlmeS1jb250ZW50OiBmbGV4LWVuZDsgfSB9XG5gO1xuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsMEJBQTJCO0FBQzNCLGtDQUE2Qjs7O0FDT3RCLElBQU0sZ0JBQWdDLEVBQUUsU0FBUyxHQUFHLFNBQVMsTUFBTSxRQUFRLENBQUMsRUFBRTtBQUM5RSxJQUFNLFlBQVksQ0FBQyxPQUFlLEdBQUcsUUFBUSxlQUFlLEVBQUUsRUFBRSxZQUFZO0FBQzVFLElBQU0sZ0JBQWdCLENBQUMsT0FBZSxVQUFVLEVBQUUsTUFBTTtBQUN4RCxJQUFNLFlBQVksQ0FBQyxPQUFlLENBQUMsYUFBYSxVQUFVLFlBQVksT0FBTyxRQUFRLFdBQVcsYUFBYSxFQUFFLFNBQVMsVUFBVSxFQUFFLENBQUM7QUFDNUksSUFBTSxTQUFTLENBQUMsT0FBZSxVQUFVLEVBQUUsTUFBTTtBQUNqRCxJQUFNLFVBQVUsQ0FBQyxPQUFlLENBQUMsZ0JBQWdCLFNBQVMsVUFBVSxpQkFBaUIsRUFBRSxTQUFTLFVBQVUsRUFBRSxDQUFDO0FBQzdHLElBQU0sV0FBVyxDQUFDLE9BQWUsQ0FBQyxVQUFVLE9BQU8sRUFBRSxTQUFTLFVBQVUsRUFBRSxDQUFDO0FBRXBFLFNBQVMsV0FBVyxJQUFvQjtBQUM3QyxRQUFNLFNBQWlDO0FBQUEsSUFDckMsTUFBTTtBQUFBLElBQVEsV0FBVztBQUFBLElBQWEsS0FBSztBQUFBLElBQU8sUUFBUTtBQUFBLElBQVUsWUFBWTtBQUFBLElBQ2hGLFVBQVU7QUFBQSxJQUFZLE1BQU07QUFBQSxJQUFRLEtBQUs7QUFBQSxJQUFPLEtBQUs7QUFBQSxJQUFPLFFBQVE7QUFBQSxJQUFVLE9BQU87QUFBQSxJQUNyRixRQUFRO0FBQUEsSUFBaUIsT0FBTztBQUFBLElBQWlCLGNBQWM7QUFBQSxJQUFpQixTQUFTO0FBQUEsSUFBWSxVQUFVO0FBQUEsSUFDL0csWUFBWTtBQUFBLEVBQ2Q7QUFDQSxTQUFPLE9BQU8sVUFBVSxFQUFFLENBQUMsS0FBSyxHQUFHLFFBQVEsbUJBQW1CLE9BQU8sRUFBRSxRQUFRLFNBQVMsR0FBRztBQUM3RjtBQUVPLFNBQVMsY0FBYyxLQUFlLFNBQWlCLFlBQXlCO0FBQ3JGLFFBQU0sU0FBd0IsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLFVBQVUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLE9BQU87QUFDM0UsVUFBTSxNQUFNLFVBQVUsRUFBRTtBQUN4QixRQUFJLE9BQWtCO0FBQ3RCLFFBQUksUUFBUSxrQkFBa0IsS0FBSyxFQUFFLElBQUksS0FBSztBQUM5QyxRQUFJLE9BQU8sRUFBRSxHQUFHO0FBQUUsYUFBTztBQUFXLGNBQVE7QUFBQSxJQUFJO0FBQ2hELFFBQUksU0FBUyxFQUFFLEdBQUc7QUFBRSxhQUFPO0FBQVcsY0FBUTtBQUFBLElBQUc7QUFDakQsUUFBSSxRQUFRLE9BQU87QUFBRSxhQUFPO0FBQVcsY0FBUTtBQUFBLElBQUc7QUFDbEQsUUFBSSxjQUFjLEVBQUUsR0FBRztBQUFFLGFBQU87QUFBVyxjQUFRO0FBQUEsSUFBRztBQUN0RCxRQUFJLFdBQVcsU0FBUyxDQUFDLE9BQU8sWUFBWSxFQUFFLFNBQVMsR0FBRyxFQUFHLFFBQU87QUFDcEUsUUFBSSxXQUFXLE9BQU87QUFDcEIsVUFBSSxRQUFRLE1BQU8sUUFBTztBQUMxQixVQUFJLFFBQVEsRUFBRSxHQUFHO0FBQUUsZUFBTztBQUFXLGdCQUFRO0FBQUEsTUFBSTtBQUFBLElBQ25EO0FBQ0EsUUFBSSxXQUFXLG1CQUFtQjtBQUNoQyxVQUFJLFFBQVEsY0FBYyxVQUFVLEtBQUssR0FBRyxHQUFHO0FBQUUsZUFBTztBQUFXLGdCQUFRO0FBQUEsTUFBRztBQUM5RSxVQUFJLFFBQVEsYUFBYyxRQUFPO0FBQUEsSUFDbkM7QUFDQSxXQUFPLEVBQUUsSUFBSSxNQUFNLE1BQU07QUFBQSxFQUMzQixDQUFDO0FBRUQsU0FBTyxLQUFLLENBQUMsR0FBRyxNQUFNLE9BQU8sT0FBTyxFQUFFLEVBQUUsQ0FBQyxJQUFJLE9BQU8sT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQ2pFLFNBQU8sRUFBRSxRQUFRLFFBQVEsTUFBTSxlQUFlLE1BQU07QUFDdEQ7QUFHTyxTQUFTLGNBQWMsS0FBZSxPQUE4QjtBQUN6RSxRQUFNLFdBQVcsY0FBYyxHQUFHO0FBQ2xDLE1BQUksQ0FBQyxTQUFTLE9BQU8sVUFBVSxTQUFVLFFBQU87QUFDaEQsUUFBTSxNQUFNO0FBQ1osTUFBSSxDQUFDLE1BQU0sUUFBUSxJQUFJLE1BQU0sRUFBRyxRQUFPO0FBQ3ZDLFFBQU0sVUFBVSxJQUFJLElBQUksU0FBUyxPQUFPLElBQUksQ0FBQyxVQUFVLE1BQU0sRUFBRSxDQUFDO0FBQ2hFLFFBQU0sT0FBTyxvQkFBSSxJQUFZO0FBQzdCLFFBQU0sU0FBd0IsQ0FBQztBQUMvQixhQUFXLFNBQVMsSUFBSSxRQUFRO0FBQzlCLFFBQUksQ0FBQyxTQUFTLE9BQU8sTUFBTSxPQUFPLFlBQVksQ0FBQyxRQUFRLElBQUksTUFBTSxFQUFFLEtBQUssS0FBSyxJQUFJLE1BQU0sRUFBRSxFQUFHO0FBQzVGLFFBQUksQ0FBQyxDQUFDLFdBQVcsYUFBYSxRQUFRLEVBQUUsU0FBUyxNQUFNLElBQUksRUFBRztBQUM5RCxTQUFLLElBQUksTUFBTSxFQUFFO0FBQ2pCLFdBQU8sS0FBSztBQUFBLE1BQ1YsSUFBSSxNQUFNO0FBQUEsTUFDVixNQUFPLE9BQU8sTUFBTSxFQUFFLEtBQUssTUFBTSxTQUFTLFlBQWMsY0FBYyxNQUFNLEVBQUUsS0FBSyxNQUFNLFNBQVMsV0FBWSxZQUFZLE1BQU07QUFBQSxNQUNoSSxPQUFPLE9BQU8sU0FBUyxNQUFNLEtBQUssSUFBSSxLQUFLLElBQUksR0FBRyxLQUFLLElBQUksSUFBSSxLQUFLLE1BQU0sTUFBTSxLQUFLLENBQUMsQ0FBQyxJQUFJO0FBQUEsSUFDN0YsQ0FBQztBQUFBLEVBQ0g7QUFDQSxTQUFPLEtBQUssR0FBRyxTQUFTLE9BQU8sT0FBTyxDQUFDLFVBQVUsQ0FBQyxLQUFLLElBQUksTUFBTSxFQUFFLENBQUMsQ0FBQztBQUNyRSxTQUFPLEVBQUUsUUFBUSxRQUFRLElBQUksV0FBVyxPQUFPLGVBQWUsSUFBSSxrQkFBa0IsS0FBSztBQUMzRjtBQUVPLFNBQVMsaUJBQWlCLE9BQWdDO0FBQy9ELE1BQUksQ0FBQyxTQUFTLE9BQU8sVUFBVSxTQUFVLFFBQU8sRUFBRSxHQUFHLGVBQWUsUUFBUSxDQUFDLEVBQUU7QUFDL0UsUUFBTSxNQUFNO0FBQ1osUUFBTSxTQUFzQyxDQUFDO0FBQzdDLE1BQUksSUFBSSxVQUFVLE9BQU8sSUFBSSxXQUFXLFlBQVksQ0FBQyxNQUFNLFFBQVEsSUFBSSxNQUFNLEdBQUc7QUFDOUUsZUFBVyxDQUFDLElBQUksTUFBTSxLQUFLLE9BQU8sUUFBUSxJQUFJLE1BQU0sR0FBRztBQUNyRCxVQUFJLENBQUMsVUFBVSxDQUFDLE1BQU0sUUFBUSxPQUFPLE1BQU0sRUFBRztBQUM5QyxZQUFNLE1BQU0sT0FBTyxPQUFPLE9BQU8sQ0FBQyxVQUFVLFNBQVMsT0FBTyxNQUFNLE9BQU8sUUFBUSxFQUFFLElBQUksQ0FBQyxVQUFVLE1BQU0sRUFBRTtBQUMxRyxhQUFPLEVBQUUsSUFBSSxjQUFjLEtBQUssTUFBTTtBQUFBLElBQ3hDO0FBQUEsRUFDRjtBQUNBLFNBQU8sRUFBRSxTQUFTLEdBQUcsU0FBUyxJQUFJLFlBQVksT0FBTyxPQUFPO0FBQzlEO0FBRU8sU0FBUyxVQUFVLFFBQXFCLElBQVksTUFBaUIsUUFBOEI7QUFDeEcsUUFBTSxRQUFRLE9BQU8sT0FBTyxLQUFLLENBQUMsY0FBYyxVQUFVLE9BQU8sRUFBRTtBQUNuRSxNQUFJLENBQUMsU0FBVSxPQUFPLEVBQUUsS0FBSyxTQUFTLFNBQVcsUUFBTztBQUN4RCxNQUFJLE9BQU8sVUFBVSxNQUFNLFNBQVMsS0FBTSxRQUFPO0FBQ2pELFFBQU0sU0FBUyxPQUFPLE9BQU8sT0FBTyxDQUFDLGNBQWMsVUFBVSxPQUFPLEVBQUU7QUFDdEUsTUFBSSxXQUFXLFNBQVMsT0FBTyxVQUFVLENBQUMsY0FBYyxVQUFVLE9BQU8sVUFBVSxVQUFVLFNBQVMsSUFBSSxJQUFJO0FBQzlHLE1BQUksV0FBVyxHQUFHO0FBQ2hCLFVBQU0sT0FBTyxPQUFPLGNBQWMsQ0FBQyxjQUFjLFVBQVUsU0FBUyxJQUFJO0FBQ3hFLGVBQVcsT0FBTyxJQUFJLE9BQU8sU0FBUyxPQUFPO0FBQUEsRUFDL0M7QUFDQSxTQUFPLE9BQU8sVUFBVSxHQUFHLEVBQUUsR0FBRyxPQUFPLE1BQU0sY0FBYyxFQUFFLEtBQUssU0FBUyxXQUFXLFlBQVksS0FBSyxDQUFDO0FBQ3hHLFNBQU8sRUFBRSxHQUFHLFFBQVEsT0FBTztBQUM3QjtBQUVPLFNBQVMsWUFBWSxJQUFvQjtBQUM5QyxRQUFNLE1BQU0sVUFBVSxFQUFFO0FBQ3hCLE1BQUksQ0FBQyxPQUFPLFVBQVUsY0FBYyxVQUFVLEVBQUUsU0FBUyxHQUFHLEVBQUcsUUFBTztBQUN0RSxNQUFJLFFBQVEsRUFBRSxLQUFLLENBQUMsUUFBUSxXQUFXLEVBQUUsU0FBUyxHQUFHLEVBQUcsUUFBTztBQUMvRCxNQUFJLFFBQVEsTUFBTyxRQUFPO0FBQzFCLFNBQU87QUFDVDs7O0FDeEdPLFNBQVMsaUJBQWlCLFFBQXdCLFdBQWtDO0FBQ3pGLGNBQVksS0FBSyxJQUFJLEdBQUcsT0FBTyxTQUFTLFNBQVMsSUFBSSxZQUFZLENBQUM7QUFDbEUsUUFBTSxZQUFZLE9BQU8sSUFBSSxDQUFDLFVBQVUsS0FBSyxJQUFJLEdBQUcsTUFBTSxTQUFTLENBQUM7QUFDcEUsUUFBTSxVQUFVLE9BQU8sSUFBSSxDQUFDLE9BQU8sVUFBVSxLQUFLLElBQUksR0FBRyxLQUFLLElBQUksVUFBVSxLQUFLLEdBQUcsTUFBTSxPQUFPLENBQUMsQ0FBQztBQUNuRyxRQUFNLFFBQVEsVUFBVSxPQUFPLENBQUMsS0FBSyxVQUFVLE1BQU0sT0FBTyxDQUFDO0FBQzdELFFBQU0sUUFBUSxRQUFRLE9BQU8sQ0FBQyxLQUFLLFVBQVUsTUFBTSxPQUFPLENBQUM7QUFDM0QsTUFBSSxTQUFTO0FBQ2IsTUFBSSxRQUFRLFdBQVc7QUFDckIsYUFBUyxTQUFTLFlBQ2QsUUFBUSxJQUFJLENBQUMsVUFBVSxRQUFRLFFBQVEsWUFBWSxRQUFRLENBQUMsSUFDNUQsVUFBVSxJQUFJLENBQUMsT0FBTyxVQUFVLFNBQVMsUUFBUSxRQUFRLEtBQUssTUFBTSxRQUFRLGNBQWMsUUFBUSxNQUFNO0FBQUEsRUFDOUc7QUFDQSxNQUFJLFNBQVM7QUFDYixTQUFPLE9BQU8sSUFBSSxDQUFDLE9BQU8sVUFBVTtBQUNsQyxVQUFNLFNBQVMsRUFBRSxJQUFJLE1BQU0sSUFBSSxRQUFRLE9BQU8sT0FBTyxLQUFLLEVBQUU7QUFDNUQsY0FBVSxPQUFPLEtBQUs7QUFDdEIsV0FBTztBQUFBLEVBQ1QsQ0FBQztBQUNIO0FBRUEsSUFBTSxXQUFXLG9CQUFJLFFBQTRGO0FBRTFHLFNBQVMsWUFBWUEsV0FBb0IsTUFBYyxNQUFzQjtBQTFCcEY7QUEyQkUsTUFBSSxRQUFRLFNBQVMsSUFBSUEsU0FBUTtBQUNqQyxNQUFJLENBQUMsT0FBTztBQUVWLFVBQU0sWUFBWSxTQUFPLEtBQUFBLFVBQVMsZ0JBQVQsbUJBQXNCLDhCQUE2QjtBQUM1RSxZQUFRLEVBQUUsU0FBUyxZQUFZQSxVQUFTLGNBQWMsUUFBUSxFQUFFLFdBQVcsSUFBSSxJQUFJLE1BQU0sT0FBTyxvQkFBSSxJQUFJLEVBQUU7QUFDMUcsYUFBUyxJQUFJQSxXQUFVLEtBQUs7QUFBQSxFQUM5QjtBQUNBLFFBQU0sTUFBTSxHQUFHLElBQUk7QUFBQSxFQUFLLElBQUk7QUFDNUIsUUFBTSxTQUFTLE1BQU0sTUFBTSxJQUFJLEdBQUc7QUFDbEMsTUFBSSxXQUFXLE9BQVcsUUFBTztBQUNqQyxNQUFJO0FBQ0osTUFBSSxNQUFNLFNBQVM7QUFDakIsVUFBTSxRQUFRLE9BQU87QUFDckIsWUFBUSxNQUFNLFFBQVEsWUFBWSxJQUFJLEVBQUU7QUFBQSxFQUMxQyxNQUFPLFNBQVEsS0FBSyxVQUFVLE9BQU8sYUFBVyxVQUFLLE1BQU0sVUFBVSxNQUFyQixtQkFBeUIsT0FBTSxJQUFJLElBQUk7QUFDdkYsTUFBSSxNQUFNLE1BQU0sT0FBTyxLQUFNLE9BQU0sTUFBTSxNQUFNO0FBQy9DLFFBQU0sTUFBTSxJQUFJLEtBQUssS0FBSztBQUMxQixTQUFPO0FBQ1Q7OztBQ3hDTyxTQUFTLFdBQVcsS0FBZSxTQUFzQixjQUFjLEtBQUssS0FBSyxHQUEyQjtBQUNqSCxRQUFNLFNBQVMsb0JBQUksSUFBdUI7QUFDMUMsUUFBTSxPQUFPLElBQUksVUFBb0IsSUFBSSxLQUFLLENBQUMsT0FBTyxNQUFNLFNBQVMsVUFBVSxFQUFFLENBQUMsQ0FBQztBQUNuRixRQUFNLFlBQVksS0FBSyxhQUFhLFVBQVUsWUFBWSxLQUFLO0FBQy9ELFFBQU0sT0FBTyxLQUFLLFFBQVEsV0FBVyxhQUFhO0FBQ2xELE1BQUksVUFBVyxRQUFPLElBQUksV0FBVyxFQUFFLFFBQVEsU0FBUyxNQUFNLFFBQVEsQ0FBQztBQUN2RSxNQUFJLEtBQU0sUUFBTyxJQUFJLE1BQU0sRUFBRSxRQUFRLGFBQWEsTUFBTSxRQUFRLENBQUM7QUFFakUsUUFBTSxTQUFTLGNBQWMsS0FBSyxNQUFNLEVBQUU7QUFDMUMsV0FBUyxXQUFXLE9BQXdDLE1BQWMsWUFBWSxPQUFPO0FBQzNGLFVBQU0sUUFBUSxNQUFNLE9BQU8sQ0FBQyxLQUFLLFNBQVMsTUFBTSxLQUFLLE9BQU8sQ0FBQztBQUM3RCxRQUFJLE9BQU87QUFDWCxRQUFJLFFBQVE7QUFDWixVQUFNLFFBQVEsQ0FBQyxNQUFNLFVBQVU7QUFDN0IsY0FBUSxLQUFLO0FBRWIsWUFBTSxNQUFNLFVBQVUsTUFBTSxTQUFTLElBQUksTUFBTSxLQUFLO0FBQUEsUUFBSSxRQUFRO0FBQUEsUUFDOUQsS0FBSyxJQUFJLE9BQU8sTUFBTSxTQUFTLFFBQVEsSUFBSSxJQUFJLEtBQUssTUFBTSxNQUFNLE9BQU8sS0FBSyxDQUFDO0FBQUEsTUFBQztBQUNoRixhQUFPLElBQUksS0FBSyxJQUFJLEVBQUUsUUFBUSxHQUFHLEtBQUssTUFBTSxHQUFHLElBQUksTUFBTSxHQUFJLFlBQVksRUFBRSxXQUFXLEtBQUssSUFBSSxDQUFDLEVBQUcsQ0FBQztBQUNwRyxjQUFRO0FBQUEsSUFDVixDQUFDO0FBQUEsRUFDSDtBQUNBLGFBQVcsT0FBTyxPQUFPLENBQUMsVUFBVSxNQUFNLFNBQVMsYUFBYSxDQUFDLGNBQWMsTUFBTSxFQUFFLENBQUMsR0FBRyxPQUFPO0FBQ2xHLGFBQVcsT0FBTyxPQUFPLENBQUMsVUFBVSxNQUFNLFNBQVMsZUFBZSxDQUFDLGNBQWMsTUFBTSxFQUFFLENBQUMsR0FBRyxTQUFTLElBQUk7QUFDMUcsYUFBVyxTQUFTLE9BQU8sT0FBTyxDQUFDQyxXQUFVQSxPQUFNLFNBQVMsUUFBUSxHQUFHO0FBQ3JFLFdBQU8sSUFBSSxNQUFNLElBQUksRUFBRSxRQUFRLFdBQVcsTUFBTSxTQUFTLFFBQVEsS0FBSyxDQUFDO0FBQUEsRUFDekU7QUFDQSxRQUFNLE9BQU8sT0FBTyxLQUFLLENBQUMsVUFBVSxVQUFVLE1BQU0sRUFBRSxNQUFNLE1BQU07QUFDbEUsUUFBTSxVQUFVLE9BQU8sS0FBSyxDQUFDLFVBQVUsY0FBYyxNQUFNLEVBQUUsS0FBSyxNQUFNLFNBQVMsUUFBUTtBQUN6RixRQUFNLGVBQWUsUUFBUSxPQUFPLElBQUksS0FBSyxFQUFFO0FBQy9DLE1BQUksV0FBVyxhQUFjLFFBQU8sSUFBSSxRQUFRLElBQUksRUFBRSxHQUFHLGNBQWMsU0FBUyxLQUFLLENBQUM7QUFDdEYsU0FBTztBQUNUO0FBRUEsSUFBTSxlQUFlO0FBQ3JCLElBQU0sZ0JBQWdCO0FBRWYsU0FBUyxVQUFVLEtBQWtCLFNBQVMsT0FBTyxRQUFzQixRQUE4QixVQUF1RCxDQUFDLEdBQVM7QUExQ2pMO0FBMkNFLFFBQU0sUUFBUSxNQUFNLEtBQUssSUFBSSxRQUFRLEVBQUUsT0FBTyxDQUFDLFVBQzdDLGlCQUFpQixJQUFJLGNBQWMsWUFBYSxXQUFXO0FBQzdELFFBQU0sUUFBUSxDQUFDLFNBQ2IsS0FBSyxhQUFhLFNBQVMsd0JBQXdCLGdCQUFnQixNQUNsRSxVQUFVLEtBQUssY0FBYyxpQ0FBaUMsSUFBSSxTQUFTO0FBQzlFLFFBQU0sTUFBTSxNQUFNLElBQUksS0FBSztBQUUzQixNQUFJLElBQUksS0FBSyxDQUFDLE9BQU8sQ0FBQyxFQUFFLEtBQUssQ0FBQyxJQUFJLEtBQUssQ0FBQyxPQUFPLFVBQVUsRUFBRSxNQUFNLE1BQU0sR0FBRztBQUN4RSxnQkFBWSxHQUFHO0FBQ2Y7QUFBQSxFQUNGO0FBQ0EsUUFBTSxZQUFZLFdBQVcsS0FBSyxNQUFNO0FBQ3hDLFFBQU0sV0FBVyxjQUFjLEtBQUssVUFBVSxjQUFjLEtBQUssS0FBSyxDQUFDO0FBQ3ZFLFFBQU0sYUFBYSxRQUFRLGlDQUFRLE1BQU0sS0FBSyxTQUFTO0FBQ3ZELFFBQU0sVUFBVSxTQUFTLE9BQU8sT0FBTyxDQUFDLFVBQVUsTUFBTSxTQUFTLGVBQWUsQ0FBQyxjQUFjLE1BQU0sRUFBRSxDQUFDO0FBQ3hHLFFBQU0sY0FBYyxJQUFJLElBQUksUUFBUSxPQUFPLENBQUMsT0FBTyxVQUFVLFFBQVEsS0FBSyxZQUFZLE1BQU0sRUFBRSxNQUFNLFlBQVksUUFBUSxRQUFRLENBQUMsRUFBRSxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsVUFBVSxNQUFNLEVBQUUsQ0FBQztBQUNoSyxRQUFNLGNBQWMsTUFBTSxLQUFLLENBQUMsU0FBUyxjQUFjLE1BQU0sSUFBSSxDQUFDLENBQUM7QUFDbkUsUUFBTSxpQkFBaUIsZUFBZSxHQUFDLGVBQVUsSUFBSSxNQUFNLFdBQVcsQ0FBQyxNQUFoQyxtQkFBbUMsV0FBVSxRQUFRLFlBQVksY0FBYyxvQkFBb0IsT0FBSyxpQkFBWSxnQkFBWixtQkFBeUIsT0FBTTtBQUM5SyxNQUFJLGFBQWEsY0FBYyxTQUFTLFdBQVcsTUFBTTtBQUN6RCxNQUFJLGFBQWEsbUJBQW1CLGFBQWEsU0FBUyxPQUFPO0FBQ2pFLE1BQUksYUFBYSxvQkFBb0IsUUFBUSxTQUFTLEtBQUssSUFBSSxRQUFRLE1BQU07QUFDN0UsYUFBVyxRQUFRLE9BQU87QUFDeEIsVUFBTSxZQUFZLFVBQVUsSUFBSSxNQUFNLElBQUksQ0FBQztBQUMzQyxRQUFJLENBQUMsVUFBVztBQUNoQixTQUFLLGFBQWEsZUFBZSxFQUFFO0FBQ25DLFNBQUssTUFBTSxZQUFZLGdCQUFnQixVQUFVLE1BQU07QUFDdkQsU0FBSyxNQUFNLFlBQVksY0FBYyxVQUFVLElBQUk7QUFDbkQsU0FBSyxnQkFBZ0IsbUJBQW1CLFVBQVUsV0FBVyxJQUFJO0FBQ2pFLFNBQUssZ0JBQWdCLHNCQUFzQixVQUFVLGNBQWMsSUFBSTtBQUN2RSxTQUFLLGdCQUFnQixpQkFBaUIsVUFBVSxNQUFNLElBQUksQ0FBQyxNQUFNLE1BQU07QUFDdkUsU0FBSyxnQkFBZ0IsbUJBQW1CLENBQUMsVUFBVSxPQUFPLEVBQUUsU0FBUyxVQUFVLE1BQU0sSUFBSSxDQUFDLENBQUMsQ0FBQztBQUM1RixRQUFJLEtBQUssYUFBYSxpQkFBaUIsR0FBRztBQUN4QyxZQUFNLFFBQVEsS0FBSyxjQUFjLFNBQVMsS0FBSyxLQUFLO0FBQ3BELFVBQUksTUFBTyxNQUFLLE1BQU0sWUFBWSxzQkFBc0IsSUFBSSxjQUFjLFlBQWEsaUJBQWlCLEtBQUssRUFBRSxLQUFLO0FBQUEsSUFDdEg7QUFDQSxTQUFLLGdCQUFnQix3QkFBd0IsWUFBWSxJQUFJLE1BQU0sSUFBSSxDQUFDLENBQUM7QUFDekUsU0FBSyxnQkFBZ0Isb0JBQW9CLFVBQVUsWUFBWSxJQUFJO0FBQ25FLFNBQUssZ0JBQWdCLHVCQUF1QixVQUFVLFlBQVksUUFBUSxDQUFDLGNBQWM7QUFDekYsU0FBSyxnQkFBZ0Isd0JBQXdCLFVBQVUsTUFBTSxJQUFJLENBQUMsTUFBTSxVQUFVLFFBQVEsY0FBYyxDQUFDO0FBQ3pHLFNBQUssZ0JBQWdCLGlCQUFpQixDQUFDLFVBQVUsVUFBVSxjQUFjLFFBQVEsU0FBUyxhQUFhO0FBQ3ZHLFNBQUssYUFBYSxrQkFBa0IsY0FBYyxNQUFNLElBQUksQ0FBQyxJQUFJLE1BQUssaUNBQVEsSUFBSSxNQUFNLElBQUksT0FBTSxXQUFXLE1BQU0sSUFBSSxDQUFDLENBQUM7QUFDekgsU0FBSyxNQUFNLGVBQWUsY0FBYztBQUN4QyxTQUFLLE1BQU0sZUFBZSxxQkFBcUI7QUFBQSxFQUNqRDtBQUNBLE1BQUksQ0FBQyxVQUFVLFNBQVMsZUFBZTtBQUNyQyxVQUFNLFlBQVksS0FBSyxJQUFJLElBQUksUUFBUSxrQkFBa0IsSUFBSSxlQUFlLEVBQUU7QUFDOUUsVUFBTSxVQUFVLFFBQVEsSUFBSSxDQUFDLFVBQVU7QUF6RjNDLFVBQUFDO0FBMEZNLFlBQU0sT0FBTyxNQUFNLEtBQUssQ0FBQyxjQUFjLE1BQU0sU0FBUyxNQUFNLE1BQU0sRUFBRTtBQUNwRSxZQUFNLFVBQVFBLE1BQUEsS0FBSyxnQkFBTCxnQkFBQUEsSUFBa0IsV0FBVTtBQUMxQyxZQUFNLFFBQVEsSUFBSSxjQUFjLFlBQWEsaUJBQWlCLElBQUk7QUFDbEUsWUFBTSxXQUFXLE9BQU8sV0FBVyxNQUFNLFFBQVEsS0FBSztBQUN0RCxZQUFNLE9BQU8sR0FBRyxNQUFNLGNBQWMsS0FBSyxJQUFJLFFBQVEsTUFBTSxNQUFNLGNBQWMsV0FBVztBQUMxRixZQUFNLFFBQVEsS0FBSyxhQUFhLGdCQUFnQixLQUFLO0FBQ3JELFlBQU0sYUFBYSxhQUFhLFlBQVksSUFBSSxlQUFlLE9BQU8sT0FBTyxXQUFXLElBQUksTUFBTSxNQUFNLGNBQWMsV0FBVyxFQUFFLElBQUksSUFBSTtBQUMzSSxZQUFNLFdBQVcsUUFBUSxJQUFJLEtBQUssSUFBSSxJQUFJLEtBQUssaUJBQWlCLG9CQUFvQixFQUFFLFNBQVMsRUFBRTtBQUNqRyxZQUFNLFVBQVUsTUFBTSxZQUFZLElBQUksTUFBTSxFQUFFLElBQUksS0FBSyxNQUFNLEtBQUssYUFBYSxzQkFBc0IsSUFBSSxLQUFLO0FBQzlHLFlBQU0sWUFBWSxLQUFLLEtBQUssWUFBWSxJQUFJLGVBQWUsT0FBTyxJQUFJLElBQUksV0FBVyxhQUFhLFVBQVUsQ0FBQztBQUM3RyxhQUFPLEVBQUUsSUFBSSxNQUFNLElBQUksV0FBVyxTQUFTLEtBQUssSUFBSSxXQUFXLGFBQWEsVUFBVSxFQUFFLEVBQUU7QUFBQSxJQUM1RixDQUFDO0FBQ0QsZUFBVyxVQUFVLGlCQUFpQixTQUFTLFNBQVMsR0FBRztBQUN6RCxZQUFNLE9BQU8sTUFBTSxLQUFLLENBQUMsY0FBYyxNQUFNLFNBQVMsTUFBTSxPQUFPLEVBQUU7QUFDckUsV0FBSyxNQUFNLFlBQVksZ0JBQWdCLEdBQUcsT0FBTyxPQUFPLFFBQVEsQ0FBQyxDQUFDLElBQUk7QUFDdEUsV0FBSyxNQUFNLFlBQVksdUJBQXVCLEdBQUcsT0FBTyxNQUFNLFFBQVEsQ0FBQyxDQUFDLElBQUk7QUFDNUUsVUFBSSxLQUFLLGFBQWEsZUFBZSxLQUFLLGVBQWUsZ0JBQWdCO0FBQ3ZFLG9CQUFZLGFBQWEsaUJBQWlCLEVBQUU7QUFDNUMsb0JBQVksTUFBTSxZQUFZLGdCQUFnQixHQUFHLE9BQU8sT0FBTyxRQUFRLENBQUMsQ0FBQyxJQUFJO0FBQzdFLG9CQUFZLE1BQU0sWUFBWSx1QkFBdUIsTUFBTTtBQUFBLE1BQzdEO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRjtBQUVPLFNBQVMsWUFBWSxNQUF5QjtBQUNuRCxhQUFXLE9BQU8sQ0FBQyxHQUFJLEtBQUssUUFBUSxJQUFJLFlBQVksR0FBRyxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsR0FBSSxHQUFHLEtBQUssaUJBQWlCLElBQUksWUFBWSxHQUFHLENBQUMsR0FBRztBQUN2SCxRQUFJLGdCQUFnQixZQUFZO0FBQ2hDLFFBQUksZ0JBQWdCLGlCQUFpQjtBQUNyQyxRQUFJLGdCQUFnQixpQkFBaUI7QUFBQSxFQUN2QztBQUNBLGFBQVcsUUFBUSxLQUFLLGlCQUE4QixJQUFJLGFBQWEsR0FBRyxHQUFHO0FBQzNFLFNBQUssZ0JBQWdCLGFBQWE7QUFDbEMsZUFBVyxhQUFhLENBQUMsbUJBQW1CLHNCQUFzQixpQkFBaUIsa0JBQWtCLGlCQUFpQix3QkFBd0IsbUJBQW1CLG9CQUFvQix1QkFBdUIsc0JBQXNCLEVBQUcsTUFBSyxnQkFBZ0IsU0FBUztBQUNuUSxTQUFLLE1BQU0sZUFBZSxjQUFjO0FBQ3hDLFNBQUssTUFBTSxlQUFlLFlBQVk7QUFDdEMsU0FBSyxNQUFNLGVBQWUsY0FBYztBQUN4QyxTQUFLLE1BQU0sZUFBZSxxQkFBcUI7QUFDL0MsU0FBSyxNQUFNLGVBQWUsb0JBQW9CO0FBQUEsRUFDaEQ7QUFDRjtBQUVPLElBQU0sWUFBWTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7OztBQ3BJekIsSUFBQUMscUJBQStCO0FBQy9CLGtDQUE0QztBQUM1QyxJQUFBQyxnQkFBNEM7QUFDNUMsd0JBQThCO0FBQzlCLGtCQUFzQzs7O0FDYS9CLFNBQVMsaUJBQ2QsYUFDQSxjQUE4QyxDQUFDLGFBQWEsU0FBUyxHQUN6RDtBQUNaLFFBQU0scUJBQXFCLFlBQVk7QUFDdkMsTUFBSSxjQUFjLFlBQVk7QUFDOUIsTUFBSSxlQUFlLFlBQVk7QUFDL0IsTUFBSSxTQUFTO0FBQ2IsUUFBTSxpQkFBaUIsQ0FBQyxVQUFrQixhQUFhLEtBQUssSUFBSTtBQUVoRSxRQUFNLGFBQWEsQ0FBQyxZQUFnQztBQUNsRCxRQUFJLFFBQVEsaUJBQWlCLGVBQWdCLGdCQUFlLFFBQVE7QUFDcEUsa0JBQWMsRUFBRSxHQUFHLFNBQVMsY0FBYyxhQUFhO0FBQ3ZELHVCQUFtQixLQUFLLGFBQWEsRUFBRSxHQUFHLFNBQVMsY0FBYyxlQUFlLENBQUM7QUFBQSxFQUNuRjtBQUVBLFFBQU0saUJBQWlCLFlBQVksZ0JBQWdCO0FBQ25ELGNBQVksYUFBYTtBQUN6QixNQUFJO0FBQ0YsZUFBVyxXQUFXO0FBQ3RCLGdCQUFZLFFBQVE7QUFFcEIsZ0JBQVksTUFBTTtBQUFFLFVBQUksT0FBUSxhQUFZLGVBQWUsaUJBQWlCLENBQUM7QUFBQSxJQUFHLENBQUM7QUFBQSxFQUNuRixTQUFTLE9BQU87QUFDZCxnQkFBWSxhQUFhO0FBQ3pCLHVCQUFtQixLQUFLLGFBQWEsV0FBVztBQUNoRCxnQkFBWSxRQUFRO0FBQ3BCLFVBQU07QUFBQSxFQUNSO0FBRUEsU0FBTyxNQUFNO0FBQ1gsUUFBSSxDQUFDLE9BQVE7QUFDYixhQUFTO0FBQ1QsVUFBTSxVQUFVLFlBQVksZ0JBQWdCLEtBQUs7QUFFakQsUUFBSSxZQUFZLGVBQWUsV0FBWTtBQUMzQyxnQkFBWSxhQUFhO0FBQ3pCLHVCQUFtQixLQUFLLGFBQWEsV0FBVztBQUNoRCxnQkFBWSxRQUFRO0FBQ3BCLGdCQUFZLE1BQU07QUFDaEIsVUFBSSxZQUFZLGVBQWUsbUJBQW9CLGFBQVksZUFBZSxNQUFNO0FBQUEsSUFDdEYsQ0FBQztBQUFBLEVBQ0g7QUFDRjtBQVdBLElBQU0sWUFBWSxvQkFBSSxJQUFJO0FBQUEsRUFDeEI7QUFBQSxFQUFRO0FBQUEsRUFBZTtBQUFBLEVBQWU7QUFBQSxFQUFpQjtBQUFBLEVBQ3ZEO0FBQUEsRUFBMkI7QUFBQSxFQUFRO0FBQ3JDLENBQUM7QUFFRCxTQUFTLGNBQWMsT0FBZ0IsU0FBNEM7QUE1RW5GO0FBNkVFLE1BQUksQ0FBQyxTQUFTLE9BQU8sVUFBVSxTQUFVLFFBQU87QUFDaEQsUUFBTSxJQUFJO0FBQ1YsU0FBTyxPQUFPLEVBQUUsZUFBZSxjQUFjLE9BQU8sRUFBRSxZQUFZLGNBQ2hFLE9BQU8sRUFBRSxvQkFBb0IsY0FBYyxPQUFPLEVBQUUsbUJBQW1CLGNBQ3ZFLFNBQU8sT0FBRSxZQUFGLG1CQUFXLGtCQUFpQixjQUNuQyxFQUFFLFFBQVEsaUJBQWlCLE1BQU07QUFDckM7QUFHTyxTQUFTLHdCQUF3QixTQUl0QztBQTFGRjtBQTJGRSxRQUFNLE1BQU0sT0FBTyxLQUFLLE9BQU8sRUFBRSxLQUFLLENBQUMsU0FBUyxLQUFLLFdBQVcsZUFBZSxDQUFDO0FBQ2hGLE1BQUksQ0FBQyxJQUFLLFFBQU8sRUFBRSxVQUFVLE1BQU07QUFDbkMsUUFBTSxPQUFPO0FBQ2IsTUFBSSxRQUFrQyxLQUFLLEdBQUc7QUFFOUMsTUFBSSxPQUFPO0FBQ1gsV0FBUyxRQUFRLElBQUcsNkJBQU0sV0FBVSxRQUFRLEtBQUssUUFBUyxRQUFPLEtBQUs7QUFDdEUsUUFBSSxrQ0FBTSxjQUFOLG1CQUFpQixZQUFXLEtBQUssVUFBVSxZQUFZLFNBQVEsK0JBQU8sV0FBVyxTQUFRLE1BQU07QUFDbkcsV0FBUyxRQUFRLEdBQUcsU0FBUyxRQUFRLElBQUksU0FBUyxRQUFRLE1BQU0sUUFBUTtBQUN0RSxVQUFNLFdBQVUsV0FBTSxrQkFBTixtQkFBcUI7QUFDckMsUUFBSSxPQUFPLFlBQVksU0FBVTtBQUNqQyxRQUFJLENBQUMsVUFBVSxJQUFJLE9BQU8sRUFBRyxRQUFPLEVBQUUsVUFBVSxNQUFNO0FBQ3RELGVBQVcsU0FBUyxDQUFDLE9BQU8sTUFBTSxTQUFTLEdBQUc7QUFDNUMsVUFBSSxPQUFPLCtCQUFPO0FBQ2xCLGVBQVMsUUFBUSxHQUFHLFFBQVEsUUFBUSxLQUFLLFNBQVMsT0FBTyxLQUFLLE1BQU07QUFDbEUsY0FBTSxRQUFRLEtBQUs7QUFDbkIsY0FBTSxhQUFhLENBQUMsS0FBSztBQUN6QixZQUFJLFNBQVMsT0FBTyxVQUFVLFlBQVksYUFBYSxNQUFPLFlBQVcsS0FBSyxNQUFNLE9BQU87QUFDM0YsbUJBQVcsYUFBYSxZQUFZO0FBQ2xDLGNBQUksY0FBYyxXQUFXLE9BQU8sRUFBRyxRQUFPLEVBQUUsVUFBVSxNQUFNLGFBQWEsV0FBVyxRQUFRO0FBQUEsUUFDbEc7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUNBLFdBQU8sRUFBRSxVQUFVLEtBQUs7QUFBQSxFQUMxQjtBQUNBLFNBQU8sRUFBRSxVQUFVLE1BQU07QUFDM0I7OztBQy9HTyxTQUFTLFlBQVlDLFdBQW9CLFFBQXdDLFVBSXBGLENBQUMsR0FBZTtBQVZwQjtBQVdFLFFBQU0sU0FBU0EsVUFBUztBQUN4QixRQUFNLFdBQVcsb0JBQUksSUFBNEc7QUFDakksTUFBSSxRQUFRO0FBQ1osTUFBSSxVQUFVO0FBQ2QsTUFBSSxhQUFhO0FBQ2pCLE1BQUksY0FBYztBQUNsQixRQUFNLGlCQUFpQixPQUFPLE9BQU8sbUJBQW1CLGFBQWEsSUFBSSxPQUFPLGVBQWUsTUFBTSxTQUFTLENBQUMsSUFBSTtBQUVuSCxXQUFTLE9BQU87QUFuQmxCLFFBQUFDLEtBQUFDO0FBb0JJLFlBQVE7QUFDUixRQUFJLFFBQVM7QUFDYixlQUFXLENBQUMsU0FBUyxLQUFLLEtBQUssVUFBVTtBQUN2QyxVQUFJLENBQUMsUUFBUSxhQUFhO0FBQ3hCLHlEQUFnQixVQUFVO0FBQzFCLGNBQU0sUUFBUTtBQUNkLG9CQUFZLE1BQU0sSUFBSTtBQUN0QixpQkFBUyxPQUFPLE9BQU87QUFBQSxNQUN6QjtBQUFBLElBQ0Y7QUFDQSxRQUFJLGNBQWM7QUFDbEIsVUFBTSxXQUFXLG9CQUFJLElBQTBCO0FBQy9DLGVBQVcsV0FBV0YsVUFBUyxpQkFBOEIsNkJBQTZCLEdBQUc7QUFDM0YsVUFBSSxRQUFRLFNBQVMsSUFBSSxPQUFPO0FBQ2hDLFVBQUk7QUFDRixjQUFNLFFBQVEsd0JBQXdCLE9BQU87QUFDN0MsWUFBSSxVQUFVLENBQUMsTUFBTSxZQUFZLE1BQU0sZ0JBQWdCLE1BQU0sY0FBYztBQUN6RSxnQkFBTSxRQUFRO0FBQ2Qsc0JBQVksTUFBTSxJQUFJO0FBQ3RCLG1CQUFTLE9BQU8sT0FBTztBQUN2QiwyREFBZ0IsVUFBVTtBQUMxQixrQkFBUTtBQUFBLFFBQ1Y7QUFDQSxZQUFJLENBQUMsT0FBTztBQUNWLGNBQUksQ0FBQyxNQUFNLFNBQVU7QUFDckIsY0FBSSxDQUFDLE1BQU0sYUFBYTtBQUFFO0FBQWU7QUFBQSxVQUFVO0FBRW5ELGdCQUFNLE9BQU8sUUFBUTtBQUNyQixjQUFJLEVBQUMsNkJBQU0sY0FBYyw0QkFBMkI7QUFBRTtBQUFlO0FBQUEsVUFBVTtBQUMvRSxrQkFBUTtBQUFBLFlBQ04sU0FBUyxNQUFNO0FBQUEsWUFDZixhQUFhLE1BQU07QUFBQSxZQUNuQixTQUFTLGlCQUFpQixNQUFNLGFBQWEsQ0FBQyxhQUFhO0FBQUUscUJBQU8sc0JBQXNCLFFBQVE7QUFBQSxZQUFHLENBQUM7QUFBQSxZQUN0RztBQUFBLFVBQ0Y7QUFDQSxtQkFBUyxJQUFJLFNBQVMsS0FBSztBQUMzQiwyREFBZ0IsUUFBUTtBQUFBLFFBQzFCO0FBQUEsTUFDRixRQUFRO0FBRU47QUFDQTtBQUFBLE1BQ0Y7QUFDQSxZQUFNLE1BQU0sUUFBUSxjQUEyQixZQUFZO0FBQzNELFlBQU0sY0FBYyxNQUFNLEtBQUssTUFBTSxLQUFLLGlCQUE4Qiw4Q0FBOEMsQ0FBQztBQUN2SCxZQUFNLFNBQVMsWUFBWSxJQUFJLENBQUMsU0FBUztBQWpFL0MsWUFBQUMsS0FBQUMsS0FBQTtBQWtFUSxjQUFNLEtBQUssS0FBSyxhQUFhLHFCQUFxQjtBQUNsRCxjQUFNLFVBQVNBLE9BQUFELE1BQUEsTUFBTSxNQUFLLDJCQUFLLGFBQVksQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLFVBQVUsTUFBTSxhQUFhLGdCQUFnQixNQUFNLEVBQUUsTUFBM0YsZ0JBQUFBLElBQThGLGdCQUE5RixnQkFBQUMsSUFBMkcsT0FBTyxNQUFNLEdBQUc7QUFDMUksZUFBTyxFQUFFLElBQUksU0FBTyxVQUFLLGdCQUFMLG1CQUFrQixXQUFVLFdBQVcsRUFBRSxHQUFHLE9BQU87QUFBQSxNQUN6RSxDQUFDLEVBQUUsT0FBTyxDQUFDLFVBQVUsQ0FBQyxVQUFVLE1BQU0sRUFBRSxDQUFDO0FBQ3pDLGVBQVMsSUFBSSxNQUFNLFNBQVMsRUFBRSxJQUFJLE1BQU0sU0FBUyxPQUFPLENBQUM7QUFDekQsWUFBTSxXQUFTRCxNQUFBLFFBQVEsY0FBUixnQkFBQUEsSUFBQSxjQUFvQixNQUFNLFNBQVMsT0FBTyxJQUFJLENBQUMsVUFBVSxNQUFNLEVBQUUsT0FBTSxjQUFjLE9BQU8sSUFBSSxDQUFDLFVBQVUsTUFBTSxFQUFFLENBQUM7QUFDbkksWUFBTSxTQUFTLElBQUksSUFBSSxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxJQUFJLE1BQU0sS0FBSyxDQUFDLENBQUM7QUFDckUsWUFBTSxjQUFjLE1BQU0sWUFBWSxnQkFBZ0I7QUFDdEQsWUFBTSxLQUFLLFFBQVEsaUJBQThCLFlBQVksQ0FBQyxFQUFFLFFBQVEsQ0FBQ0UsTUFBSyxVQUFPO0FBMUUzRixZQUFBRjtBQTJFUSx5QkFBVUUsTUFBSyxPQUFPLFFBQVEsUUFBUSxFQUFFLFNBQU9GLE1BQUEsWUFBWSxLQUFLLE1BQWpCLGdCQUFBQSxJQUFvQixVQUFTLE9BQU8sZ0JBQWdCLFFBQVEsWUFBWSxDQUFDO0FBQUEsT0FBQztBQUMzSCxpQkFBVyxVQUFVLE1BQU0sS0FBSyxpQkFBOEIsOEJBQThCLEVBQUcsV0FBVSxRQUFRLE1BQU0sUUFBUSxNQUFNO0FBQUEsSUFDdkk7QUFDQSxVQUFNLFNBQVMsRUFBRSxRQUFRLFNBQVMsTUFBTSxZQUFZO0FBQ3BELFVBQU0sWUFBWSxLQUFLLFVBQVUsTUFBTTtBQUN2QyxRQUFJLGNBQWMsWUFBWTtBQUFFLG1CQUFhO0FBQVcsYUFBTyxNQUFNO0FBQUEsSUFBRztBQUN4RSxVQUFNLFNBQVMsQ0FBQyxHQUFHLFNBQVMsT0FBTyxDQUFDO0FBQ3BDLFVBQU0sbUJBQW1CLEtBQUssVUFBVSxPQUFPLElBQUksQ0FBQyxXQUFXLEVBQUUsR0FBRyxPQUFPLFFBQVEsTUFBTSxPQUFPLElBQUksQ0FBQyxFQUFFLElBQUksTUFBTSxPQUFPLEVBQUUsSUFBSSxNQUFNLEVBQUUsRUFBRSxFQUFFLENBQUM7QUFDM0ksUUFBSSxxQkFBcUIsYUFBYTtBQUFFLG9CQUFjO0FBQWtCLE9BQUFDLE1BQUEsUUFBUSxjQUFSLGdCQUFBQSxJQUFBLGNBQW9CO0FBQUEsSUFBUztBQUFBLEVBQ3ZHO0FBRUEsV0FBUyxXQUFXO0FBQ2xCLFFBQUksQ0FBQyxXQUFXLENBQUMsTUFBTyxTQUFRLE9BQU8sc0JBQXNCLElBQUk7QUFBQSxFQUNuRTtBQUNBLFFBQU0sV0FBVyxJQUFJLE9BQU8saUJBQWlCLFFBQVE7QUFDckQsV0FBUyxRQUFRRixVQUFTLE1BQU0sRUFBRSxTQUFTLE1BQU0sV0FBVyxNQUFNLGVBQWUsS0FBSyxDQUFDO0FBQ3ZGLFFBQUFBLFVBQVMsVUFBVCxtQkFBZ0IsTUFBTSxLQUFLLFVBQVUsTUFBTSxNQUFNO0FBQUEsRUFBQztBQUVsRCxRQUFNLFFBQVEsT0FBTyxZQUFZLFVBQVUsR0FBSTtBQUMvQyxRQUFNLGVBQWMsYUFBUSxjQUFSLGlDQUFvQjtBQUN4QyxXQUFTO0FBRVQsU0FBTyxNQUFNO0FBQ1gsY0FBVTtBQUNWLGFBQVMsV0FBVztBQUNwQixxREFBZ0I7QUFDaEI7QUFDQSxXQUFPLGNBQWMsS0FBSztBQUMxQixXQUFPLHFCQUFxQixLQUFLO0FBQ2pDLGVBQVcsRUFBRSxTQUFTLEtBQUssS0FBSyxTQUFTLE9BQU8sR0FBRztBQUNqRCxjQUFRO0FBQ1Isa0JBQVksSUFBSTtBQUFBLElBQ2xCO0FBQ0EsYUFBUyxNQUFNO0FBQUEsRUFDakI7QUFDRjs7O0FDOUdBLHdCQUErQjtBQUMvQixtQ0FBbUQ7QUFLNUMsSUFBTSwwQkFBc0IsaUVBQW1ELEVBQUU7QUFBQSxFQUN0RixJQUFJO0FBQUEsRUFDSixjQUFjLEVBQUUsYUFBYSxNQUFNLFlBQVksY0FBYztBQUMvRCxDQUFDO0FBRU0sSUFBTSw2QkFBeUIsa0NBQWU7QUFBQSxFQUNuRCxJQUFJO0FBQUEsRUFDSixhQUFhLENBQUMsT0FBTztBQUNuQixVQUFNLE9BQU8sR0FBRyxPQUFPLG9CQUFvQixXQUFXO0FBQ3RELFVBQU0sZUFBZSxNQUE0QixLQUFLO0FBQ3RELFdBQU8sTUFBTTtBQUFBLEVBQ2Y7QUFDRixDQUFDOzs7QUNsQkQsSUFBQUkscUJBQStCO0FBQy9CLDZCQUFxSDtBQUNySCw4QkFBMEQ7OztBQ0YxRCxtQkFBeUM7QUFzQnBCO0FBWnJCLElBQU0sWUFBdUMsRUFBRSxTQUFTLGNBQWMsV0FBVyxlQUFlLFFBQVEsU0FBUztBQUNqSCxJQUFNLFdBQW1DO0FBQUEsRUFDdkMsTUFBTTtBQUFBLEVBQWdDLFdBQVc7QUFBQSxFQUFlLFFBQVE7QUFBQSxFQUFXLE9BQU87QUFBQSxFQUMxRixRQUFRO0FBQUEsRUFBYyxjQUFjO0FBQUEsRUFBYyxLQUFLO0FBQUEsRUFBTyxLQUFLO0FBQUEsRUFBUyxRQUFRO0FBQUEsRUFDcEYsVUFBVTtBQUFBLEVBQUssTUFBTTtBQUFBLEVBQWtCLEtBQUs7QUFBQSxFQUFhLFlBQVk7QUFDdkU7QUFFTyxJQUFNLGVBQWUsQ0FBQyxFQUFFLFFBQVEsVUFBVSxTQUFTLFNBQVMsTUFBbUI7QUFqQnRGO0FBa0JFLFFBQU0sQ0FBQyxTQUFTLFVBQVUsUUFBSSx5QkFBUyxZQUFPLENBQUMsTUFBUixtQkFBVyxPQUFNLE1BQU07QUFDOUQsUUFBTSxDQUFDLFFBQVEsU0FBUyxRQUFJLHVCQUFTLFNBQVMsTUFBTTtBQUNwRCxRQUFNLENBQUMsU0FBUyxVQUFVLFFBQUksdUJBQXdCLElBQUk7QUFDMUQsUUFBTSxRQUFRLE9BQU8sS0FBSyxDQUFDLGNBQWMsVUFBVSxPQUFPLE9BQU8sS0FBSyxPQUFPLENBQUM7QUFDOUUsTUFBSSxDQUFDLE1BQU8sUUFBTyw2Q0FBQyxTQUFJLFdBQVUsY0FBYTtBQUFBLGdEQUFDLE9BQUUseUNBQTJCO0FBQUEsSUFBSSw0Q0FBQyxZQUFPLFNBQVMsVUFBVSxtQkFBSztBQUFBLEtBQVM7QUFDMUgsUUFBTSxNQUFNLE1BQU0sT0FBTyxJQUFJLENBQUMsVUFBVSxNQUFNLEVBQUU7QUFDaEQsUUFBTSxTQUFTLGNBQWMsS0FBSyxPQUFPLE1BQU0sRUFBRSxDQUFDO0FBQ2xELFFBQU0sT0FBTyxJQUFJLElBQUksTUFBTSxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsTUFBTSxJQUFJLEtBQUssQ0FBQyxDQUFDO0FBR25FLFFBQU0sc0JBQXNCLENBQUMsTUFBbUIsYUFBd0M7QUFDdEYsVUFBTSxVQUFVLElBQUksSUFBSSxHQUFHO0FBQzNCLFVBQU0sWUFBWSxDQUFDLEdBQUcsS0FBSyxNQUFNO0FBQ2pDLFVBQU0sV0FBVSxxQ0FBVSxXQUFVLENBQUMsR0FBRyxRQUFRLENBQUMsVUFBVTtBQUN6RCxVQUFJLENBQUMsUUFBUSxJQUFJLE1BQU0sRUFBRSxFQUFHLFFBQU8sQ0FBQyxLQUFLO0FBQ3pDLFlBQU0sY0FBYyxVQUFVLE1BQU07QUFDcEMsYUFBTyxjQUFjLENBQUMsV0FBVyxJQUFJLENBQUM7QUFBQSxJQUN4QyxDQUFDO0FBQ0QsV0FBTyxFQUFFLEdBQUcsTUFBTSxRQUFRLENBQUMsR0FBRyxRQUFRLEdBQUcsU0FBUyxFQUFFO0FBQUEsRUFDdEQ7QUFDQSxRQUFNLFNBQVMsQ0FBQyxTQUFzQixVQUFVLENBQUMsY0FBYyxFQUFFLEdBQUcsVUFBVSxDQUFDLE1BQU0sRUFBRSxHQUFHLG9CQUFvQixNQUFNLFNBQVMsTUFBTSxFQUFFLENBQUMsRUFBRSxFQUFFO0FBQzFJLFFBQU0sT0FBTyxDQUFDLElBQVksTUFBaUIsV0FBb0IsT0FBTyxVQUFVLFFBQVEsSUFBSSxNQUFNLE1BQU0sQ0FBQztBQUV6RyxXQUFTLEtBQUssT0FBa0IsTUFBaUIsUUFBaUI7QUFDaEUsVUFBTSxlQUFlO0FBQ3JCLFVBQU0sZ0JBQWdCO0FBQ3RCLFVBQU0sS0FBSyxNQUFNLGFBQWEsUUFBUSxZQUFZLEtBQUs7QUFDdkQsUUFBSSxNQUFNLElBQUksU0FBUyxFQUFFLEVBQUcsTUFBSyxJQUFJLE1BQU0sTUFBTTtBQUNqRCxlQUFXLElBQUk7QUFBQSxFQUNqQjtBQUVBLFdBQVMsTUFBTSxPQUFvQixXQUFtQjtBQWpEeEQsUUFBQUM7QUFrREksVUFBTSxRQUFRLE9BQU8sT0FBTyxPQUFPLENBQUMsY0FBYyxVQUFVLFNBQVMsTUFBTSxJQUFJO0FBQy9FLFVBQU0sUUFBUSxNQUFNLFVBQVUsQ0FBQyxjQUFjLFVBQVUsT0FBTyxNQUFNLEVBQUU7QUFDdEUsUUFBSSxjQUFjLE1BQU0sUUFBUSxFQUFHLE1BQUssTUFBTSxJQUFJLE1BQU0sTUFBTSxNQUFNLFFBQVEsQ0FBQyxFQUFFLEVBQUU7QUFDakYsUUFBSSxjQUFjLEtBQUssUUFBUSxNQUFNLFNBQVMsRUFBRyxNQUFLLE1BQU0sSUFBSSxNQUFNLE9BQU1BLE1BQUEsTUFBTSxRQUFRLENBQUMsTUFBZixnQkFBQUEsSUFBa0IsRUFBRTtBQUFBLEVBQ2xHO0FBRUEsV0FBUyxVQUFVLE9BQW9CO0FBeER6QyxRQUFBQTtBQXlESSxVQUFNLFVBQVFBLE1BQUEsS0FBSyxJQUFJLE1BQU0sRUFBRSxNQUFqQixnQkFBQUEsSUFBb0IsVUFBUyxNQUFNO0FBQ2pELFVBQU0sUUFBUSxPQUFPLE9BQU8sT0FBTyxDQUFDLGNBQWMsVUFBVSxTQUFTLE1BQU0sSUFBSTtBQUMvRSxVQUFNLFFBQVEsTUFBTSxVQUFVLENBQUMsY0FBYyxVQUFVLE9BQU8sTUFBTSxFQUFFO0FBQ3RFLFdBQ0U7QUFBQSxNQUFDO0FBQUE7QUFBQSxRQUFJLFdBQVcsYUFBYSxZQUFZLE1BQU0sS0FBSyxpQkFBaUIsRUFBRTtBQUFBLFFBQ3JFLFdBQVM7QUFBQSxRQUFDLGFBQWEsQ0FBQyxVQUFVO0FBQUUsZ0JBQU0sYUFBYSxRQUFRLGNBQWMsTUFBTSxFQUFFO0FBQUcsZ0JBQU0sYUFBYSxnQkFBZ0I7QUFBUSxxQkFBVyxNQUFNLEVBQUU7QUFBQSxRQUFHO0FBQUEsUUFDekosV0FBVyxNQUFNLFdBQVcsSUFBSTtBQUFBLFFBQUcsWUFBWSxDQUFDLFVBQVUsTUFBTSxlQUFlO0FBQUEsUUFBRyxRQUFRLENBQUMsVUFBVSxLQUFLLE9BQU8sTUFBTSxNQUFNLE1BQU0sRUFBRTtBQUFBLFFBQ3JJO0FBQUEsdURBQUMsU0FBSSxXQUFVLG1CQUFrQjtBQUFBLHdEQUFDLFVBQUssV0FBVSxZQUFXLGVBQVksUUFBTywwQkFBRTtBQUFBLFlBQU8sNENBQUMsWUFBUSxpQkFBTTtBQUFBLGFBQVM7QUFBQSxVQUNoSCw2Q0FBQyxTQUFJLFdBQVUscUJBQ2I7QUFBQSx3REFBQyxZQUFPLE1BQUssVUFBUyxjQUFZLFFBQVEsS0FBSyxTQUFTLFVBQVUsVUFBVSxHQUFHLFNBQVMsTUFBTSxNQUFNLE9BQU8sRUFBRSxHQUFHLG9CQUFDO0FBQUEsWUFDakgsNENBQUMsWUFBTyxNQUFLLFVBQVMsY0FBWSxRQUFRLEtBQUssVUFBVSxVQUFVLFVBQVUsTUFBTSxTQUFTLEdBQUcsU0FBUyxNQUFNLE1BQU0sT0FBTyxDQUFDLEdBQUcsb0JBQUM7QUFBQSxZQUNoSSw2Q0FBQyxZQUFPLGNBQVksWUFBWSxLQUFLLElBQUksT0FBTyxNQUFNLE1BQU0sVUFBVSxDQUFDLFVBQVUsS0FBSyxNQUFNLElBQUksTUFBTSxPQUFPLEtBQWtCLEdBQzdIO0FBQUEsMERBQUMsWUFBTyxPQUFNLFdBQVcsd0JBQWMsTUFBTSxFQUFFLElBQUksZ0JBQWdCLGNBQWE7QUFBQSxjQUMvRSxDQUFDLGNBQWMsTUFBTSxFQUFFLEtBQUssNENBQUMsWUFBTyxPQUFNLGFBQVkseUJBQVc7QUFBQSxjQUNsRSw0Q0FBQyxZQUFPLE9BQU0sVUFBUyxVQUFVLFVBQVUsTUFBTSxFQUFFLE1BQU0sUUFBUSxvQkFBTTtBQUFBLGVBQ3pFO0FBQUEsYUFDRjtBQUFBLFVBQ0MsTUFBTSxTQUFTLFlBQVksQ0FBQyxjQUFjLE1BQU0sRUFBRSxLQUFLLDZDQUFDLFdBQU0sV0FBVSxhQUFhO0FBQUEsbUJBQU8saUJBQWlCLE1BQU0sU0FBUyxjQUFjLG9CQUFvQjtBQUFBLFlBQzdKO0FBQUEsY0FBQztBQUFBO0FBQUEsZ0JBQU0sTUFBSztBQUFBLGdCQUFRLEtBQUk7QUFBQSxnQkFBSSxLQUFJO0FBQUEsZ0JBQUssT0FBTyxNQUFNO0FBQUEsZ0JBQU8sVUFBVSxPQUFPLGlCQUFpQixNQUFNLFNBQVM7QUFBQSxnQkFBYSxjQUFZLGFBQWEsS0FBSztBQUFBLGdCQUNuSixVQUFVLENBQUMsVUFBVSxPQUFPLEVBQUUsR0FBRyxRQUFRLFFBQVEsT0FBTyxPQUFPLElBQUksQ0FBQyxjQUFjLFVBQVUsT0FBTyxNQUFNLEtBQUssRUFBRSxHQUFHLFdBQVcsT0FBTyxPQUFPLE1BQU0sT0FBTyxLQUFLLEVBQUUsSUFBSSxTQUFTLEVBQUUsQ0FBQztBQUFBO0FBQUEsWUFBRztBQUFBLFlBQ3JMLDRDQUFDLFlBQVEsZ0JBQU0sT0FBTTtBQUFBLGFBQ3ZCO0FBQUE7QUFBQTtBQUFBLE1BakI4RSxNQUFNO0FBQUEsSUFrQnRGO0FBQUEsRUFFSjtBQUVBLFdBQVMsWUFBWSxNQUErQjtBQUNsRCxVQUFNLFNBQVMsT0FBTyxPQUFPLE9BQU8sQ0FBQyxVQUFVLE1BQU0sU0FBUyxRQUFRLENBQUMsY0FBYyxNQUFNLEVBQUUsQ0FBQztBQUM5RixVQUFNLE9BQU8sU0FBUyxlQUFlLE9BQU87QUFDNUMsV0FBTyw2Q0FBQyxTQUFJLFdBQVcsZ0NBQWdDLElBQUksSUFBSSxPQUFPLHFCQUFxQixFQUFFLElBQUksT0FBTyxFQUFFLHFCQUFxQixPQUFPLFNBQVksT0FBTyxJQUFJLENBQUMsVUFBVSxhQUFhLE1BQU0sS0FBSyxLQUFLLEVBQUUsS0FBSyxHQUFHLEVBQUUsR0FDOU07QUFBQSxhQUFPLElBQUksQ0FBQyxPQUFPLFVBQVU7QUFDNUIsY0FBTSxTQUFTLEtBQUssSUFBSSxNQUFNLEVBQUU7QUFDaEMsY0FBTSxVQUFTLGlDQUFRLFdBQVUsU0FBUyxVQUFVLE1BQU0sRUFBRSxDQUFDLEtBQUs7QUFDbEUsY0FBTSxjQUFjLENBQUMsVUFBVSxPQUFPLEVBQUUsU0FBUyxVQUFVLE1BQU0sRUFBRSxDQUFDLElBQ2hFLDhCQUE4QixLQUFLLE1BQU0sSUFBSSxzQkFBc0IsbUNBQW1DLEtBQUssTUFBTSxJQUFJLHVCQUF1QixLQUM1STtBQUNKLGNBQU0sYUFBYSxTQUFTLGVBQWUsUUFBUSxLQUFLLFlBQVksTUFBTSxFQUFFLE1BQU0sWUFBWSxPQUFPLFFBQVEsQ0FBQyxFQUFFLEVBQUU7QUFDbEgsZUFBTyw2Q0FBQyxTQUFJLFdBQVcscUJBQXFCLGFBQWEsc0JBQXNCLEVBQUUsSUFBbUIsT0FBTyxHQUFHLGlDQUFRLEtBQUssS0FBSyxNQUFNLElBQ2xJO0FBQUEsb0JBQVMsYUFBYSxPQUFPLFVBQVUsU0FBUyw0Q0FBQyxVQUFLLFdBQVUscUJBQXFCLDJDQUFRLE9BQU07QUFBQSxVQUNyRyw0Q0FBQyxVQUFLLFdBQVcsR0FBRyxVQUFVLE1BQU0sRUFBRSxNQUFNLFNBQVMscUJBQXFCLEVBQUUsSUFBSSxXQUFXLElBQUssa0JBQU87QUFBQSxhQUZmLE1BQU0sRUFHaEc7QUFBQSxNQUNGLENBQUM7QUFBQSxNQUNBLENBQUMsT0FBTyxVQUFVLDRDQUFDLFVBQUssV0FBVSxrQkFBaUIsb0NBQXNCO0FBQUEsT0FDNUU7QUFBQSxFQUNGO0FBRUEsU0FBTyw2Q0FBQyxTQUFJLFdBQVUsY0FDcEI7QUFBQSxpREFBQyxTQUFJLFdBQVUsc0JBQ2I7QUFBQSxtREFBQyxXQUFNO0FBQUE7QUFBQSxRQUFLLDRDQUFDLFlBQU8sY0FBVyxpQkFBZ0IsT0FBTyxNQUFNLElBQUksVUFBVSxDQUFDLFVBQVU7QUFBRSxxQkFBVyxNQUFNLE9BQU8sS0FBSztBQUFHLHFCQUFXLElBQUk7QUFBQSxRQUFHLEdBQ3RJLGlCQUFPLElBQUksQ0FBQyxjQUFjLDRDQUFDLFlBQTBCLE9BQU8sVUFBVSxJQUFLLG9CQUFVLEdBQUcsUUFBUSxNQUFNLEdBQUcsS0FBbEUsVUFBVSxFQUEwRCxDQUFTLEdBQ3ZIO0FBQUEsU0FBUztBQUFBLE1BQ1QsNkNBQUMsU0FBSSxXQUFVLGVBQWM7QUFBQSxvREFBQyxVQUFLLHdCQUFVO0FBQUEsUUFDM0MsNENBQUMsWUFBTyxNQUFLLFVBQVMsU0FBUyxNQUFNLE9BQU8sY0FBYyxLQUFLLFVBQVUsQ0FBQyxHQUFHLHNCQUFRO0FBQUEsUUFDckYsNENBQUMsWUFBTyxNQUFLLFVBQVMsU0FBUyxNQUFNLE9BQU8sY0FBYyxLQUFLLGlCQUFpQixDQUFDLEdBQUcsNkJBQWU7QUFBQSxRQUNuRyw0Q0FBQyxZQUFPLE1BQUssVUFBUyxTQUFTLE1BQU0sT0FBTyxjQUFjLEtBQUssS0FBSyxDQUFDLEdBQUcsd0JBQVU7QUFBQSxTQUNwRjtBQUFBLE9BQ0Y7QUFBQSxJQUNBLDZDQUFDLFNBQUksV0FBVSxlQUFjLGNBQVcsa0JBQ3RDO0FBQUEsa0RBQUMsU0FBSSxXQUFVLHFCQUFvQiwwQkFBWTtBQUFBLE1BQzlDLFlBQVksU0FBUztBQUFBLE1BQUcsWUFBWSxXQUFXO0FBQUEsT0FDbEQ7QUFBQSxJQUNBLDRDQUFDLE9BQUUsV0FBVSxZQUFXLDJIQUE2RztBQUFBLElBQ3JJLDRDQUFDLFNBQUksV0FBVSxhQUNYLFdBQUMsV0FBVyxXQUFXLEVBQVksSUFBSSxDQUFDLFNBQVM7QUFBQSxNQUFDO0FBQUE7QUFBQSxRQUFRLFdBQVcsWUFBWSxVQUFVLG1CQUFtQixFQUFFO0FBQUEsUUFDaEgsY0FBWSxVQUFVLElBQUk7QUFBQSxRQUFHLFlBQVksQ0FBQyxVQUFVLE1BQU0sZUFBZTtBQUFBLFFBQUcsUUFBUSxDQUFDLFVBQVUsS0FBSyxPQUFPLElBQUk7QUFBQSxRQUMvRztBQUFBLHVEQUFDLFFBQUk7QUFBQSxzQkFBVSxJQUFJO0FBQUEsWUFBRTtBQUFBLFlBQUMsNENBQUMsVUFBTSxpQkFBTyxPQUFPLE9BQU8sQ0FBQyxVQUFVLE1BQU0sU0FBUyxJQUFJLEVBQUUsUUFBTztBQUFBLGFBQU87QUFBQSxVQUMvRixPQUFPLE9BQU8sT0FBTyxDQUFDLFVBQVUsTUFBTSxTQUFTLElBQUksRUFBRSxJQUFJLFNBQVM7QUFBQSxVQUNsRSxDQUFDLE9BQU8sT0FBTyxLQUFLLENBQUMsVUFBVSxNQUFNLFNBQVMsSUFBSSxLQUFLLDRDQUFDLE9BQUUsV0FBVSxrQkFBaUIsK0JBQWlCO0FBQUE7QUFBQTtBQUFBLE1BSmtCO0FBQUEsSUFLM0gsQ0FBVSxHQUNaO0FBQUEsSUFDQSw2Q0FBQyxhQUFRLFdBQVUsY0FBYSxjQUFXLGlCQUFnQixZQUFZLENBQUMsVUFBVSxNQUFNLGVBQWUsR0FBRyxRQUFRLENBQUMsVUFBVSxLQUFLLE9BQU8sUUFBUSxHQUMvSTtBQUFBLG1EQUFDLFFBQUc7QUFBQTtBQUFBLFFBQU8sNENBQUMsVUFBTSxpQkFBTyxPQUFPLE9BQU8sQ0FBQyxVQUFVLE1BQU0sU0FBUyxRQUFRLEVBQUUsUUFBTztBQUFBLFNBQU87QUFBQSxNQUN6Riw0Q0FBQyxTQUFJLFdBQVUsbUJBQW1CLGlCQUFPLE9BQU8sT0FBTyxDQUFDLFVBQVUsTUFBTSxTQUFTLFFBQVEsRUFBRSxJQUFJLFNBQVMsR0FBRTtBQUFBLE1BQ3pHLENBQUMsT0FBTyxPQUFPLEtBQUssQ0FBQyxVQUFVLE1BQU0sU0FBUyxRQUFRLEtBQUssNENBQUMsT0FBRSxXQUFVLGtCQUFpQiwyQ0FBNkI7QUFBQSxPQUN6SDtBQUFBLElBQ0EsNkNBQUMsU0FBSSxXQUFVLHNCQUFxQjtBQUFBLG1EQUFDLFdBQU07QUFBQSxvREFBQyxXQUFNLE1BQUssWUFBVyxjQUFXLDhCQUE2QixTQUFTLE9BQU8sZUFBZSxVQUFVLENBQUMsVUFBVSxPQUFPLEVBQUUsR0FBRyxRQUFRLGVBQWUsTUFBTSxPQUFPLFFBQVEsQ0FBQyxHQUFHO0FBQUEsUUFBRTtBQUFBLFNBQTJCO0FBQUEsTUFDclAsNkNBQUMsV0FBTTtBQUFBLG9EQUFDLFdBQU0sTUFBSyxZQUFXLFNBQVMsT0FBTyxVQUFVLE9BQU8sZUFBZSxVQUFVLE9BQU8sZUFBZSxVQUFVLENBQUMsVUFBVSxPQUFPLEVBQUUsR0FBRyxRQUFRLFFBQVEsTUFBTSxPQUFPLFFBQVEsQ0FBQyxHQUFHO0FBQUEsUUFBRTtBQUFBLFNBQW9CO0FBQUEsTUFDOU0sNENBQUMsVUFBSyxtR0FBZ0Y7QUFBQSxPQUN4RjtBQUFBLElBQ0MsT0FBTyxpQkFBaUIsNENBQUMsT0FBRSxXQUFVLFlBQVcsc0pBQXdJO0FBQUEsSUFDekwsNkNBQUMsU0FBSSxXQUFVLHFCQUFvQjtBQUFBLGtEQUFDLFlBQU8sTUFBSyxVQUFTLFNBQVMsVUFBVSxvQkFBTTtBQUFBLE1BQVMsNENBQUMsWUFBTyxXQUFVLGFBQVksTUFBSyxVQUFTLFNBQVMsTUFBTSxRQUFRLEVBQUUsR0FBRyxVQUFVLFFBQVEsRUFBRSxHQUFHLFFBQVEsQ0FBQyxNQUFNLEVBQUUsR0FBRyxvQkFBb0IsUUFBUSxPQUFPLE1BQU0sRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLEdBQUcsMEJBQVk7QUFBQSxPQUFTO0FBQUEsS0FDelI7QUFDRjs7O0FEaklTLElBQUFDLHNCQUFBO0FBSlQsSUFBTSx1QkFBbUIscUNBQXdGLEVBQUUsZUFBZTtBQUVsSSxJQUFNLGNBQWMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxRQUFRLFFBQVEsRUFBRSxNQUEyQztBQUMxRixRQUFNLGNBQVUsNENBQW9CLGdCQUFnQjtBQUNwRCxTQUFPLDhDQUFDLDBDQUFlLFFBQVEsRUFBRSxPQUFPLG1DQUFtQyxXQUFXLHNCQUFzQixXQUFXLE9BQU8sR0FDNUg7QUFBQSxpREFBQyx1Q0FBWSxTQUFTLE1BQU0sUUFBUSxJQUFJLEdBQUcsNkJBQWU7QUFBQSxJQUMxRCw2Q0FBQyx3Q0FBYSx1REFBQyxnQkFBYSxRQUFnQixVQUFvQixTQUFTLENBQUMsVUFBVSxRQUFRLEtBQUssR0FBRyxVQUFVLE1BQU0sUUFBUSxJQUFJLEdBQUcsR0FBRTtBQUFBLEtBQ3ZJO0FBQ0Y7QUFFTyxJQUFNLDZCQUF5QixnREFBd0IsRUFBRSxNQUFNLGtCQUFrQixXQUFXLGFBQWEsU0FBUyxNQUFNLEtBQUssQ0FBQztBQUU5SCxJQUFNLDJCQUF1QixtQ0FBZTtBQUFBLEVBQ2pELElBQUk7QUFBQSxFQUNKLGNBQWMsQ0FBQyw4Q0FBdUI7QUFBQSxFQUN0QyxhQUFhLENBQUMsT0FBTztBQUNuQixVQUFNLE9BQU8sR0FBRyxPQUFPLCtDQUF3QixJQUFJLGdCQUFnQixFQUFFLElBQUksR0FBRyxRQUFRLENBQUMsRUFBRTtBQUN2RixXQUFPLE1BQU07QUFBQSxFQUNmO0FBQ0YsQ0FBQzs7O0FKa0NHLElBQUFDLHNCQUFBO0FBakRKLElBQU0sU0FBUyxNQUFNO0FBQ25CLFFBQU0sbUJBQWUsaUNBQWMsc0JBQXNCO0FBQ3pELFFBQU0saUJBQWEsaUNBQWMsb0JBQW9CO0FBQ3JELFFBQU0sQ0FBQyxVQUFVLFdBQVcsUUFBSSx3QkFBeUIsYUFBYTtBQUN0RSxRQUFNLENBQUMsS0FBSyxNQUFNLFFBQUksd0JBQTZCLElBQUk7QUFDdkQsUUFBTSxDQUFDLE9BQU8sUUFBUSxRQUFJLHdCQUFTLEVBQUU7QUFDckMsUUFBTSxDQUFDLFNBQVMsVUFBVSxRQUFJLHdCQUFTLEtBQUs7QUFDNUMsUUFBTSxDQUFDLFFBQVEsU0FBUyxRQUFJLHdCQUF5QixDQUFDLENBQUM7QUFDdkQsUUFBTSxrQkFBYyxzQkFBTyxRQUFRO0FBQ25DLFFBQU0sY0FBVSxzQkFBbUIsTUFBTTtBQUFBLEVBQUMsQ0FBQztBQUMzQyxRQUFNLENBQUMsUUFBUSxTQUFTLFFBQUksd0JBQXVCLEVBQUUsUUFBUSxHQUFHLGFBQWEsRUFBRSxDQUFDO0FBQ2hGLCtCQUFVLE1BQU07QUFDZCxRQUFJLFlBQVk7QUFDaEIsUUFBSTtBQUNKLGlCQUFhLEVBQUUsS0FBSyxDQUFDLFVBQVU7QUFDN0IsVUFBSSxVQUFXO0FBQ2YsYUFBTyxLQUFLO0FBQ1osa0JBQVksaUJBQWlCLE1BQU0sSUFBSSxDQUFDLENBQUM7QUFDekMsb0JBQVUsc0JBQVMsTUFBTSxNQUFNLElBQUksR0FBRyxDQUFDLFNBQVMsWUFBWSxpQkFBaUIsSUFBSSxDQUFDLENBQUM7QUFBQSxJQUNyRixDQUFDLEVBQUUsTUFBTSxNQUFNO0FBQUUsVUFBSSxDQUFDLFVBQVcsVUFBUyxnRUFBZ0U7QUFBQSxJQUFHLENBQUM7QUFDOUcsV0FBTyxNQUFNO0FBQUUsa0JBQVk7QUFBTTtBQUFBLElBQWE7QUFBQSxFQUNoRCxHQUFHLENBQUMsWUFBWSxDQUFDO0FBQ2pCLCtCQUFVLE1BQU07QUFDZCxnQkFBWSxVQUFVO0FBQ3RCLFlBQVEsUUFBUTtBQUFBLEVBQ2xCLEdBQUcsQ0FBQyxRQUFRLENBQUM7QUFDYiwrQkFBVSxNQUFNO0FBQ2QsUUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTLFFBQVM7QUFDL0IsV0FBTyxZQUFZLFVBQVUsV0FBVztBQUFBLE1BQ3RDLFdBQVcsQ0FBQyxTQUFTLFFBQVEsY0FBYyxLQUFLLFlBQVksUUFBUSxPQUFPLE9BQU8sQ0FBQztBQUFBLE1BQ25GLFdBQVc7QUFBQSxNQUNYLFdBQVcsQ0FBQyxhQUFhO0FBQUUsZ0JBQVEsVUFBVTtBQUFVLGVBQU8sTUFBTTtBQUFFLGtCQUFRLFVBQVUsTUFBTTtBQUFBLFVBQUM7QUFBQSxRQUFHO0FBQUEsTUFBRztBQUFBLElBQ3ZHLENBQUM7QUFBQSxFQUNILEdBQUcsQ0FBQyxLQUFLLFNBQVMsT0FBTyxDQUFDO0FBQzFCLFdBQVMsS0FBSyxPQUF1QjtBQUNuQyxRQUFJLENBQUMsSUFBSztBQUNWLGlDQUFZLE1BQU0sSUFBSSxJQUFJLGlCQUFpQixLQUFLLENBQUMsQ0FBQztBQUFBLEVBQ3BEO0FBQ0EsaUJBQWUsT0FBTztBQUNwQixRQUFJLFFBQVM7QUFDYixlQUFXLElBQUk7QUFDZixRQUFJO0FBQ0YsWUFBTSxTQUFTLE1BQU0sV0FBVyxRQUFRLFFBQVE7QUFDaEQsVUFBSSxPQUFRLE1BQUssTUFBTTtBQUFBLElBQ3pCLFFBQVE7QUFBRSxlQUFTLGtFQUFrRTtBQUFBLElBQUcsVUFDeEY7QUFBVSxpQkFBVyxLQUFLO0FBQUEsSUFBRztBQUFBLEVBQy9CO0FBQ0EsUUFBTSxRQUFRLFFBQVEsZ0JBQWdCLENBQUMsTUFBTSxrQkFBa0IsQ0FBQyxTQUFTLFVBQVUsaUJBQWlCLE9BQU8sY0FBYyxzQkFBc0I7QUFDL0ksU0FDRSw4Q0FBQyxVQUFLLE9BQU8sRUFBRSxTQUFTLGVBQWUsS0FBSyxNQUFNLEdBQUc7QUFBQTtBQUFBLE1BQUM7QUFBQTtBQUFBLFFBQ3BELFdBQVU7QUFBQSxRQUNWLE1BQUs7QUFBQSxRQUNMLFVBQVUsQ0FBQztBQUFBLFFBQ1gsZ0JBQWMsU0FBUztBQUFBLFFBQ3ZCLE9BQU8sVUFBVSxTQUFTLFVBQ3RCLHNCQUFzQixPQUFPLE1BQU0sc0RBQ25DO0FBQUEsUUFDSixTQUFTLE1BQU0sS0FBSyxFQUFFLEdBQUcsVUFBVSxTQUFTLENBQUMsU0FBUyxRQUFRLENBQUM7QUFBQSxRQUMvRDtBQUFBO0FBQUEsSUFBTTtBQUFBLElBQVM7QUFBQSxNQUFDO0FBQUE7QUFBQSxRQUFPLFdBQVU7QUFBQSxRQUFhLE1BQUs7QUFBQSxRQUFTLFVBQVUsQ0FBQyxPQUFPLENBQUMsT0FBTyxVQUFVLFdBQVcsQ0FBQyxTQUFTO0FBQUEsUUFDckgsT0FBTTtBQUFBLFFBQTBELFNBQVM7QUFBQSxRQUFNO0FBQUE7QUFBQSxJQUFPO0FBQUEsS0FBUztBQUVyRztBQUVPLElBQU0seUJBQXFCLG1DQUFlO0FBQUEsRUFDL0MsSUFBSTtBQUFBLEVBQ0osYUFBYSxNQUFNLE9BQU8sRUFBRSxXQUFXLFFBQVEsVUFBVSxTQUFrQixhQUFhLEdBQUc7QUFBQSxFQUMzRixnQkFBZ0I7QUFDbEIsQ0FBQzs7O0FNN0VNLElBQU0sWUFBWTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBOzs7QVZRekIsSUFBTSxpQkFBYSwwQ0FBYSxFQUFFLElBQUksNkJBQTZCLEtBQUssWUFBWSxVQUFVLENBQUM7QUFFeEYsSUFBTSwwQkFBc0IsZ0NBQVc7QUFBQSxFQUM1QyxJQUFJO0FBQUEsRUFDSixVQUFVLENBQUMsT0FBTyxHQUFHLFNBQVMsWUFBWSxvQkFBb0IscUJBQXFCLHdCQUF3Qix3QkFBd0Isb0JBQW9CO0FBQ3pKLENBQUM7IiwKICAibmFtZXMiOiBbImRvY3VtZW50IiwgImZpZWxkIiwgIl9hIiwgImltcG9ydF9pbmplY3RhYmxlIiwgImltcG9ydF9yZWFjdCIsICJkb2N1bWVudCIsICJfYSIsICJfYiIsICJyb3ciLCAiaW1wb3J0X2luamVjdGFibGUiLCAiX2EiLCAiaW1wb3J0X2pzeF9ydW50aW1lIiwgImltcG9ydF9qc3hfcnVudGltZSJdCn0K
