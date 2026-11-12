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
      const end = index === items.length - 1 ? 122 : 2 + Math.round(120 * used / total);
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
  if (ids.some((id) => !id) || !ids.some((id) => normalize(id) === "name")) return;
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
  for (const row of root.querySelectorAll(`[${rowAttribute}]`)) {
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
  const update = (next) => setDrafts((previous) => ({ ...previous, [table.id]: next }));
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
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { className: "lwr-apply", type: "button", onClick: () => onApply({ ...settings, tables: { ...drafts, [table.id]: layout } }), children: "Apply layout" })
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vc3JjL2luZGV4LnRzIiwgIi4uL3NyYy9jb25maWcudHMiLCAiLi4vc3JjL2F1dG8td2lkdGgudHMiLCAiLi4vc3JjL2xheW91dC50cyIsICIuLi9zcmMvc3RhdHVzLmluamVjdGFibGUudHN4IiwgIi4uL3NyYy92aXJ0dWFsaXplci50cyIsICIuLi9zcmMvY29udHJvbGxlci50cyIsICIuLi9zcmMvc2V0dGluZ3MuaW5qZWN0YWJsZS50cyIsICIuLi9zcmMvZWRpdG9yLW1vZGFsLmluamVjdGFibGUudHN4IiwgIi4uL3NyYy9lZGl0b3IudHN4IiwgIi4uL3NyYy9lZGl0b3Itc3R5bGVzLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJpbXBvcnQgeyBnZXRGZWF0dXJlIH0gZnJvbSBcIkBrOHNsZW5zL2ZlYXR1cmUtY29yZVwiO1xuaW1wb3J0IHsgYXNTdHlsZXNoZWV0IH0gZnJvbSBcIkBrOHNsZW5zL3N0eWxlc2hlZXQtY29udHJhY3RzXCI7XG5pbXBvcnQgeyBsYXlvdXRDc3MgfSBmcm9tIFwiLi9sYXlvdXQudHNcIjtcbmltcG9ydCB7IHdvcmtsb2FkUm93c1RvZ2dsZSB9IGZyb20gXCIuL3N0YXR1cy5pbmplY3RhYmxlXCI7XG5pbXBvcnQgeyBlZGl0b3JDc3MgfSBmcm9tIFwiLi9lZGl0b3Itc3R5bGVzLnRzXCI7XG5pbXBvcnQgeyBsYXlvdXRTZXR0aW5nc0J1bmNoLCBsb2FkU2V0dGluZ3NJbmplY3RhYmxlIH0gZnJvbSBcIi4vc2V0dGluZ3MuaW5qZWN0YWJsZVwiO1xuaW1wb3J0IHsgbGF5b3V0RWRpdG9yTW9kYWxCdW5jaCwgb3BlbkVkaXRvckluamVjdGFibGUgfSBmcm9tIFwiLi9lZGl0b3ItbW9kYWwuaW5qZWN0YWJsZVwiO1xuXG5jb25zdCBzdHlsZXNoZWV0ID0gYXNTdHlsZXNoZWV0KHsgaWQ6IFwibGVucy13b3JrbG9hZC1yb3dzL2xheW91dFwiLCBjc3M6IGxheW91dENzcyArIGVkaXRvckNzcyB9KTtcblxuZXhwb3J0IGNvbnN0IHdvcmtsb2FkUm93c0ZlYXR1cmUgPSBnZXRGZWF0dXJlKHtcbiAgaWQ6IFwibGVucy13b3JrbG9hZC1yb3dzXCIsXG4gIHJlZ2lzdGVyOiAoZGkpID0+IGRpLnJlZ2lzdGVyKHN0eWxlc2hlZXQsIHdvcmtsb2FkUm93c1RvZ2dsZSwgbGF5b3V0U2V0dGluZ3NCdW5jaCwgbG9hZFNldHRpbmdzSW5qZWN0YWJsZSwgbGF5b3V0RWRpdG9yTW9kYWxCdW5jaCwgb3BlbkVkaXRvckluamVjdGFibGUpLFxufSk7XG4iLCAiZXhwb3J0IHR5cGUgRmllbGRMaW5lID0gXCJwcmltYXJ5XCIgfCBcInNlY29uZGFyeVwiIHwgXCJoaWRkZW5cIjtcbmV4cG9ydCB0eXBlIEZpZWxkQ29uZmlnID0geyBpZDogc3RyaW5nOyBsaW5lOiBGaWVsZExpbmU7IHdpZHRoOiBudW1iZXIgfTtcbmV4cG9ydCB0eXBlIFRhYmxlTGF5b3V0ID0geyBmaWVsZHM6IEZpZWxkQ29uZmlnW107IGxhYmVsczogYm9vbGVhbjsgYXV0b1NlY29uZGFyeTogYm9vbGVhbiB9O1xuZXhwb3J0IHR5cGUgTGF5b3V0U2V0dGluZ3MgPSB7IHZlcnNpb246IDE7IGVuYWJsZWQ6IGJvb2xlYW47IHRhYmxlczogUmVjb3JkPHN0cmluZywgVGFibGVMYXlvdXQ+IH07XG5leHBvcnQgdHlwZSBGaWVsZEluZm8gPSB7IGlkOiBzdHJpbmc7IGxhYmVsOiBzdHJpbmc7IHNhbXBsZT86IHN0cmluZyB9O1xuZXhwb3J0IHR5cGUgVGFibGVDYXRhbG9nID0geyBpZDogc3RyaW5nOyBmaWVsZHM6IEZpZWxkSW5mb1tdIH07XG5leHBvcnQgdHlwZSBQcmVzZXQgPSBcImJhbGFuY2VkXCIgfCBcImFsbFwiIHwgXCJ0cm91Ymxlc2hvb3RpbmdcIjtcblxuZXhwb3J0IGNvbnN0IGVtcHR5U2V0dGluZ3M6IExheW91dFNldHRpbmdzID0geyB2ZXJzaW9uOiAxLCBlbmFibGVkOiB0cnVlLCB0YWJsZXM6IHt9IH07XG5leHBvcnQgY29uc3Qgbm9ybWFsaXplID0gKGlkOiBzdHJpbmcpID0+IGlkLnJlcGxhY2UoL1teYS16MC05XS9naSwgXCJcIikudG9Mb3dlckNhc2UoKTtcbmV4cG9ydCBjb25zdCBpc1dhcm5pbmdJY29uID0gKGlkOiBzdHJpbmcpID0+IG5vcm1hbGl6ZShpZCkgPT09IFwic3RhdHVzaWNvblwiO1xuZXhwb3J0IGNvbnN0IGlzQ29udHJvbCA9IChpZDogc3RyaW5nKSA9PiBbXCJzZWxlY3Rpb25cIiwgXCJzZWxlY3RcIiwgXCJjaGVja2JveFwiLCBcImlkMFwiLCBcIm1lbnVcIiwgXCJhY3Rpb25zXCIsIFwiY29udGV4dG1lbnVcIl0uaW5jbHVkZXMobm9ybWFsaXplKGlkKSk7XG5jb25zdCBpc05hbWUgPSAoaWQ6IHN0cmluZykgPT4gbm9ybWFsaXplKGlkKSA9PT0gXCJuYW1lXCI7XG5jb25zdCBpc093bmVyID0gKGlkOiBzdHJpbmcpID0+IFtcImNvbnRyb2xsZWRieVwiLCBcIm93bmVyXCIsIFwib3duZXJzXCIsIFwib3duZXJyZWZlcmVuY2VzXCJdLmluY2x1ZGVzKG5vcm1hbGl6ZShpZCkpO1xuY29uc3QgaXNTdGF0dXMgPSAoaWQ6IHN0cmluZykgPT4gW1wic3RhdHVzXCIsIFwicGhhc2VcIl0uaW5jbHVkZXMobm9ybWFsaXplKGlkKSk7XG5cbmV4cG9ydCBmdW5jdGlvbiBmaWVsZExhYmVsKGlkOiBzdHJpbmcpOiBzdHJpbmcge1xuICBjb25zdCBsYWJlbHM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gICAgbmFtZTogXCJOYW1lXCIsIG5hbWVzcGFjZTogXCJOYW1lc3BhY2VcIiwgY3B1OiBcIkNQVVwiLCBtZW1vcnk6IFwiTWVtb3J5XCIsIGNvbnRhaW5lcnM6IFwiQ29udGFpbmVyc1wiLFxuICAgIHJlc3RhcnRzOiBcIlJlc3RhcnRzXCIsIG5vZGU6IFwiTm9kZVwiLCBxb3M6IFwiUW9TXCIsIGFnZTogXCJBZ2VcIiwgc3RhdHVzOiBcIlN0YXR1c1wiLCBwaGFzZTogXCJTdGF0dXNcIixcbiAgICBvd25lcnM6IFwiQ29udHJvbGxlZCBCeVwiLCBvd25lcjogXCJDb250cm9sbGVkIEJ5XCIsIGNvbnRyb2xsZWRieTogXCJDb250cm9sbGVkIEJ5XCIsIHdhcm5pbmc6IFwiV2FybmluZ3NcIiwgd2FybmluZ3M6IFwiV2FybmluZ3NcIixcbiAgICBzdGF0dXNpY29uOiBcIldhcm5pbmdzXCIsXG4gIH07XG4gIHJldHVybiBsYWJlbHNbbm9ybWFsaXplKGlkKV0gPz8gaWQucmVwbGFjZSgvKFthLXpdKShbQS1aXSkvZywgXCIkMSAkMlwiKS5yZXBsYWNlKC9bLV9dL2csIFwiIFwiKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlZmF1bHRMYXlvdXQoaWRzOiBzdHJpbmdbXSwgcHJlc2V0OiBQcmVzZXQgPSBcImJhbGFuY2VkXCIpOiBUYWJsZUxheW91dCB7XG4gIGNvbnN0IGZpZWxkczogRmllbGRDb25maWdbXSA9IGlkcy5maWx0ZXIoKGlkKSA9PiAhaXNDb250cm9sKGlkKSkubWFwKChpZCkgPT4ge1xuICAgIGNvbnN0IGtleSA9IG5vcm1hbGl6ZShpZCk7XG4gICAgbGV0IGxpbmU6IEZpZWxkTGluZSA9IFwic2Vjb25kYXJ5XCI7XG4gICAgbGV0IHdpZHRoID0gL25hbWVzcGFjZXxub2RlL2kudGVzdChpZCkgPyAxMCA6IDU7XG4gICAgaWYgKGlzTmFtZShpZCkpIHsgbGluZSA9IFwicHJpbWFyeVwiOyB3aWR0aCA9IDM2OyB9XG4gICAgaWYgKGlzU3RhdHVzKGlkKSkgeyBsaW5lID0gXCJwcmltYXJ5XCI7IHdpZHRoID0gNzsgfVxuICAgIGlmIChrZXkgPT09IFwiYWdlXCIpIHsgbGluZSA9IFwicHJpbWFyeVwiOyB3aWR0aCA9IDU7IH1cbiAgICBpZiAoaXNXYXJuaW5nSWNvbihpZCkpIHsgbGluZSA9IFwicHJpbWFyeVwiOyB3aWR0aCA9IDE7IH1cbiAgICBpZiAocHJlc2V0ICE9PSBcImFsbFwiICYmIFtcInFvc1wiLCBcImNvbnRhaW5lcnNcIl0uaW5jbHVkZXMoa2V5KSkgbGluZSA9IFwiaGlkZGVuXCI7XG4gICAgaWYgKHByZXNldCA9PT0gXCJhbGxcIikge1xuICAgICAgaWYgKGtleSA9PT0gXCJhZ2VcIikgbGluZSA9IFwic2Vjb25kYXJ5XCI7XG4gICAgICBpZiAoaXNPd25lcihpZCkpIHsgbGluZSA9IFwicHJpbWFyeVwiOyB3aWR0aCA9IDEwOyB9XG4gICAgfVxuICAgIGlmIChwcmVzZXQgPT09IFwidHJvdWJsZXNob290aW5nXCIpIHtcbiAgICAgIGlmIChrZXkgPT09IFwicmVzdGFydHNcIiB8fCAvd2FybmluZy8udGVzdChrZXkpKSB7IGxpbmUgPSBcInByaW1hcnlcIjsgd2lkdGggPSA1OyB9XG4gICAgICBpZiAoa2V5ID09PSBcImNvbnRhaW5lcnNcIikgbGluZSA9IFwic2Vjb25kYXJ5XCI7XG4gICAgfVxuICAgIHJldHVybiB7IGlkLCBsaW5lLCB3aWR0aCB9O1xuICB9KTtcbiAgLy8gUHJlc2VydmUgY29sdW1uIG9yZGVyIHdpdGhpbiBlYWNoIGxpbmUsIHdpdGggTmFtZSBhbHdheXMgbGVhZGluZyB0aGUgZGVmYXVsdCBsYXlvdXQuXG4gIGZpZWxkcy5zb3J0KChhLCBiKSA9PiBOdW1iZXIoaXNOYW1lKGIuaWQpKSAtIE51bWJlcihpc05hbWUoYS5pZCkpKTtcbiAgcmV0dXJuIHsgZmllbGRzLCBsYWJlbHM6IHRydWUsIGF1dG9TZWNvbmRhcnk6IGZhbHNlIH07XG59XG5cbi8qKiBWYWxpZGF0ZSBwZXJzaXN0ZWQgb3IgaW1wb3J0ZWQgdmFsdWVzIGFuZCBtZXJnZSBjb2x1bW5zIGFkZGVkIGFmdGVyIGEgbGF5b3V0IHdhcyBzYXZlZC4gKi9cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlTGF5b3V0KGlkczogc3RyaW5nW10sIHZhbHVlPzogdW5rbm93bik6IFRhYmxlTGF5b3V0IHtcbiAgY29uc3QgZGVmYXVsdHMgPSBkZWZhdWx0TGF5b3V0KGlkcyk7XG4gIGlmICghdmFsdWUgfHwgdHlwZW9mIHZhbHVlICE9PSBcIm9iamVjdFwiKSByZXR1cm4gZGVmYXVsdHM7XG4gIGNvbnN0IHJhdyA9IHZhbHVlIGFzIFBhcnRpYWw8VGFibGVMYXlvdXQ+O1xuICBpZiAoIUFycmF5LmlzQXJyYXkocmF3LmZpZWxkcykpIHJldHVybiBkZWZhdWx0cztcbiAgY29uc3QgYWxsb3dlZCA9IG5ldyBTZXQoZGVmYXVsdHMuZmllbGRzLm1hcCgoZmllbGQpID0+IGZpZWxkLmlkKSk7XG4gIGNvbnN0IHNlZW4gPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3QgZmllbGRzOiBGaWVsZENvbmZpZ1tdID0gW107XG4gIGZvciAoY29uc3QgZmllbGQgb2YgcmF3LmZpZWxkcykge1xuICAgIGlmICghZmllbGQgfHwgdHlwZW9mIGZpZWxkLmlkICE9PSBcInN0cmluZ1wiIHx8ICFhbGxvd2VkLmhhcyhmaWVsZC5pZCkgfHwgc2Vlbi5oYXMoZmllbGQuaWQpKSBjb250aW51ZTtcbiAgICBpZiAoIVtcInByaW1hcnlcIiwgXCJzZWNvbmRhcnlcIiwgXCJoaWRkZW5cIl0uaW5jbHVkZXMoZmllbGQubGluZSkpIGNvbnRpbnVlO1xuICAgIHNlZW4uYWRkKGZpZWxkLmlkKTtcbiAgICBmaWVsZHMucHVzaCh7XG4gICAgICBpZDogZmllbGQuaWQsXG4gICAgICBsaW5lOiAoaXNOYW1lKGZpZWxkLmlkKSAmJiBmaWVsZC5saW5lID09PSBcImhpZGRlblwiKSB8fCAoaXNXYXJuaW5nSWNvbihmaWVsZC5pZCkgJiYgZmllbGQubGluZSAhPT0gXCJoaWRkZW5cIikgPyBcInByaW1hcnlcIiA6IGZpZWxkLmxpbmUsXG4gICAgICB3aWR0aDogTnVtYmVyLmlzRmluaXRlKGZpZWxkLndpZHRoKSA/IE1hdGgubWF4KDEsIE1hdGgubWluKDQ4LCBNYXRoLnJvdW5kKGZpZWxkLndpZHRoKSkpIDogNSxcbiAgICB9KTtcbiAgfVxuICBmaWVsZHMucHVzaCguLi5kZWZhdWx0cy5maWVsZHMuZmlsdGVyKChmaWVsZCkgPT4gIXNlZW4uaGFzKGZpZWxkLmlkKSkpO1xuICByZXR1cm4geyBmaWVsZHMsIGxhYmVsczogcmF3LmxhYmVscyAhPT0gZmFsc2UsIGF1dG9TZWNvbmRhcnk6IHJhdy5hdXRvU2Vjb25kYXJ5ID09PSB0cnVlIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzYW5pdGl6ZVNldHRpbmdzKHZhbHVlOiB1bmtub3duKTogTGF5b3V0U2V0dGluZ3Mge1xuICBpZiAoIXZhbHVlIHx8IHR5cGVvZiB2YWx1ZSAhPT0gXCJvYmplY3RcIikgcmV0dXJuIHsgLi4uZW1wdHlTZXR0aW5ncywgdGFibGVzOiB7fSB9O1xuICBjb25zdCByYXcgPSB2YWx1ZSBhcyBQYXJ0aWFsPExheW91dFNldHRpbmdzPjtcbiAgY29uc3QgdGFibGVzOiBSZWNvcmQ8c3RyaW5nLCBUYWJsZUxheW91dD4gPSB7fTtcbiAgaWYgKHJhdy50YWJsZXMgJiYgdHlwZW9mIHJhdy50YWJsZXMgPT09IFwib2JqZWN0XCIgJiYgIUFycmF5LmlzQXJyYXkocmF3LnRhYmxlcykpIHtcbiAgICBmb3IgKGNvbnN0IFtpZCwgbGF5b3V0XSBvZiBPYmplY3QuZW50cmllcyhyYXcudGFibGVzKSkge1xuICAgICAgaWYgKCFsYXlvdXQgfHwgIUFycmF5LmlzQXJyYXkobGF5b3V0LmZpZWxkcykpIGNvbnRpbnVlO1xuICAgICAgY29uc3QgaWRzID0gbGF5b3V0LmZpZWxkcy5maWx0ZXIoKGZpZWxkKSA9PiBmaWVsZCAmJiB0eXBlb2YgZmllbGQuaWQgPT09IFwic3RyaW5nXCIpLm1hcCgoZmllbGQpID0+IGZpZWxkLmlkKTtcbiAgICAgIHRhYmxlc1tpZF0gPSByZXNvbHZlTGF5b3V0KGlkcywgbGF5b3V0KTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHsgdmVyc2lvbjogMSwgZW5hYmxlZDogcmF3LmVuYWJsZWQgIT09IGZhbHNlLCB0YWJsZXMgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIG1vdmVGaWVsZChsYXlvdXQ6IFRhYmxlTGF5b3V0LCBpZDogc3RyaW5nLCBsaW5lOiBGaWVsZExpbmUsIGJlZm9yZT86IHN0cmluZyk6IFRhYmxlTGF5b3V0IHtcbiAgY29uc3QgZmllbGQgPSBsYXlvdXQuZmllbGRzLmZpbmQoKGNhbmRpZGF0ZSkgPT4gY2FuZGlkYXRlLmlkID09PSBpZCk7XG4gIGlmICghZmllbGQgfHwgKGlzTmFtZShpZCkgJiYgbGluZSA9PT0gXCJoaWRkZW5cIikpIHJldHVybiBsYXlvdXQ7XG4gIGlmIChpZCA9PT0gYmVmb3JlICYmIGZpZWxkLmxpbmUgPT09IGxpbmUpIHJldHVybiBsYXlvdXQ7XG4gIGNvbnN0IGZpZWxkcyA9IGxheW91dC5maWVsZHMuZmlsdGVyKChjYW5kaWRhdGUpID0+IGNhbmRpZGF0ZS5pZCAhPT0gaWQpO1xuICBsZXQgcG9zaXRpb24gPSBiZWZvcmUgPyBmaWVsZHMuZmluZEluZGV4KChjYW5kaWRhdGUpID0+IGNhbmRpZGF0ZS5pZCA9PT0gYmVmb3JlICYmIGNhbmRpZGF0ZS5saW5lID09PSBsaW5lKSA6IC0xO1xuICBpZiAocG9zaXRpb24gPCAwKSB7XG4gICAgY29uc3QgbGFzdCA9IGZpZWxkcy5maW5kTGFzdEluZGV4KChjYW5kaWRhdGUpID0+IGNhbmRpZGF0ZS5saW5lID09PSBsaW5lKTtcbiAgICBwb3NpdGlvbiA9IGxhc3QgPCAwID8gZmllbGRzLmxlbmd0aCA6IGxhc3QgKyAxO1xuICB9XG4gIGZpZWxkcy5zcGxpY2UocG9zaXRpb24sIDAsIHsgLi4uZmllbGQsIGxpbmU6IGlzV2FybmluZ0ljb24oaWQpICYmIGxpbmUgIT09IFwiaGlkZGVuXCIgPyBcInByaW1hcnlcIiA6IGxpbmUgfSk7XG4gIHJldHVybiB7IC4uLmxheW91dCwgZmllbGRzIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkZXRhaWxHcm91cChpZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgY29uc3Qga2V5ID0gbm9ybWFsaXplKGlkKTtcbiAgaWYgKFtcImNwdVwiLCBcIm1lbW9yeVwiLCBcImNvbnRhaW5lcnNcIiwgXCJyZXN0YXJ0c1wiXS5pbmNsdWRlcyhrZXkpKSByZXR1cm4gXCJyZXNvdXJjZXNcIjtcbiAgaWYgKGlzT3duZXIoaWQpIHx8IFtcIm5vZGVcIiwgXCJuYW1lc3BhY2VcIl0uaW5jbHVkZXMoa2V5KSkgcmV0dXJuIFwicmVsYXRpb25zXCI7XG4gIGlmIChrZXkgPT09IFwicW9zXCIpIHJldHVybiBcInF1YWxpdHlcIjtcbiAgcmV0dXJuIFwib3RoZXJcIjtcbn1cbiIsICJleHBvcnQgdHlwZSBOYXR1cmFsV2lkdGggPSB7IGlkOiBzdHJpbmc7IHByZWZlcnJlZDogbnVtYmVyOyBtaW5pbXVtOiBudW1iZXIgfTtcbmV4cG9ydCB0eXBlIEZpdHRlZFdpZHRoID0geyBpZDogc3RyaW5nOyBvZmZzZXQ6IG51bWJlcjsgd2lkdGg6IG51bWJlciB9O1xuXG4vKiogS2VlcCBzaG9ydCBmaWVsZHMgYXQgdGhlaXIgbmF0dXJhbCB3aWR0aDsgc2hyaW5rIGxvbmcgZmllbGRzIG9ubHkgd2hlbiBzcGFjZSBydW5zIG91dC4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaXROYXR1cmFsV2lkdGhzKGZpZWxkczogTmF0dXJhbFdpZHRoW10sIGF2YWlsYWJsZTogbnVtYmVyKTogRml0dGVkV2lkdGhbXSB7XG4gIGF2YWlsYWJsZSA9IE1hdGgubWF4KDAsIE51bWJlci5pc0Zpbml0ZShhdmFpbGFibGUpID8gYXZhaWxhYmxlIDogMCk7XG4gIGNvbnN0IHByZWZlcnJlZCA9IGZpZWxkcy5tYXAoKGZpZWxkKSA9PiBNYXRoLm1heCgwLCBmaWVsZC5wcmVmZXJyZWQpKTtcbiAgY29uc3QgbWluaW11bSA9IGZpZWxkcy5tYXAoKGZpZWxkLCBpbmRleCkgPT4gTWF0aC5tYXgoMCwgTWF0aC5taW4ocHJlZmVycmVkW2luZGV4XSwgZmllbGQubWluaW11bSkpKTtcbiAgY29uc3QgdG90YWwgPSBwcmVmZXJyZWQucmVkdWNlKChzdW0sIHdpZHRoKSA9PiBzdW0gKyB3aWR0aCwgMCk7XG4gIGNvbnN0IGZsb29yID0gbWluaW11bS5yZWR1Y2UoKHN1bSwgd2lkdGgpID0+IHN1bSArIHdpZHRoLCAwKTtcbiAgbGV0IHdpZHRocyA9IHByZWZlcnJlZDtcbiAgaWYgKHRvdGFsID4gYXZhaWxhYmxlKSB7XG4gICAgd2lkdGhzID0gZmxvb3IgPj0gYXZhaWxhYmxlXG4gICAgICA/IG1pbmltdW0ubWFwKCh3aWR0aCkgPT4gZmxvb3IgPyB3aWR0aCAqIGF2YWlsYWJsZSAvIGZsb29yIDogMClcbiAgICAgIDogcHJlZmVycmVkLm1hcCgod2lkdGgsIGluZGV4KSA9PiB3aWR0aCAtICh3aWR0aCAtIG1pbmltdW1baW5kZXhdKSAqICh0b3RhbCAtIGF2YWlsYWJsZSkgLyAodG90YWwgLSBmbG9vcikpO1xuICB9XG4gIGxldCBvZmZzZXQgPSAwO1xuICByZXR1cm4gZmllbGRzLm1hcCgoZmllbGQsIGluZGV4KSA9PiB7XG4gICAgY29uc3QgcmVzdWx0ID0geyBpZDogZmllbGQuaWQsIG9mZnNldCwgd2lkdGg6IHdpZHRoc1tpbmRleF0gfTtcbiAgICBvZmZzZXQgKz0gd2lkdGhzW2luZGV4XTtcbiAgICByZXR1cm4gcmVzdWx0O1xuICB9KTtcbn1cblxuY29uc3QgY29udGV4dHMgPSBuZXcgV2Vha01hcDxEb2N1bWVudCwgeyBjb250ZXh0OiBDYW52YXNSZW5kZXJpbmdDb250ZXh0MkQgfCBudWxsOyBjYWNoZTogTWFwPHN0cmluZywgbnVtYmVyPiB9PigpO1xuXG5leHBvcnQgZnVuY3Rpb24gbWVhc3VyZVRleHQoZG9jdW1lbnQ6IERvY3VtZW50LCB0ZXh0OiBzdHJpbmcsIGZvbnQ6IHN0cmluZyk6IG51bWJlciB7XG4gIGxldCBzdGF0ZSA9IGNvbnRleHRzLmdldChkb2N1bWVudCk7XG4gIGlmICghc3RhdGUpIHtcbiAgICAvLyBUZXN0cyBhbmQgbm9uLWJyb3dzZXIgZW52aXJvbm1lbnRzIGNhbiBsYWNrIGNhbnZhcyBzdXBwb3J0LlxuICAgIGNvbnN0IHN1cHBvcnRlZCA9IHR5cGVvZiBkb2N1bWVudC5kZWZhdWx0Vmlldz8uQ2FudmFzUmVuZGVyaW5nQ29udGV4dDJEID09PSBcImZ1bmN0aW9uXCI7XG4gICAgc3RhdGUgPSB7IGNvbnRleHQ6IHN1cHBvcnRlZCA/IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJjYW52YXNcIikuZ2V0Q29udGV4dChcIjJkXCIpIDogbnVsbCwgY2FjaGU6IG5ldyBNYXAoKSB9O1xuICAgIGNvbnRleHRzLnNldChkb2N1bWVudCwgc3RhdGUpO1xuICB9XG4gIGNvbnN0IGtleSA9IGAke2ZvbnR9XFxuJHt0ZXh0fWA7XG4gIGNvbnN0IGNhY2hlZCA9IHN0YXRlLmNhY2hlLmdldChrZXkpO1xuICBpZiAoY2FjaGVkICE9PSB1bmRlZmluZWQpIHJldHVybiBjYWNoZWQ7XG4gIGxldCB3aWR0aDogbnVtYmVyO1xuICBpZiAoc3RhdGUuY29udGV4dCkge1xuICAgIHN0YXRlLmNvbnRleHQuZm9udCA9IGZvbnQ7XG4gICAgd2lkdGggPSBzdGF0ZS5jb250ZXh0Lm1lYXN1cmVUZXh0KHRleHQpLndpZHRoO1xuICB9IGVsc2Ugd2lkdGggPSB0ZXh0Lmxlbmd0aCAqIChOdW1iZXIucGFyc2VGbG9hdChmb250Lm1hdGNoKC9bXFxkLl0rcHgvKT8uWzBdID8/IFwiMTNcIikgKiAwLjU1KTtcbiAgaWYgKHN0YXRlLmNhY2hlLnNpemUgPiAyMDQ4KSBzdGF0ZS5jYWNoZS5jbGVhcigpO1xuICBzdGF0ZS5jYWNoZS5zZXQoa2V5LCB3aWR0aCk7XG4gIHJldHVybiB3aWR0aDtcbn1cbiIsICJpbXBvcnQgeyBkZWZhdWx0TGF5b3V0LCBkZXRhaWxHcm91cCwgZmllbGRMYWJlbCwgaXNXYXJuaW5nSWNvbiwgbm9ybWFsaXplLCByZXNvbHZlTGF5b3V0LCB0eXBlIFRhYmxlTGF5b3V0IH0gZnJvbSBcIi4vY29uZmlnLnRzXCI7XG5pbXBvcnQgeyBmaXROYXR1cmFsV2lkdGhzLCBtZWFzdXJlVGV4dCB9IGZyb20gXCIuL2F1dG8td2lkdGgudHNcIjtcbnR5cGUgUGxhY2VtZW50ID0geyBjb2x1bW46IHN0cmluZzsgbGluZTogc3RyaW5nOyBoaWRkZW4/OiBib29sZWFuOyBzZWNvbmRhcnk/OiBib29sZWFuOyB3YXJuaW5nPzogYm9vbGVhbiB9O1xuXG4vKiogT25lIGNvbW1vbiBncmlkIGxldHMgdGhlIHR3byBsaW5lcyB1c2UgZGlmZmVyZW50IGNvbHVtbiB3aWR0aHMgd2l0aG91dCBtb3ZpbmcgRE9NIG5vZGVzLiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBsYWNlbWVudHMoaWRzOiBzdHJpbmdbXSwgbGF5b3V0OiBUYWJsZUxheW91dCA9IGRlZmF1bHRMYXlvdXQoaWRzLCBcImFsbFwiKSk6IE1hcDxzdHJpbmcsIFBsYWNlbWVudD4ge1xuICBjb25zdCByZXN1bHQgPSBuZXcgTWFwPHN0cmluZywgUGxhY2VtZW50PigpO1xuICBjb25zdCBmaW5kID0gKC4uLm5hbWVzOiBzdHJpbmdbXSkgPT4gaWRzLmZpbmQoKGlkKSA9PiBuYW1lcy5pbmNsdWRlcyhub3JtYWxpemUoaWQpKSk7XG4gIGNvbnN0IHNlbGVjdGlvbiA9IGZpbmQoXCJzZWxlY3Rpb25cIiwgXCJzZWxlY3RcIiwgXCJjaGVja2JveFwiLCBcImlkMFwiKTtcbiAgY29uc3QgbWVudSA9IGZpbmQoXCJtZW51XCIsIFwiYWN0aW9uc1wiLCBcImNvbnRleHRtZW51XCIpO1xuICBpZiAoc2VsZWN0aW9uKSByZXN1bHQuc2V0KHNlbGVjdGlvbiwgeyBjb2x1bW46IFwiMSAvIDJcIiwgbGluZTogXCIxIC8gM1wiIH0pO1xuICBpZiAobWVudSkgcmVzdWx0LnNldChtZW51LCB7IGNvbHVtbjogXCIxMjIgLyAxMjNcIiwgbGluZTogXCIxIC8gM1wiIH0pO1xuXG4gIGNvbnN0IGZpZWxkcyA9IHJlc29sdmVMYXlvdXQoaWRzLCBsYXlvdXQpLmZpZWxkcztcbiAgZnVuY3Rpb24gZGlzdHJpYnV0ZShpdGVtczogeyBpZDogc3RyaW5nOyB3aWR0aDogbnVtYmVyIH1bXSwgbGluZTogc3RyaW5nLCBzZWNvbmRhcnkgPSBmYWxzZSkge1xuICAgIGNvbnN0IHRvdGFsID0gaXRlbXMucmVkdWNlKChzdW0sIGl0ZW0pID0+IHN1bSArIGl0ZW0ud2lkdGgsIDApO1xuICAgIGxldCB1c2VkID0gMDtcbiAgICBsZXQgc3RhcnQgPSAyO1xuICAgIGl0ZW1zLmZvckVhY2goKGl0ZW0sIGluZGV4KSA9PiB7XG4gICAgICB1c2VkICs9IGl0ZW0ud2lkdGg7XG4gICAgICBjb25zdCBlbmQgPSBpbmRleCA9PT0gaXRlbXMubGVuZ3RoIC0gMSA/IDEyMiA6IDIgKyBNYXRoLnJvdW5kKDEyMCAqIHVzZWQgLyB0b3RhbCk7XG4gICAgICByZXN1bHQuc2V0KGl0ZW0uaWQsIHsgY29sdW1uOiBgJHtzdGFydH0gLyAke2VuZH1gLCBsaW5lLCAuLi4oc2Vjb25kYXJ5ID8geyBzZWNvbmRhcnk6IHRydWUgfSA6IHt9KSB9KTtcbiAgICAgIHN0YXJ0ID0gZW5kO1xuICAgIH0pO1xuICB9XG4gIGRpc3RyaWJ1dGUoZmllbGRzLmZpbHRlcigoZmllbGQpID0+IGZpZWxkLmxpbmUgPT09IFwicHJpbWFyeVwiICYmICFpc1dhcm5pbmdJY29uKGZpZWxkLmlkKSksIFwiMSAvIDJcIik7XG4gIGRpc3RyaWJ1dGUoZmllbGRzLmZpbHRlcigoZmllbGQpID0+IGZpZWxkLmxpbmUgPT09IFwic2Vjb25kYXJ5XCIgJiYgIWlzV2FybmluZ0ljb24oZmllbGQuaWQpKSwgXCIyIC8gM1wiLCB0cnVlKTtcbiAgZm9yIChjb25zdCBmaWVsZCBvZiBmaWVsZHMuZmlsdGVyKChmaWVsZCkgPT4gZmllbGQubGluZSA9PT0gXCJoaWRkZW5cIikpIHtcbiAgICByZXN1bHQuc2V0KGZpZWxkLmlkLCB7IGNvbHVtbjogXCIyIC8gMTIyXCIsIGxpbmU6IFwiMiAvIDNcIiwgaGlkZGVuOiB0cnVlIH0pO1xuICB9XG4gIGNvbnN0IG5hbWUgPSBmaWVsZHMuZmluZCgoZmllbGQpID0+IG5vcm1hbGl6ZShmaWVsZC5pZCkgPT09IFwibmFtZVwiKTtcbiAgY29uc3Qgd2FybmluZyA9IGZpZWxkcy5maW5kKChmaWVsZCkgPT4gaXNXYXJuaW5nSWNvbihmaWVsZC5pZCkgJiYgZmllbGQubGluZSAhPT0gXCJoaWRkZW5cIik7XG4gIGNvbnN0IG5hbWVQb3NpdGlvbiA9IG5hbWUgJiYgcmVzdWx0LmdldChuYW1lLmlkKTtcbiAgaWYgKHdhcm5pbmcgJiYgbmFtZVBvc2l0aW9uKSByZXN1bHQuc2V0KHdhcm5pbmcuaWQsIHsgLi4ubmFtZVBvc2l0aW9uLCB3YXJuaW5nOiB0cnVlIH0pO1xuICByZXR1cm4gcmVzdWx0O1xufVxuXG5jb25zdCByb3dBdHRyaWJ1dGUgPSBcImRhdGEtbHdyLXJvd1wiO1xuY29uc3QgY2VsbEF0dHJpYnV0ZSA9IFwiZGF0YS1sd3ItY2VsbFwiO1xuXG5leHBvcnQgZnVuY3Rpb24gbGF5b3V0Um93KHJvdzogSFRNTEVsZW1lbnQsIGhlYWRlciA9IGZhbHNlLCBsYXlvdXQ/OiBUYWJsZUxheW91dCwgbGFiZWxzPzogTWFwPHN0cmluZywgc3RyaW5nPiwgY29udGV4dDogeyBpbmRleD86IG51bWJlcjsgYXZhaWxhYmxlV2lkdGg/OiBudW1iZXIgfSA9IHt9KTogdm9pZCB7XG4gIGNvbnN0IGNlbGxzID0gQXJyYXkuZnJvbShyb3cuY2hpbGRyZW4pLmZpbHRlcigoY2hpbGQpOiBjaGlsZCBpcyBIVE1MRWxlbWVudCA9PlxuICAgIGNoaWxkIGluc3RhbmNlb2Ygcm93Lm93bmVyRG9jdW1lbnQuZGVmYXVsdFZpZXchLkhUTUxFbGVtZW50KTtcbiAgY29uc3QgZ2V0SWQgPSAoY2VsbDogSFRNTEVsZW1lbnQpID0+XG4gICAgY2VsbC5nZXRBdHRyaWJ1dGUoaGVhZGVyID8gXCJkYXRhLWNvbHVtbi1pZC10ZXN0XCIgOiBcImRhdGEtY29sdW1uLWlkXCIpID8/XG4gICAgKGhlYWRlciAmJiBjZWxsLnF1ZXJ5U2VsZWN0b3IoXCJbZGF0YS1zZWxlY3QtYWxsLWNoZWNrYm94LXRlc3RdXCIpID8gXCJpZC0wXCIgOiBcIlwiKTtcbiAgY29uc3QgaWRzID0gY2VsbHMubWFwKGdldElkKTtcbiAgLy8gUmVmdXNlIGFuIHVua25vd24gc3RydWN0dXJlIHJhdGhlciB0aGFuIG1pc3BsYWNpbmcgY29udHJvbHMuXG4gIGlmIChpZHMuc29tZSgoaWQpID0+ICFpZCkgfHwgIWlkcy5zb21lKChpZCkgPT4gbm9ybWFsaXplKGlkKSA9PT0gXCJuYW1lXCIpKSByZXR1cm47XG4gIGNvbnN0IHBvc2l0aW9ucyA9IHBsYWNlbWVudHMoaWRzLCBsYXlvdXQpO1xuICBjb25zdCByZXNvbHZlZCA9IHJlc29sdmVMYXlvdXQoaWRzLCBsYXlvdXQgPz8gZGVmYXVsdExheW91dChpZHMsIFwiYWxsXCIpKTtcbiAgY29uc3Qgc2hvd0xhYmVscyA9IEJvb2xlYW4obGF5b3V0Py5sYWJlbHMpIHx8IHJlc29sdmVkLmF1dG9TZWNvbmRhcnk7XG4gIGNvbnN0IGRldGFpbHMgPSByZXNvbHZlZC5maWVsZHMuZmlsdGVyKChmaWVsZCkgPT4gZmllbGQubGluZSA9PT0gXCJzZWNvbmRhcnlcIiAmJiAhaXNXYXJuaW5nSWNvbihmaWVsZC5pZCkpO1xuICBjb25zdCBncm91cFN0YXJ0cyA9IG5ldyBTZXQoZGV0YWlscy5maWx0ZXIoKGZpZWxkLCBpbmRleCkgPT4gaW5kZXggPiAwICYmIGRldGFpbEdyb3VwKGZpZWxkLmlkKSAhPT0gZGV0YWlsR3JvdXAoZGV0YWlsc1tpbmRleCAtIDFdLmlkKSkubWFwKChmaWVsZCkgPT4gZmllbGQuaWQpKTtcbiAgY29uc3Qgd2FybmluZ0NlbGwgPSBjZWxscy5maW5kKChjZWxsKSA9PiBpc1dhcm5pbmdJY29uKGdldElkKGNlbGwpKSk7XG4gIGNvbnN0IHdhcm5pbmdWaXNpYmxlID0gd2FybmluZ0NlbGwgJiYgIXBvc2l0aW9ucy5nZXQoZ2V0SWQod2FybmluZ0NlbGwpKT8uaGlkZGVuICYmIEJvb2xlYW4od2FybmluZ0NlbGwucXVlcnlTZWxlY3RvcihcImJ1dHRvbiwgc3ZnLCBpbnB1dFwiKSB8fCB3YXJuaW5nQ2VsbC50ZXh0Q29udGVudD8udHJpbSgpKTtcbiAgcm93LnNldEF0dHJpYnV0ZShyb3dBdHRyaWJ1dGUsIGhlYWRlciA/IFwiaGVhZGVyXCIgOiBcImRhdGFcIik7XG4gIHJvdy5zZXRBdHRyaWJ1dGUoXCJkYXRhLWx3ci1sYWJlbHNcIiwgc2hvd0xhYmVscyA/IFwidHJ1ZVwiIDogXCJmYWxzZVwiKTtcbiAgcm93LnNldEF0dHJpYnV0ZShcImRhdGEtbHdyLXN0cmlwZVwiLCAoY29udGV4dC5pbmRleCA/PyAwKSAlIDIgPyBcIm9kZFwiIDogXCJldmVuXCIpO1xuICBmb3IgKGNvbnN0IGNlbGwgb2YgY2VsbHMpIHtcbiAgICBjb25zdCBwbGFjZW1lbnQgPSBwb3NpdGlvbnMuZ2V0KGdldElkKGNlbGwpKTtcbiAgICBpZiAoIXBsYWNlbWVudCkgY29udGludWU7XG4gICAgY2VsbC5zZXRBdHRyaWJ1dGUoY2VsbEF0dHJpYnV0ZSwgXCJcIik7XG4gICAgY2VsbC5zdHlsZS5zZXRQcm9wZXJ0eShcIi0tbHdyLWNvbHVtblwiLCBwbGFjZW1lbnQuY29sdW1uKTtcbiAgICBjZWxsLnN0eWxlLnNldFByb3BlcnR5KFwiLS1sd3ItbGluZVwiLCBwbGFjZW1lbnQubGluZSk7XG4gICAgY2VsbC50b2dnbGVBdHRyaWJ1dGUoXCJkYXRhLWx3ci1oaWRkZW5cIiwgcGxhY2VtZW50LmhpZGRlbiA9PT0gdHJ1ZSk7XG4gICAgY2VsbC50b2dnbGVBdHRyaWJ1dGUoXCJkYXRhLWx3ci1zZWNvbmRhcnlcIiwgcGxhY2VtZW50LnNlY29uZGFyeSA9PT0gdHJ1ZSk7XG4gICAgY2VsbC50b2dnbGVBdHRyaWJ1dGUoXCJkYXRhLWx3ci1uYW1lXCIsIG5vcm1hbGl6ZShnZXRJZChjZWxsKSkgPT09IFwibmFtZVwiKTtcbiAgICBjZWxsLnRvZ2dsZUF0dHJpYnV0ZShcImRhdGEtbHdyLXN0YXR1c1wiLCBbXCJzdGF0dXNcIiwgXCJwaGFzZVwiXS5pbmNsdWRlcyhub3JtYWxpemUoZ2V0SWQoY2VsbCkpKSk7XG4gICAgaWYgKGNlbGwuaGFzQXR0cmlidXRlKFwiZGF0YS1sd3Itc3RhdHVzXCIpKSB7XG4gICAgICBjb25zdCB2YWx1ZSA9IGNlbGwucXVlcnlTZWxlY3RvcihcInNwYW4sIGFcIikgPz8gY2VsbC5maXJzdEVsZW1lbnRDaGlsZDtcbiAgICAgIGlmICh2YWx1ZSkgY2VsbC5zdHlsZS5zZXRQcm9wZXJ0eShcIi0tbHdyLXN0YXR1cy1jb2xvclwiLCByb3cub3duZXJEb2N1bWVudC5kZWZhdWx0VmlldyEuZ2V0Q29tcHV0ZWRTdHlsZSh2YWx1ZSkuY29sb3IpO1xuICAgIH1cbiAgICBjZWxsLnRvZ2dsZUF0dHJpYnV0ZShcImRhdGEtbHdyLWdyb3VwLXN0YXJ0XCIsIGdyb3VwU3RhcnRzLmhhcyhnZXRJZChjZWxsKSkpO1xuICAgIGNlbGwudG9nZ2xlQXR0cmlidXRlKFwiZGF0YS1sd3Itd2FybmluZ1wiLCBwbGFjZW1lbnQud2FybmluZyA9PT0gdHJ1ZSk7XG4gICAgY2VsbC50b2dnbGVBdHRyaWJ1dGUoXCJkYXRhLWx3ci1lbXB0eS1pY29uXCIsIHBsYWNlbWVudC53YXJuaW5nID09PSB0cnVlICYmICF3YXJuaW5nVmlzaWJsZSk7XG4gICAgY2VsbC50b2dnbGVBdHRyaWJ1dGUoXCJkYXRhLWx3ci1oYXMtd2FybmluZ1wiLCBub3JtYWxpemUoZ2V0SWQoY2VsbCkpID09PSBcIm5hbWVcIiAmJiBCb29sZWFuKHdhcm5pbmdWaXNpYmxlKSk7XG4gICAgY2VsbC50b2dnbGVBdHRyaWJ1dGUoXCJkYXRhLWx3ci1hdXRvXCIsICFoZWFkZXIgJiYgcGxhY2VtZW50LnNlY29uZGFyeSA9PT0gdHJ1ZSAmJiByZXNvbHZlZC5hdXRvU2Vjb25kYXJ5KTtcbiAgICBjZWxsLnNldEF0dHJpYnV0ZShcImRhdGEtbHdyLWxhYmVsXCIsIGlzV2FybmluZ0ljb24oZ2V0SWQoY2VsbCkpID8gXCJcIiA6IGxhYmVscz8uZ2V0KGdldElkKGNlbGwpKSA/PyBmaWVsZExhYmVsKGdldElkKGNlbGwpKSk7XG4gICAgY2VsbC5zdHlsZS5yZW1vdmVQcm9wZXJ0eShcIi0tbHdyLW9mZnNldFwiKTtcbiAgICBjZWxsLnN0eWxlLnJlbW92ZVByb3BlcnR5KFwiLS1sd3ItbmF0dXJhbC13aWR0aFwiKTtcbiAgfVxuICBpZiAoIWhlYWRlciAmJiByZXNvbHZlZC5hdXRvU2Vjb25kYXJ5KSB7XG4gICAgY29uc3QgYXZhaWxhYmxlID0gTWF0aC5tYXgoMCwgKGNvbnRleHQuYXZhaWxhYmxlV2lkdGggPz8gcm93LmNsaWVudFdpZHRoKSAtIDgwKTtcbiAgICBjb25zdCBuYXR1cmFsID0gZGV0YWlscy5tYXAoKGZpZWxkKSA9PiB7XG4gICAgICBjb25zdCBjZWxsID0gY2VsbHMuZmluZCgoY2FuZGlkYXRlKSA9PiBnZXRJZChjYW5kaWRhdGUpID09PSBmaWVsZC5pZCkhO1xuICAgICAgY29uc3QgdmFsdWUgPSBjZWxsLnRleHRDb250ZW50Py50cmltKCkgPz8gXCJcIjtcbiAgICAgIGNvbnN0IHN0eWxlID0gcm93Lm93bmVyRG9jdW1lbnQuZGVmYXVsdFZpZXchLmdldENvbXB1dGVkU3R5bGUoY2VsbCk7XG4gICAgICBjb25zdCBmb250U2l6ZSA9IE51bWJlci5wYXJzZUZsb2F0KHN0eWxlLmZvbnRTaXplKSB8fCAxMztcbiAgICAgIGNvbnN0IGZvbnQgPSBgJHtzdHlsZS5mb250V2VpZ2h0IHx8IFwiNDAwXCJ9ICR7Zm9udFNpemV9cHggJHtzdHlsZS5mb250RmFtaWx5IHx8IFwic3lzdGVtLXVpXCJ9YDtcbiAgICAgIGNvbnN0IGxhYmVsID0gY2VsbC5nZXRBdHRyaWJ1dGUoXCJkYXRhLWx3ci1sYWJlbFwiKSA/PyBcIlwiO1xuICAgICAgY29uc3QgbGFiZWxXaWR0aCA9IHNob3dMYWJlbHMgPyBtZWFzdXJlVGV4dChyb3cub3duZXJEb2N1bWVudCwgbGFiZWwsIGA0MDAgJHtmb250U2l6ZSAqIDAuODV9cHggJHtzdHlsZS5mb250RmFtaWx5IHx8IFwic3lzdGVtLXVpXCJ9YCkgKyA2IDogMDtcbiAgICAgIGNvbnN0IGNvbnRyb2xzID0gdmFsdWUgPyAwIDogTWF0aC5tYXgoMTYsIGNlbGwucXVlcnlTZWxlY3RvckFsbChcInN2ZywgaW5wdXQsIGJ1dHRvblwiKS5sZW5ndGggKiAxOCk7XG4gICAgICBjb25zdCBwYWRkaW5nID0gMTIgKyAoZ3JvdXBTdGFydHMuaGFzKGZpZWxkLmlkKSA/IDEzIDogMCkgKyAoY2VsbC5oYXNBdHRyaWJ1dGUoXCJkYXRhLWx3ci1oYXMtd2FybmluZ1wiKSA/IDI2IDogMCk7XG4gICAgICBjb25zdCBwcmVmZXJyZWQgPSBNYXRoLmNlaWwobWVhc3VyZVRleHQocm93Lm93bmVyRG9jdW1lbnQsIHZhbHVlLCBmb250KSArIGNvbnRyb2xzICsgbGFiZWxXaWR0aCArIHBhZGRpbmcgKyAyKTtcbiAgICAgIHJldHVybiB7IGlkOiBmaWVsZC5pZCwgcHJlZmVycmVkLCBtaW5pbXVtOiBNYXRoLm1pbihwcmVmZXJyZWQsIGxhYmVsV2lkdGggKyBwYWRkaW5nICsgNDApIH07XG4gICAgfSk7XG4gICAgZm9yIChjb25zdCBmaXR0ZWQgb2YgZml0TmF0dXJhbFdpZHRocyhuYXR1cmFsLCBhdmFpbGFibGUpKSB7XG4gICAgICBjb25zdCBjZWxsID0gY2VsbHMuZmluZCgoY2FuZGlkYXRlKSA9PiBnZXRJZChjYW5kaWRhdGUpID09PSBmaXR0ZWQuaWQpITtcbiAgICAgIGNlbGwuc3R5bGUuc2V0UHJvcGVydHkoXCItLWx3ci1vZmZzZXRcIiwgYCR7Zml0dGVkLm9mZnNldC50b0ZpeGVkKDIpfXB4YCk7XG4gICAgICBjZWxsLnN0eWxlLnNldFByb3BlcnR5KFwiLS1sd3ItbmF0dXJhbC13aWR0aFwiLCBgJHtmaXR0ZWQud2lkdGgudG9GaXhlZCgyKX1weGApO1xuICAgICAgaWYgKGNlbGwuaGFzQXR0cmlidXRlKFwiZGF0YS1sd3ItbmFtZVwiKSAmJiB3YXJuaW5nQ2VsbCAmJiB3YXJuaW5nVmlzaWJsZSkge1xuICAgICAgICB3YXJuaW5nQ2VsbC5zZXRBdHRyaWJ1dGUoXCJkYXRhLWx3ci1hdXRvXCIsIFwiXCIpO1xuICAgICAgICB3YXJuaW5nQ2VsbC5zdHlsZS5zZXRQcm9wZXJ0eShcIi0tbHdyLW9mZnNldFwiLCBgJHtmaXR0ZWQub2Zmc2V0LnRvRml4ZWQoMil9cHhgKTtcbiAgICAgICAgd2FybmluZ0NlbGwuc3R5bGUuc2V0UHJvcGVydHkoXCItLWx3ci1uYXR1cmFsLXdpZHRoXCIsIFwiMjRweFwiKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGNsZWFyTGF5b3V0KHJvb3Q6IEhUTUxFbGVtZW50KTogdm9pZCB7XG4gIGZvciAoY29uc3Qgcm93IG9mIHJvb3QucXVlcnlTZWxlY3RvckFsbChgWyR7cm93QXR0cmlidXRlfV1gKSkge1xuICAgIHJvdy5yZW1vdmVBdHRyaWJ1dGUocm93QXR0cmlidXRlKTtcbiAgICByb3cucmVtb3ZlQXR0cmlidXRlKFwiZGF0YS1sd3ItbGFiZWxzXCIpO1xuICAgIHJvdy5yZW1vdmVBdHRyaWJ1dGUoXCJkYXRhLWx3ci1zdHJpcGVcIik7XG4gIH1cbiAgZm9yIChjb25zdCBjZWxsIG9mIHJvb3QucXVlcnlTZWxlY3RvckFsbDxIVE1MRWxlbWVudD4oYFske2NlbGxBdHRyaWJ1dGV9XWApKSB7XG4gICAgY2VsbC5yZW1vdmVBdHRyaWJ1dGUoY2VsbEF0dHJpYnV0ZSk7XG4gICAgZm9yIChjb25zdCBhdHRyaWJ1dGUgb2YgW1wiZGF0YS1sd3ItaGlkZGVuXCIsIFwiZGF0YS1sd3Itc2Vjb25kYXJ5XCIsIFwiZGF0YS1sd3ItbmFtZVwiLCBcImRhdGEtbHdyLWxhYmVsXCIsIFwiZGF0YS1sd3ItYXV0b1wiLCBcImRhdGEtbHdyLWdyb3VwLXN0YXJ0XCIsIFwiZGF0YS1sd3Itc3RhdHVzXCIsIFwiZGF0YS1sd3Itd2FybmluZ1wiLCBcImRhdGEtbHdyLWVtcHR5LWljb25cIiwgXCJkYXRhLWx3ci1oYXMtd2FybmluZ1wiXSkgY2VsbC5yZW1vdmVBdHRyaWJ1dGUoYXR0cmlidXRlKTtcbiAgICBjZWxsLnN0eWxlLnJlbW92ZVByb3BlcnR5KFwiLS1sd3ItY29sdW1uXCIpO1xuICAgIGNlbGwuc3R5bGUucmVtb3ZlUHJvcGVydHkoXCItLWx3ci1saW5lXCIpO1xuICAgIGNlbGwuc3R5bGUucmVtb3ZlUHJvcGVydHkoXCItLWx3ci1vZmZzZXRcIik7XG4gICAgY2VsbC5zdHlsZS5yZW1vdmVQcm9wZXJ0eShcIi0tbHdyLW5hdHVyYWwtd2lkdGhcIik7XG4gICAgY2VsbC5zdHlsZS5yZW1vdmVQcm9wZXJ0eShcIi0tbHdyLXN0YXR1cy1jb2xvclwiKTtcbiAgfVxufVxuXG5leHBvcnQgY29uc3QgbGF5b3V0Q3NzID0gYFxuW2RhdGEtbHdyLXJvd10ge1xuICBkaXNwbGF5OiBncmlkICFpbXBvcnRhbnQ7XG4gIGdyaWQtdGVtcGxhdGUtY29sdW1uczogNDBweCByZXBlYXQoMTIwLCBtaW5tYXgoMCwgMWZyKSkgNDBweCAhaW1wb3J0YW50O1xuICBncmlkLXRlbXBsYXRlLXJvd3M6IHJlcGVhdCgyLCBtaW5tYXgoMCwgMWZyKSkgIWltcG9ydGFudDtcbiAgd2lkdGg6IDEwMCUgIWltcG9ydGFudDtcbiAgbWluLXdpZHRoOiAwICFpbXBvcnRhbnQ7XG4gIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XG59XG5bZGF0YS1sd3Itcm93PVwiaGVhZGVyXCJdIHsgaGVpZ2h0OiA1NnB4ICFpbXBvcnRhbnQ7IHRyYW5zZm9ybTogbm9uZSAhaW1wb3J0YW50OyB9XG5bZGF0YS1sd3Itcm93PVwiaGVhZGVyXCJdW2RhdGEtbHdyLWxhYmVscz1cInRydWVcIl0geyBoZWlnaHQ6IDMwcHggIWltcG9ydGFudDsgfVxuW2RhdGEtbHdyLXJvdz1cImhlYWRlclwiXVtkYXRhLWx3ci1sYWJlbHM9XCJ0cnVlXCJdIFtkYXRhLWx3ci1jZWxsXSB7IGdyaWQtcm93OiAxIC8gMyAhaW1wb3J0YW50OyB9XG5bZGF0YS1sd3Itcm93PVwiaGVhZGVyXCJdW2RhdGEtbHdyLWxhYmVscz1cInRydWVcIl0gW2RhdGEtbHdyLXNlY29uZGFyeV0geyBkaXNwbGF5OiBub25lICFpbXBvcnRhbnQ7IH1cbltkYXRhLWx3ci1yb3c9XCJoZWFkZXJcIl0gW2RhdGEtbHdyLWdyb3VwLXN0YXJ0XSB7IGJvcmRlcjogMDsgfVxuW2RhdGEtdGFibGUtaGVhZC10ZXN0XTpoYXMoW2RhdGEtbHdyLXJvd10pIHsgcGFkZGluZy1pbmxpbmU6IDAgIWltcG9ydGFudDsgfVxuW2RhdGEtbHdyLWNlbGxdIHtcbiAgZ3JpZC1jb2x1bW46IHZhcigtLWx3ci1jb2x1bW4pICFpbXBvcnRhbnQ7XG4gIGdyaWQtcm93OiB2YXIoLS1sd3ItbGluZSkgIWltcG9ydGFudDtcbiAgd2lkdGg6IGF1dG8gIWltcG9ydGFudDtcbiAgbWluLXdpZHRoOiAwICFpbXBvcnRhbnQ7XG4gIG1heC13aWR0aDogbm9uZSAhaW1wb3J0YW50O1xuICBvdmVyZmxvdzogaGlkZGVuO1xuICB3aGl0ZS1zcGFjZTogbm93cmFwICFpbXBvcnRhbnQ7XG4gIGFsaWduLWl0ZW1zOiBjZW50ZXI7XG4gIHBhZGRpbmctaW5saW5lOiA2cHggIWltcG9ydGFudDtcbiAgYm94LXNpemluZzogYm9yZGVyLWJveDtcbn1cbltkYXRhLWx3ci1jZWxsXSA+ICogeyBtaW4td2lkdGg6IDA7IG1heC13aWR0aDogMTAwJTsgfVxuW2RhdGEtbHdyLWhpZGRlbl0geyBkaXNwbGF5OiBub25lICFpbXBvcnRhbnQ7IH1cbltkYXRhLWx3ci1lbXB0eS1pY29uXSB7IGRpc3BsYXk6IG5vbmUgIWltcG9ydGFudDsgfVxuW2RhdGEtbHdyLW5hbWVdIHsgZm9udC13ZWlnaHQ6IDYwMDsgfVxuW2RhdGEtbHdyLWhhcy13YXJuaW5nXSB7IHBhZGRpbmctaW5saW5lLXN0YXJ0OiAzMnB4ICFpbXBvcnRhbnQ7IH1cbltkYXRhLWx3ci13YXJuaW5nXSB7IHdpZHRoOiAyNHB4ICFpbXBvcnRhbnQ7IGp1c3RpZnktc2VsZjogc3RhcnQ7IGFsaWduLXNlbGY6IGNlbnRlcjsgei1pbmRleDogMzsgcGFkZGluZzogMCAhaW1wb3J0YW50OyBtYXJnaW4taW5saW5lLXN0YXJ0OiA2cHg7IH1cbltkYXRhLWx3ci13YXJuaW5nXTo6YmVmb3JlIHsgY29udGVudDogbm9uZSAhaW1wb3J0YW50OyB9XG5bZGF0YS1sd3Itd2FybmluZ10gPiAqIHsgbWF4LXdpZHRoOiAyNHB4OyB9XG5bZGF0YS1sd3Itcm93PVwiZGF0YVwiXSB7XG4gIGJvcmRlci1ib3R0b206IDFweCBzb2xpZCB2YXIoLS1ib3JkZXJDb2xvciwgI2NiZDVlMSk7XG4gIC0tbHdyLXJvdy10aW50OiBjb2xvci1taXgoaW4gc3JnYiwgdmFyKC0tdGV4dENvbG9yUHJpbWFyeSwgIzY0NzQ4YikgMyUsIHRyYW5zcGFyZW50KTtcbiAgYmFja2dyb3VuZC1pbWFnZTogbGluZWFyLWdyYWRpZW50KHRvIGJvdHRvbSwgdmFyKC0tbHdyLXJvdy10aW50KSA1MCUsIHRyYW5zcGFyZW50IDUwJSk7XG59XG5bZGF0YS1sd3Itcm93PVwiZGF0YVwiXVtkYXRhLWx3ci1zdHJpcGU9XCJvZGRcIl06bm90KFtkYXRhLXNlbGVjdGVkPVwidHJ1ZVwiXSk6bm90KDpob3Zlcik6bm90KDpmb2N1cy13aXRoaW4pIHtcbiAgLS1sd3Itcm93LXRpbnQ6IGNvbG9yLW1peChpbiBzcmdiLCB2YXIoLS10ZXh0Q29sb3JQcmltYXJ5LCAjNjQ3NDhiKSA1LjUlLCB0cmFuc3BhcmVudCk7XG59XG5bZGF0YS1sd3Itcm93PVwiZGF0YVwiXSBbZGF0YS1sd3Itc2Vjb25kYXJ5XSB7IGZvbnQtc2l6ZTogLjkyZW07IH1cbltkYXRhLWx3ci1yb3c9XCJkYXRhXCJdIFtkYXRhLWx3ci1ncm91cC1zdGFydF0geyBib3JkZXItaW5saW5lLXN0YXJ0OiAxcHggc29saWQgdmFyKC0tYm9yZGVyQ29sb3IsICNjYmQ1ZTEpOyBwYWRkaW5nLWlubGluZS1zdGFydDogMThweCAhaW1wb3J0YW50OyB9XG5bZGF0YS1sd3Itcm93PVwiZGF0YVwiXSBbZGF0YS1sd3ItaGFzLXdhcm5pbmddIHsgcGFkZGluZy1pbmxpbmUtc3RhcnQ6IDMycHggIWltcG9ydGFudDsgfVxuW2RhdGEtbHdyLWF1dG9dIHtcbiAgcG9zaXRpb246IGFic29sdXRlICFpbXBvcnRhbnQ7IGdyaWQtY29sdW1uOiAyIC8gMTIyICFpbXBvcnRhbnQ7IGdyaWQtcm93OiAyIC8gMyAhaW1wb3J0YW50O1xuICBsZWZ0OiB2YXIoLS1sd3Itb2Zmc2V0KTsgdG9wOiAwOyBib3R0b206IDA7XG4gIHdpZHRoOiB2YXIoLS1sd3ItbmF0dXJhbC13aWR0aCkgIWltcG9ydGFudDsganVzdGlmeS1zZWxmOiBzdGFydDtcbn1cbltkYXRhLWx3ci1yb3c9XCJkYXRhXCJdW2RhdGEtbHdyLWxhYmVscz1cInRydWVcIl0gW2RhdGEtbHdyLXNlY29uZGFyeV06OmJlZm9yZSB7XG4gIGNvbnRlbnQ6IGF0dHIoZGF0YS1sd3ItbGFiZWwpO1xuICBwb3NpdGlvbjogc3RhdGljOyBpbnNldDogYXV0bzsgYm9yZGVyOiAwOyBiYWNrZ3JvdW5kOiBub25lOyBmbGV4LXNocmluazogMDtcbiAgZm9udC1zaXplOiAwLjg1ZW07IGZvbnQtd2VpZ2h0OiA0MDA7IGNvbG9yOiB2YXIoLS10ZXh0Q29sb3JTZWNvbmRhcnksICM3ODgzOTMpO1xuICBtYXJnaW4tcmlnaHQ6IDZweDsgd2lkdGg6IGF1dG87IGhlaWdodDogYXV0bztcbn1cbltkYXRhLWx3ci1jZWxsXSAuVGFibGVDZWxsIHsgcGFkZGluZzogMCAhaW1wb3J0YW50OyB9XG5bZGF0YS1sd3ItY2VsbF1bZGF0YS1sd3Itc3RhdHVzXSA+ICoge1xuICBkaXNwbGF5OiBpbmxpbmUtZmxleDsgYWxpZ24taXRlbXM6IGNlbnRlcjsgcGFkZGluZzogMnB4IDhweCAhaW1wb3J0YW50OyBib3JkZXItcmFkaXVzOiA5OTlweDtcbiAgYmFja2dyb3VuZDogY29sb3ItbWl4KGluIHNyZ2IsIHZhcigtLWx3ci1zdGF0dXMtY29sb3IsIGN1cnJlbnRDb2xvcikgOSUsIHRyYW5zcGFyZW50KTsgZm9udC13ZWlnaHQ6IDUwMDtcbn1cbltkYXRhLWx3ci1jZWxsXSBbZGF0YS1jb2x1bW4tcmVzaXplci10ZXN0XSxcbltkYXRhLWx3ci1jZWxsXSBbY2xhc3MqPVwidGgtbW9kdWxlX19zZXBhcmF0b3JcIl0geyBkaXNwbGF5OiBub25lICFpbXBvcnRhbnQ7IH1cbltkYXRhLWx3ci1jZWxsXSBbY2xhc3MqPVwic2VsZWN0aW9uLWhlYWRlci1tb2R1bGVfX1RvZ2dsZVNlbGVjdEFsbFwiXSB7XG4gIG1hcmdpbjogMCAhaW1wb3J0YW50OyBwYWRkaW5nOiAwICFpbXBvcnRhbnQ7IHdpZHRoOiAxMDAlO1xufVxuLmx3ci10b2dnbGUge1xuICBmb250OiBpbmhlcml0OyBjb2xvcjogaW5oZXJpdDsgYm9yZGVyOiAxcHggc29saWQgdmFyKC0tYm9yZGVyQ29sb3IsICM4ODgpO1xuICBib3JkZXItcmFkaXVzOiA0cHg7IHBhZGRpbmc6IDAgNnB4OyBiYWNrZ3JvdW5kOiB0cmFuc3BhcmVudDsgY3Vyc29yOiBwb2ludGVyO1xufVxuYDtcbiIsICJpbXBvcnQgeyBnZXRJbmplY3RhYmxlMiB9IGZyb20gXCJAazhzbGVucy9pbmplY3RhYmxlXCI7XG5pbXBvcnQgeyBzdGF0dXNCYXJJdGVtSW5qZWN0aW9uVG9rZW4gfSBmcm9tIFwiQGs4c2xlbnMvc3RhdHVzLWJhci1jb250cmFjdHNcIjtcbmltcG9ydCB7IHVzZUVmZmVjdCwgdXNlUmVmLCB1c2VTdGF0ZSB9IGZyb20gXCJyZWFjdFwiO1xuaW1wb3J0IHsgdXNlU3luY0luamVjdCB9IGZyb20gXCJAazhzbGVucy91c2UtaW5qZWN0XCI7XG5pbXBvcnQgeyByZWFjdGlvbiwgcnVuSW5BY3Rpb24gfSBmcm9tIFwibW9ieFwiO1xuaW1wb3J0IHsgc3RhcnRMYXlvdXQsIHR5cGUgTGF5b3V0U3RhdHVzIH0gZnJvbSBcIi4vY29udHJvbGxlci50c1wiO1xuaW1wb3J0IHsgZW1wdHlTZXR0aW5ncywgcmVzb2x2ZUxheW91dCwgc2FuaXRpemVTZXR0aW5ncywgdHlwZSBMYXlvdXRTZXR0aW5ncywgdHlwZSBUYWJsZUNhdGFsb2cgfSBmcm9tIFwiLi9jb25maWcudHNcIjtcbmltcG9ydCB7IGxvYWRTZXR0aW5nc0luamVjdGFibGUsIHR5cGUgU2V0dGluZ3NCb3ggfSBmcm9tIFwiLi9zZXR0aW5ncy5pbmplY3RhYmxlXCI7XG5pbXBvcnQgeyBvcGVuRWRpdG9ySW5qZWN0YWJsZSB9IGZyb20gXCIuL2VkaXRvci1tb2RhbC5pbmplY3RhYmxlXCI7XG5cbmNvbnN0IFRvZ2dsZSA9ICgpID0+IHtcbiAgY29uc3QgbG9hZFNldHRpbmdzID0gdXNlU3luY0luamVjdChsb2FkU2V0dGluZ3NJbmplY3RhYmxlKTtcbiAgY29uc3Qgb3BlbkVkaXRvciA9IHVzZVN5bmNJbmplY3Qob3BlbkVkaXRvckluamVjdGFibGUpO1xuICBjb25zdCBbc2V0dGluZ3MsIHNldFNldHRpbmdzXSA9IHVzZVN0YXRlPExheW91dFNldHRpbmdzPihlbXB0eVNldHRpbmdzKTtcbiAgY29uc3QgW2JveCwgc2V0Qm94XSA9IHVzZVN0YXRlPFNldHRpbmdzQm94IHwgbnVsbD4obnVsbCk7XG4gIGNvbnN0IFtlcnJvciwgc2V0RXJyb3JdID0gdXNlU3RhdGUoXCJcIik7XG4gIGNvbnN0IFtlZGl0aW5nLCBzZXRFZGl0aW5nXSA9IHVzZVN0YXRlKGZhbHNlKTtcbiAgY29uc3QgW3RhYmxlcywgc2V0VGFibGVzXSA9IHVzZVN0YXRlPFRhYmxlQ2F0YWxvZ1tdPihbXSk7XG4gIGNvbnN0IHNldHRpbmdzUmVmID0gdXNlUmVmKHNldHRpbmdzKTtcbiAgY29uc3QgcmVmcmVzaCA9IHVzZVJlZjwoKSA9PiB2b2lkPigoKSA9PiB7fSk7XG4gIGNvbnN0IFtzdGF0dXMsIHNldFN0YXR1c10gPSB1c2VTdGF0ZTxMYXlvdXRTdGF0dXM+KHsgYWN0aXZlOiAwLCB1bnN1cHBvcnRlZDogMCB9KTtcbiAgdXNlRWZmZWN0KCgpID0+IHtcbiAgICBsZXQgY2FuY2VsbGVkID0gZmFsc2U7XG4gICAgbGV0IGRpc3Bvc2U6ICgoKSA9PiB2b2lkKSB8IHVuZGVmaW5lZDtcbiAgICBsb2FkU2V0dGluZ3MoKS50aGVuKCh2YWx1ZSkgPT4ge1xuICAgICAgaWYgKGNhbmNlbGxlZCkgcmV0dXJuO1xuICAgICAgc2V0Qm94KHZhbHVlKTtcbiAgICAgIHNldFNldHRpbmdzKHNhbml0aXplU2V0dGluZ3ModmFsdWUuZ2V0KCkpKTtcbiAgICAgIGRpc3Bvc2UgPSByZWFjdGlvbigoKSA9PiB2YWx1ZS5nZXQoKSwgKG5leHQpID0+IHNldFNldHRpbmdzKHNhbml0aXplU2V0dGluZ3MobmV4dCkpKTtcbiAgICB9KS5jYXRjaCgoKSA9PiB7IGlmICghY2FuY2VsbGVkKSBzZXRFcnJvcihcIkNvdWxkIG5vdCBsb2FkIGxheW91dCBzZXR0aW5ncy4gUmVsb2FkIHRoZSBleHRlbnNpb24gdG8gcmV0cnkuXCIpOyB9KTtcbiAgICByZXR1cm4gKCkgPT4geyBjYW5jZWxsZWQgPSB0cnVlOyBkaXNwb3NlPy4oKTsgfTtcbiAgfSwgW2xvYWRTZXR0aW5nc10pO1xuICB1c2VFZmZlY3QoKCkgPT4ge1xuICAgIHNldHRpbmdzUmVmLmN1cnJlbnQgPSBzZXR0aW5ncztcbiAgICByZWZyZXNoLmN1cnJlbnQoKTtcbiAgfSwgW3NldHRpbmdzXSk7XG4gIHVzZUVmZmVjdCgoKSA9PiB7XG4gICAgaWYgKCFib3ggfHwgIXNldHRpbmdzLmVuYWJsZWQpIHJldHVybjtcbiAgICByZXR1cm4gc3RhcnRMYXlvdXQoZG9jdW1lbnQsIHNldFN0YXR1cywge1xuICAgICAgZ2V0TGF5b3V0OiAodGFibGVJZCwgaWRzKSA9PiByZXNvbHZlTGF5b3V0KGlkcywgc2V0dGluZ3NSZWYuY3VycmVudC50YWJsZXNbdGFibGVJZF0pLFxuICAgICAgb25DYXRhbG9nOiBzZXRUYWJsZXMsXG4gICAgICBzdWJzY3JpYmU6IChjYWxsYmFjaykgPT4geyByZWZyZXNoLmN1cnJlbnQgPSBjYWxsYmFjazsgcmV0dXJuICgpID0+IHsgcmVmcmVzaC5jdXJyZW50ID0gKCkgPT4ge307IH07IH0sXG4gICAgfSk7XG4gIH0sIFtib3gsIHNldHRpbmdzLmVuYWJsZWRdKTtcbiAgZnVuY3Rpb24gc2F2ZSh2YWx1ZTogTGF5b3V0U2V0dGluZ3MpIHtcbiAgICBpZiAoIWJveCkgcmV0dXJuO1xuICAgIHJ1bkluQWN0aW9uKCgpID0+IGJveC5zZXQoc2FuaXRpemVTZXR0aW5ncyh2YWx1ZSkpKTtcbiAgfVxuICBhc3luYyBmdW5jdGlvbiBlZGl0KCkge1xuICAgIGlmIChlZGl0aW5nKSByZXR1cm47XG4gICAgc2V0RWRpdGluZyh0cnVlKTtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgb3BlbkVkaXRvcih0YWJsZXMsIHNldHRpbmdzKTtcbiAgICAgIGlmIChyZXN1bHQpIHNhdmUocmVzdWx0KTtcbiAgICB9IGNhdGNoIHsgc2V0RXJyb3IoXCJDb3VsZCBub3Qgb3BlbiB0aGUgbGF5b3V0IGVkaXRvci4gUmVsb2FkIHRoZSBleHRlbnNpb24gdG8gcmV0cnkuXCIpOyB9XG4gICAgZmluYWxseSB7IHNldEVkaXRpbmcoZmFsc2UpOyB9XG4gIH1cbiAgY29uc3QgbGFiZWwgPSBlcnJvciA/IFwiUm93czogZXJyb3JcIiA6ICFib3ggPyBcIlJvd3M6IGxvYWRpbmdcIiA6ICFzZXR0aW5ncy5lbmFibGVkID8gXCJSb3dzOiBub3JtYWxcIiA6IHN0YXR1cy51bnN1cHBvcnRlZCA/IFwiUm93czogdW5zdXBwb3J0ZWRcIiA6IFwiUm93czogMiBsaW5lc1wiO1xuICByZXR1cm4gKFxuICAgIDxzcGFuIHN0eWxlPXt7IGRpc3BsYXk6IFwiaW5saW5lLWZsZXhcIiwgZ2FwOiBcIjVweFwiIH19PjxidXR0b25cbiAgICAgIGNsYXNzTmFtZT1cImx3ci10b2dnbGVcIlxuICAgICAgdHlwZT1cImJ1dHRvblwiXG4gICAgICBkaXNhYmxlZD17IWJveH1cbiAgICAgIGFyaWEtcHJlc3NlZD17c2V0dGluZ3MuZW5hYmxlZH1cbiAgICAgIHRpdGxlPXtlcnJvciB8fCAoc2V0dGluZ3MuZW5hYmxlZFxuICAgICAgICA/IGBUd28tbGluZSBsYXlvdXQgb24gJHtzdGF0dXMuYWN0aXZlfSB3b3JrbG9hZCB0YWJsZShzKS4gQ2xpY2sgdG8gcmVzdG9yZSBub3JtYWwgcm93cy5gXG4gICAgICAgIDogXCJDbGljayB0byBlbmFibGUgdGhlIHR3by1saW5lIHdvcmtsb2FkIGxheW91dC5cIil9XG4gICAgICBvbkNsaWNrPXsoKSA9PiBzYXZlKHsgLi4uc2V0dGluZ3MsIGVuYWJsZWQ6ICFzZXR0aW5ncy5lbmFibGVkIH0pfVxuICAgID57bGFiZWx9PC9idXR0b24+PGJ1dHRvbiBjbGFzc05hbWU9XCJsd3ItdG9nZ2xlXCIgdHlwZT1cImJ1dHRvblwiIGRpc2FibGVkPXshYm94IHx8ICF0YWJsZXMubGVuZ3RoIHx8IGVkaXRpbmcgfHwgIXNldHRpbmdzLmVuYWJsZWR9XG4gICAgICB0aXRsZT1cIkNvbmZpZ3VyZSBmaWVsZCBwbGFjZW1lbnQsIG9yZGVyLCB3aWR0aHMgYW5kIHZpc2liaWxpdHlcIiBvbkNsaWNrPXtlZGl0fT5MYXlvdXRcdTIwMjY8L2J1dHRvbj48L3NwYW4+XG4gICk7XG59O1xuXG5leHBvcnQgY29uc3Qgd29ya2xvYWRSb3dzVG9nZ2xlID0gZ2V0SW5qZWN0YWJsZTIoe1xuICBpZDogXCJsZW5zLXdvcmtsb2FkLXJvd3MudG9nZ2xlXCIsXG4gIGluc3RhbnRpYXRlOiAoKSA9PiAoKSA9PiAoeyBDb21wb25lbnQ6IFRvZ2dsZSwgcG9zaXRpb246IFwicmlnaHRcIiBhcyBjb25zdCwgb3JkZXJOdW1iZXI6IDkwIH0pLFxuICBpbmplY3Rpb25Ub2tlbjogc3RhdHVzQmFySXRlbUluamVjdGlvblRva2VuLFxufSk7XG4iLCAiLyoqIEV4cGVyaW1lbnRhbCBhZGFwdGVyOiBMZW5zIGN1cnJlbnRseSBleHBvc2VzIG5vIHB1YmxpYyByb3ctaGVpZ2h0IGNvbnRyaWJ1dGlvbi4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgVmlydHVhbGl6ZXJPcHRpb25zIHtcbiAgY291bnQ6IG51bWJlcjtcbiAgZXN0aW1hdGVTaXplOiAoaW5kZXg6IG51bWJlcikgPT4gbnVtYmVyO1xuICBnZXRTY3JvbGxFbGVtZW50OiAoKSA9PiBFbGVtZW50IHwgbnVsbDtcbiAgW2tleTogc3RyaW5nXTogdW5rbm93bjtcbn1cblxuZXhwb3J0IGludGVyZmFjZSBWaXJ0dWFsaXplckxpa2Uge1xuICBvcHRpb25zOiBWaXJ0dWFsaXplck9wdGlvbnM7XG4gIHNldE9wdGlvbnM6IChvcHRpb25zOiBWaXJ0dWFsaXplck9wdGlvbnMpID0+IHZvaWQ7XG4gIG1lYXN1cmU6ICgpID0+IHZvaWQ7XG4gIGdldFZpcnR1YWxJdGVtczogKCkgPT4gdW5rbm93bltdO1xuICBzY3JvbGxUb09mZnNldDogKG9mZnNldDogbnVtYmVyKSA9PiB2b2lkO1xuICBzY3JvbGxPZmZzZXQ6IG51bWJlciB8IG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBkb3VibGVSb3dIZWlnaHRzKFxuICB2aXJ0dWFsaXplcjogVmlydHVhbGl6ZXJMaWtlLFxuICBhZnRlclJlbmRlcjogKGNhbGxiYWNrOiAoKSA9PiB2b2lkKSA9PiB2b2lkID0gKGNhbGxiYWNrKSA9PiBjYWxsYmFjaygpLFxuKTogKCkgPT4gdm9pZCB7XG4gIGNvbnN0IG9yaWdpbmFsU2V0T3B0aW9ucyA9IHZpcnR1YWxpemVyLnNldE9wdGlvbnM7XG4gIGxldCBiYXNlT3B0aW9ucyA9IHZpcnR1YWxpemVyLm9wdGlvbnM7XG4gIGxldCBiYXNlRXN0aW1hdGUgPSBiYXNlT3B0aW9ucy5lc3RpbWF0ZVNpemU7XG4gIGxldCBhY3RpdmUgPSB0cnVlO1xuICBjb25zdCBzY2FsZWRFc3RpbWF0ZSA9IChpbmRleDogbnVtYmVyKSA9PiBiYXNlRXN0aW1hdGUoaW5kZXgpICogMjtcblxuICBjb25zdCBzZXRPcHRpb25zID0gKG9wdGlvbnM6IFZpcnR1YWxpemVyT3B0aW9ucykgPT4ge1xuICAgIGlmIChvcHRpb25zLmVzdGltYXRlU2l6ZSAhPT0gc2NhbGVkRXN0aW1hdGUpIGJhc2VFc3RpbWF0ZSA9IG9wdGlvbnMuZXN0aW1hdGVTaXplO1xuICAgIGJhc2VPcHRpb25zID0geyAuLi5vcHRpb25zLCBlc3RpbWF0ZVNpemU6IGJhc2VFc3RpbWF0ZSB9O1xuICAgIG9yaWdpbmFsU2V0T3B0aW9ucy5jYWxsKHZpcnR1YWxpemVyLCB7IC4uLm9wdGlvbnMsIGVzdGltYXRlU2l6ZTogc2NhbGVkRXN0aW1hdGUgfSk7XG4gIH07XG5cbiAgY29uc3Qgb3JpZ2luYWxPZmZzZXQgPSB2aXJ0dWFsaXplci5zY3JvbGxPZmZzZXQgPz8gMDtcbiAgdmlydHVhbGl6ZXIuc2V0T3B0aW9ucyA9IHNldE9wdGlvbnM7XG4gIHRyeSB7XG4gICAgc2V0T3B0aW9ucyhiYXNlT3B0aW9ucyk7XG4gICAgdmlydHVhbGl6ZXIubWVhc3VyZSgpO1xuICAgIC8vIFRoZSBzY3JvbGwgc3BhY2VyIG11c3QgcmVuZGVyIGl0cyBuZXcgaGVpZ2h0IGJlZm9yZSBhIG5lYXItYm90dG9tIG9mZnNldCBpcyBhcHBsaWVkLlxuICAgIGFmdGVyUmVuZGVyKCgpID0+IHsgaWYgKGFjdGl2ZSkgdmlydHVhbGl6ZXIuc2Nyb2xsVG9PZmZzZXQob3JpZ2luYWxPZmZzZXQgKiAyKTsgfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgdmlydHVhbGl6ZXIuc2V0T3B0aW9ucyA9IG9yaWdpbmFsU2V0T3B0aW9ucztcbiAgICBvcmlnaW5hbFNldE9wdGlvbnMuY2FsbCh2aXJ0dWFsaXplciwgYmFzZU9wdGlvbnMpO1xuICAgIHZpcnR1YWxpemVyLm1lYXN1cmUoKTtcbiAgICB0aHJvdyBlcnJvcjtcbiAgfVxuXG4gIHJldHVybiAoKSA9PiB7XG4gICAgaWYgKCFhY3RpdmUpIHJldHVybjtcbiAgICBhY3RpdmUgPSBmYWxzZTtcbiAgICBjb25zdCBvZmZzZXQgPSAodmlydHVhbGl6ZXIuc2Nyb2xsT2Zmc2V0ID8/IDApIC8gMjtcbiAgICAvLyBEbyBub3Qgb3ZlcndyaXRlIGFuIGFkYXB0ZXIgaW5zdGFsbGVkIGJ5IHNvbWV0aGluZyBlbHNlIGFmdGVyIG91cnMuXG4gICAgaWYgKHZpcnR1YWxpemVyLnNldE9wdGlvbnMgIT09IHNldE9wdGlvbnMpIHJldHVybjtcbiAgICB2aXJ0dWFsaXplci5zZXRPcHRpb25zID0gb3JpZ2luYWxTZXRPcHRpb25zO1xuICAgIG9yaWdpbmFsU2V0T3B0aW9ucy5jYWxsKHZpcnR1YWxpemVyLCBiYXNlT3B0aW9ucyk7XG4gICAgdmlydHVhbGl6ZXIubWVhc3VyZSgpO1xuICAgIGFmdGVyUmVuZGVyKCgpID0+IHtcbiAgICAgIGlmICh2aXJ0dWFsaXplci5zZXRPcHRpb25zID09PSBvcmlnaW5hbFNldE9wdGlvbnMpIHZpcnR1YWxpemVyLnNjcm9sbFRvT2Zmc2V0KG9mZnNldCk7XG4gICAgfSk7XG4gIH07XG59XG5cbnR5cGUgRmliZXIgPSB7XG4gIHJldHVybj86IEZpYmVyIHwgbnVsbDtcbiAgYWx0ZXJuYXRlPzogRmliZXIgfCBudWxsO1xuICBtZW1vaXplZFByb3BzPzogeyB0YWJsZUlkPzogdW5rbm93biB9O1xuICBtZW1vaXplZFN0YXRlPzogSG9vayB8IG51bGw7XG4gIHN0YXRlTm9kZT86IHsgY3VycmVudD86IEZpYmVyIH07XG59O1xudHlwZSBIb29rID0geyBtZW1vaXplZFN0YXRlPzogdW5rbm93bjsgbmV4dD86IEhvb2sgfCBudWxsIH07XG5cbmNvbnN0IHdvcmtsb2FkcyA9IG5ldyBTZXQoW1xuICBcInBvZHNcIiwgXCJkZXBsb3ltZW50c1wiLCBcImRhZW1vbi1zZXRzXCIsIFwic3RhdGVmdWwtc2V0c1wiLCBcInJlcGxpY2Etc2V0c1wiLFxuICBcInJlcGxpY2F0aW9uLWNvbnRyb2xsZXJzXCIsIFwiam9ic1wiLCBcImNyb24tam9ic1wiLFxuXSk7XG5cbmZ1bmN0aW9uIGlzVmlydHVhbGl6ZXIodmFsdWU6IHVua25vd24sIGVsZW1lbnQ6IEVsZW1lbnQpOiB2YWx1ZSBpcyBWaXJ0dWFsaXplckxpa2Uge1xuICBpZiAoIXZhbHVlIHx8IHR5cGVvZiB2YWx1ZSAhPT0gXCJvYmplY3RcIikgcmV0dXJuIGZhbHNlO1xuICBjb25zdCB2ID0gdmFsdWUgYXMgUGFydGlhbDxWaXJ0dWFsaXplckxpa2U+O1xuICByZXR1cm4gdHlwZW9mIHYuc2V0T3B0aW9ucyA9PT0gXCJmdW5jdGlvblwiICYmIHR5cGVvZiB2Lm1lYXN1cmUgPT09IFwiZnVuY3Rpb25cIiAmJlxuICAgIHR5cGVvZiB2LmdldFZpcnR1YWxJdGVtcyA9PT0gXCJmdW5jdGlvblwiICYmIHR5cGVvZiB2LnNjcm9sbFRvT2Zmc2V0ID09PSBcImZ1bmN0aW9uXCIgJiZcbiAgICB0eXBlb2Ygdi5vcHRpb25zPy5lc3RpbWF0ZVNpemUgPT09IFwiZnVuY3Rpb25cIiAmJlxuICAgIHYub3B0aW9ucy5nZXRTY3JvbGxFbGVtZW50KCkgPT09IGVsZW1lbnQ7XG59XG5cbi8qKiBSZWFkcyBvbmx5IHRoZSBvd25pbmcgY29tcG9uZW50J3MgaG9vayBsaXN0LCBuZXZlciB0aGUgd2hvbGUgUmVhY3QgdHJlZS4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmaW5kV29ya2xvYWRWaXJ0dWFsaXplcihlbGVtZW50OiBFbGVtZW50KToge1xuICB3b3JrbG9hZDogYm9vbGVhbjtcbiAgdmlydHVhbGl6ZXI/OiBWaXJ0dWFsaXplckxpa2U7XG4gIHRhYmxlSWQ/OiBzdHJpbmc7XG59IHtcbiAgY29uc3Qga2V5ID0gT2JqZWN0LmtleXMoZWxlbWVudCkuZmluZCgobmFtZSkgPT4gbmFtZS5zdGFydHNXaXRoKFwiX19yZWFjdEZpYmVyJFwiKSk7XG4gIGlmICgha2V5KSByZXR1cm4geyB3b3JrbG9hZDogZmFsc2UgfTtcbiAgY29uc3Qgbm9kZSA9IGVsZW1lbnQgYXMgdW5rbm93biBhcyBSZWNvcmQ8c3RyaW5nLCBGaWJlcj47XG4gIGxldCBmaWJlcjogRmliZXIgfCBudWxsIHwgdW5kZWZpbmVkID0gbm9kZVtrZXldO1xuICAvLyBBIERPTSBub2RlIGNhbiByZXRhaW4gdGhlIHByZXZpb3VzIGZpYmVyIGFmdGVyIFJlYWN0IHN3YXBzIGl0cyBkb3VibGUgYnVmZmVyLlxuICBsZXQgcm9vdCA9IGZpYmVyO1xuICBmb3IgKGxldCBkZXB0aCA9IDA7IHJvb3Q/LnJldHVybiAmJiBkZXB0aCA8IDEyODsgZGVwdGgrKykgcm9vdCA9IHJvb3QucmV0dXJuO1xuICBpZiAocm9vdD8uc3RhdGVOb2RlPy5jdXJyZW50ICYmIHJvb3Quc3RhdGVOb2RlLmN1cnJlbnQgIT09IHJvb3QgJiYgZmliZXI/LmFsdGVybmF0ZSkgZmliZXIgPSBmaWJlci5hbHRlcm5hdGU7XG4gIGZvciAobGV0IGRlcHRoID0gMDsgZmliZXIgJiYgZGVwdGggPCA2NDsgZGVwdGgrKywgZmliZXIgPSBmaWJlci5yZXR1cm4pIHtcbiAgICBjb25zdCB0YWJsZUlkID0gZmliZXIubWVtb2l6ZWRQcm9wcz8udGFibGVJZDtcbiAgICBpZiAodHlwZW9mIHRhYmxlSWQgIT09IFwic3RyaW5nXCIpIGNvbnRpbnVlO1xuICAgIGlmICghd29ya2xvYWRzLmhhcyh0YWJsZUlkKSkgcmV0dXJuIHsgd29ya2xvYWQ6IGZhbHNlIH07XG4gICAgZm9yIChjb25zdCBvd25lciBvZiBbZmliZXIsIGZpYmVyLmFsdGVybmF0ZV0pIHtcbiAgICAgIGxldCBob29rID0gb3duZXI/Lm1lbW9pemVkU3RhdGU7XG4gICAgICBmb3IgKGxldCBjb3VudCA9IDA7IGhvb2sgJiYgY291bnQgPCAxMjg7IGNvdW50KyssIGhvb2sgPSBob29rLm5leHQpIHtcbiAgICAgICAgY29uc3Qgc3RhdGUgPSBob29rLm1lbW9pemVkU3RhdGU7XG4gICAgICAgIGNvbnN0IGNhbmRpZGF0ZXMgPSBbc3RhdGVdO1xuICAgICAgICBpZiAoc3RhdGUgJiYgdHlwZW9mIHN0YXRlID09PSBcIm9iamVjdFwiICYmIFwiY3VycmVudFwiIGluIHN0YXRlKSBjYW5kaWRhdGVzLnB1c2goc3RhdGUuY3VycmVudCk7XG4gICAgICAgIGZvciAoY29uc3QgY2FuZGlkYXRlIG9mIGNhbmRpZGF0ZXMpIHtcbiAgICAgICAgICBpZiAoaXNWaXJ0dWFsaXplcihjYW5kaWRhdGUsIGVsZW1lbnQpKSByZXR1cm4geyB3b3JrbG9hZDogdHJ1ZSwgdmlydHVhbGl6ZXI6IGNhbmRpZGF0ZSwgdGFibGVJZCB9O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB7IHdvcmtsb2FkOiB0cnVlIH07XG4gIH1cbiAgcmV0dXJuIHsgd29ya2xvYWQ6IGZhbHNlIH07XG59XG4iLCAiaW1wb3J0IHsgZG91YmxlUm93SGVpZ2h0cywgZmluZFdvcmtsb2FkVmlydHVhbGl6ZXIsIHR5cGUgVmlydHVhbGl6ZXJMaWtlIH0gZnJvbSBcIi4vdmlydHVhbGl6ZXIudHNcIjtcbmltcG9ydCB7IGNsZWFyTGF5b3V0LCBsYXlvdXRSb3cgfSBmcm9tIFwiLi9sYXlvdXQudHNcIjtcbmltcG9ydCB7IGRlZmF1bHRMYXlvdXQsIGZpZWxkTGFiZWwsIGlzQ29udHJvbCwgdHlwZSBUYWJsZUNhdGFsb2csIHR5cGUgVGFibGVMYXlvdXQgfSBmcm9tIFwiLi9jb25maWcudHNcIjtcblxuZXhwb3J0IHR5cGUgTGF5b3V0U3RhdHVzID0geyBhY3RpdmU6IG51bWJlcjsgdW5zdXBwb3J0ZWQ6IG51bWJlciB9O1xuXG5leHBvcnQgZnVuY3Rpb24gc3RhcnRMYXlvdXQoZG9jdW1lbnQ6IERvY3VtZW50LCByZXBvcnQ6IChzdGF0dXM6IExheW91dFN0YXR1cykgPT4gdm9pZCwgb3B0aW9uczoge1xuICBnZXRMYXlvdXQ/OiAodGFibGVJZDogc3RyaW5nLCBpZHM6IHN0cmluZ1tdKSA9PiBUYWJsZUxheW91dDtcbiAgb25DYXRhbG9nPzogKHRhYmxlczogVGFibGVDYXRhbG9nW10pID0+IHZvaWQ7XG4gIHN1YnNjcmliZT86IChyZWZyZXNoOiAoKSA9PiB2b2lkKSA9PiAoKSA9PiB2b2lkO1xufSA9IHt9KTogKCkgPT4gdm9pZCB7XG4gIGNvbnN0IHdpbmRvdyA9IGRvY3VtZW50LmRlZmF1bHRWaWV3ITtcbiAgY29uc3QgYXR0YWNoZWQgPSBuZXcgTWFwPEhUTUxFbGVtZW50LCB7IHRhYmxlSWQ6IHN0cmluZzsgdmlydHVhbGl6ZXI6IFZpcnR1YWxpemVyTGlrZTsgcmVzdG9yZTogKCkgPT4gdm9pZDsgcm9vdDogSFRNTEVsZW1lbnQgfT4oKTtcbiAgbGV0IGZyYW1lID0gMDtcbiAgbGV0IHN0b3BwZWQgPSBmYWxzZTtcbiAgbGV0IGxhc3RSZXBvcnQgPSBcIlwiO1xuICBsZXQgbGFzdENhdGFsb2cgPSBcIlwiO1xuICBjb25zdCByZXNpemVPYnNlcnZlciA9IHR5cGVvZiB3aW5kb3cuUmVzaXplT2JzZXJ2ZXIgPT09IFwiZnVuY3Rpb25cIiA/IG5ldyB3aW5kb3cuUmVzaXplT2JzZXJ2ZXIoKCkgPT4gc2NoZWR1bGUoKSkgOiB1bmRlZmluZWQ7XG5cbiAgZnVuY3Rpb24gc2NhbigpIHtcbiAgICBmcmFtZSA9IDA7XG4gICAgaWYgKHN0b3BwZWQpIHJldHVybjtcbiAgICBmb3IgKGNvbnN0IFtlbGVtZW50LCBlbnRyeV0gb2YgYXR0YWNoZWQpIHtcbiAgICAgIGlmICghZWxlbWVudC5pc0Nvbm5lY3RlZCkge1xuICAgICAgICByZXNpemVPYnNlcnZlcj8udW5vYnNlcnZlKGVsZW1lbnQpO1xuICAgICAgICBlbnRyeS5yZXN0b3JlKCk7XG4gICAgICAgIGNsZWFyTGF5b3V0KGVudHJ5LnJvb3QpO1xuICAgICAgICBhdHRhY2hlZC5kZWxldGUoZWxlbWVudCk7XG4gICAgICB9XG4gICAgfVxuICAgIGxldCB1bnN1cHBvcnRlZCA9IDA7XG4gICAgY29uc3QgY2F0YWxvZ3MgPSBuZXcgTWFwPHN0cmluZywgVGFibGVDYXRhbG9nPigpO1xuICAgIGZvciAoY29uc3QgZWxlbWVudCBvZiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsPEhUTUxFbGVtZW50PihcIltkYXRhLXRhYmxlLWNvbnRhaW5lci10ZXN0XVwiKSkge1xuICAgICAgbGV0IGVudHJ5ID0gYXR0YWNoZWQuZ2V0KGVsZW1lbnQpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgZm91bmQgPSBmaW5kV29ya2xvYWRWaXJ0dWFsaXplcihlbGVtZW50KTtcbiAgICAgICAgaWYgKGVudHJ5ICYmICghZm91bmQud29ya2xvYWQgfHwgZm91bmQudmlydHVhbGl6ZXIgIT09IGVudHJ5LnZpcnR1YWxpemVyKSkge1xuICAgICAgICAgIGVudHJ5LnJlc3RvcmUoKTtcbiAgICAgICAgICBjbGVhckxheW91dChlbnRyeS5yb290KTtcbiAgICAgICAgICBhdHRhY2hlZC5kZWxldGUoZWxlbWVudCk7XG4gICAgICAgICAgcmVzaXplT2JzZXJ2ZXI/LnVub2JzZXJ2ZShlbGVtZW50KTtcbiAgICAgICAgICBlbnRyeSA9IHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIWVudHJ5KSB7XG4gICAgICAgICAgaWYgKCFmb3VuZC53b3JrbG9hZCkgY29udGludWU7XG4gICAgICAgICAgaWYgKCFmb3VuZC52aXJ0dWFsaXplcikgeyB1bnN1cHBvcnRlZCsrOyBjb250aW51ZTsgfVxuICAgICAgICAgIC8vIEluIHRoaXMgTGVucyBidWlsZCwgdGhlIGhlYWRlciBhbmQgc2Nyb2xsIGJvZHkgYXJlIHNpYmxpbmdzLlxuICAgICAgICAgIGNvbnN0IHJvb3QgPSBlbGVtZW50LnBhcmVudEVsZW1lbnQ7XG4gICAgICAgICAgaWYgKCFyb290Py5xdWVyeVNlbGVjdG9yKFwiW2RhdGEtdGFibGUtaGVhZC10ZXN0XVwiKSkgeyB1bnN1cHBvcnRlZCsrOyBjb250aW51ZTsgfVxuICAgICAgICAgIGVudHJ5ID0ge1xuICAgICAgICAgICAgdGFibGVJZDogZm91bmQudGFibGVJZCEsXG4gICAgICAgICAgICB2aXJ0dWFsaXplcjogZm91bmQudmlydHVhbGl6ZXIsXG4gICAgICAgICAgICByZXN0b3JlOiBkb3VibGVSb3dIZWlnaHRzKGZvdW5kLnZpcnR1YWxpemVyLCAoY2FsbGJhY2spID0+IHsgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShjYWxsYmFjayk7IH0pLFxuICAgICAgICAgICAgcm9vdCxcbiAgICAgICAgICB9O1xuICAgICAgICAgIGF0dGFjaGVkLnNldChlbGVtZW50LCBlbnRyeSk7XG4gICAgICAgICAgcmVzaXplT2JzZXJ2ZXI/Lm9ic2VydmUoZWxlbWVudCk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2gge1xuICAgICAgICAvLyBVbnN1cHBvcnRlZCBob3N0IHNoYXBlcyBhcmUgZGVsaWJlcmF0ZWx5IGxlZnQgdW5jaGFuZ2VkLlxuICAgICAgICB1bnN1cHBvcnRlZCsrO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cbiAgICAgIGNvbnN0IHJvdyA9IGVsZW1lbnQucXVlcnlTZWxlY3RvcjxIVE1MRWxlbWVudD4oXCJbZGF0YS1yb3ddXCIpO1xuICAgICAgY29uc3QgaGVhZGVyQ2VsbHMgPSBBcnJheS5mcm9tKGVudHJ5LnJvb3QucXVlcnlTZWxlY3RvckFsbDxIVE1MRWxlbWVudD4oXCJbZGF0YS10YWJsZS1oZWFkLXRlc3RdIFtkYXRhLWNvbHVtbi1pZC10ZXN0XVwiKSk7XG4gICAgICBjb25zdCBmaWVsZHMgPSBoZWFkZXJDZWxscy5tYXAoKGNlbGwpID0+IHtcbiAgICAgICAgY29uc3QgaWQgPSBjZWxsLmdldEF0dHJpYnV0ZShcImRhdGEtY29sdW1uLWlkLXRlc3RcIikhO1xuICAgICAgICBjb25zdCBzYW1wbGUgPSBBcnJheS5mcm9tKHJvdz8uY2hpbGRyZW4gPz8gW10pLmZpbmQoKGNoaWxkKSA9PiBjaGlsZC5nZXRBdHRyaWJ1dGUoXCJkYXRhLWNvbHVtbi1pZFwiKSA9PT0gaWQpPy50ZXh0Q29udGVudD8udHJpbSgpLnNsaWNlKDAsIDI1Nik7XG4gICAgICAgIHJldHVybiB7IGlkLCBsYWJlbDogY2VsbC50ZXh0Q29udGVudD8udHJpbSgpIHx8IGZpZWxkTGFiZWwoaWQpLCBzYW1wbGUgfTtcbiAgICAgIH0pLmZpbHRlcigoZmllbGQpID0+ICFpc0NvbnRyb2woZmllbGQuaWQpKTtcbiAgICAgIGNhdGFsb2dzLnNldChlbnRyeS50YWJsZUlkLCB7IGlkOiBlbnRyeS50YWJsZUlkLCBmaWVsZHMgfSk7XG4gICAgICBjb25zdCBsYXlvdXQgPSBvcHRpb25zLmdldExheW91dD8uKGVudHJ5LnRhYmxlSWQsIGZpZWxkcy5tYXAoKGZpZWxkKSA9PiBmaWVsZC5pZCkpID8/IGRlZmF1bHRMYXlvdXQoZmllbGRzLm1hcCgoZmllbGQpID0+IGZpZWxkLmlkKSk7XG4gICAgICBjb25zdCBsYWJlbHMgPSBuZXcgTWFwKGZpZWxkcy5tYXAoKGZpZWxkKSA9PiBbZmllbGQuaWQsIGZpZWxkLmxhYmVsXSkpO1xuICAgICAgY29uc3QgdmlydHVhbFJvd3MgPSBlbnRyeS52aXJ0dWFsaXplci5nZXRWaXJ0dWFsSXRlbXMoKSBhcyB7IGluZGV4OiBudW1iZXIgfVtdO1xuICAgICAgQXJyYXkuZnJvbShlbGVtZW50LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KFwiW2RhdGEtcm93XVwiKSkuZm9yRWFjaCgocm93LCBpbmRleCkgPT5cbiAgICAgICAgbGF5b3V0Um93KHJvdywgZmFsc2UsIGxheW91dCwgbGFiZWxzLCB7IGluZGV4OiB2aXJ0dWFsUm93c1tpbmRleF0/LmluZGV4ID8/IGluZGV4LCBhdmFpbGFibGVXaWR0aDogZWxlbWVudC5jbGllbnRXaWR0aCB9KSk7XG4gICAgICBmb3IgKGNvbnN0IGhlYWRlciBvZiBlbnRyeS5yb290LnF1ZXJ5U2VsZWN0b3JBbGw8SFRNTEVsZW1lbnQ+KFwiW2RhdGEtdGFibGUtaGVhZC10ZXN0XSA+IGRpdlwiKSkgbGF5b3V0Um93KGhlYWRlciwgdHJ1ZSwgbGF5b3V0LCBsYWJlbHMpO1xuICAgIH1cbiAgICBjb25zdCBzdGF0dXMgPSB7IGFjdGl2ZTogYXR0YWNoZWQuc2l6ZSwgdW5zdXBwb3J0ZWQgfTtcbiAgICBjb25zdCBzaWduYXR1cmUgPSBKU09OLnN0cmluZ2lmeShzdGF0dXMpO1xuICAgIGlmIChzaWduYXR1cmUgIT09IGxhc3RSZXBvcnQpIHsgbGFzdFJlcG9ydCA9IHNpZ25hdHVyZTsgcmVwb3J0KHN0YXR1cyk7IH1cbiAgICBjb25zdCB0YWJsZXMgPSBbLi4uY2F0YWxvZ3MudmFsdWVzKCldO1xuICAgIGNvbnN0IGNhdGFsb2dTaWduYXR1cmUgPSBKU09OLnN0cmluZ2lmeSh0YWJsZXMubWFwKCh0YWJsZSkgPT4gKHsgLi4udGFibGUsIGZpZWxkczogdGFibGUuZmllbGRzLm1hcCgoeyBpZCwgbGFiZWwgfSkgPT4gKHsgaWQsIGxhYmVsIH0pKSB9KSkpO1xuICAgIGlmIChjYXRhbG9nU2lnbmF0dXJlICE9PSBsYXN0Q2F0YWxvZykgeyBsYXN0Q2F0YWxvZyA9IGNhdGFsb2dTaWduYXR1cmU7IG9wdGlvbnMub25DYXRhbG9nPy4odGFibGVzKTsgfVxuICB9XG5cbiAgZnVuY3Rpb24gc2NoZWR1bGUoKSB7XG4gICAgaWYgKCFzdG9wcGVkICYmICFmcmFtZSkgZnJhbWUgPSB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lKHNjYW4pO1xuICB9XG4gIGNvbnN0IG9ic2VydmVyID0gbmV3IHdpbmRvdy5NdXRhdGlvbk9ic2VydmVyKHNjaGVkdWxlKTtcbiAgb2JzZXJ2ZXIub2JzZXJ2ZShkb2N1bWVudC5ib2R5LCB7IHN1YnRyZWU6IHRydWUsIGNoaWxkTGlzdDogdHJ1ZSwgY2hhcmFjdGVyRGF0YTogdHJ1ZSB9KTtcbiAgZG9jdW1lbnQuZm9udHM/LnJlYWR5LnRoZW4oc2NoZWR1bGUpLmNhdGNoKCgpID0+IHt9KTtcbiAgLy8gQSBmaWJlcidzIGxheW91dCBlZmZlY3QgbWF5IGZpbmlzaCBhZnRlciB0aGUgRE9NIG11dGF0aW9uIHRoYXQgaW50cm9kdWNlZCBpdC5cbiAgY29uc3QgcmV0cnkgPSB3aW5kb3cuc2V0SW50ZXJ2YWwoc2NoZWR1bGUsIDEwMDApO1xuICBjb25zdCB1bnN1YnNjcmliZSA9IG9wdGlvbnMuc3Vic2NyaWJlPy4oc2NoZWR1bGUpO1xuICBzY2hlZHVsZSgpO1xuXG4gIHJldHVybiAoKSA9PiB7XG4gICAgc3RvcHBlZCA9IHRydWU7XG4gICAgb2JzZXJ2ZXIuZGlzY29ubmVjdCgpO1xuICAgIHJlc2l6ZU9ic2VydmVyPy5kaXNjb25uZWN0KCk7XG4gICAgdW5zdWJzY3JpYmU/LigpO1xuICAgIHdpbmRvdy5jbGVhckludGVydmFsKHJldHJ5KTtcbiAgICB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUoZnJhbWUpO1xuICAgIGZvciAoY29uc3QgeyByZXN0b3JlLCByb290IH0gb2YgYXR0YWNoZWQudmFsdWVzKCkpIHtcbiAgICAgIHJlc3RvcmUoKTtcbiAgICAgIGNsZWFyTGF5b3V0KHJvb3QpO1xuICAgIH1cbiAgICBhdHRhY2hlZC5jbGVhcigpO1xuICB9O1xufVxuIiwgImltcG9ydCB7IGdldEluamVjdGFibGUyIH0gZnJvbSBcIkBrOHNsZW5zL2luamVjdGFibGVcIjtcbmltcG9ydCB7IGdldFBlcnNpc3RhYmxlVmFsdWVJbmplY3RhYmxlQnVuY2ggfSBmcm9tIFwiQGs4c2xlbnMvcGVyc2lzdGFibGUtY29udHJhY3RzXCI7XG5pbXBvcnQgeyBlbXB0eVNldHRpbmdzLCB0eXBlIExheW91dFNldHRpbmdzIH0gZnJvbSBcIi4vY29uZmlnLnRzXCI7XG5cbmV4cG9ydCB0eXBlIFNldHRpbmdzQm94ID0geyBnZXQ6ICgpID0+IExheW91dFNldHRpbmdzOyBzZXQ6ICh2YWx1ZTogTGF5b3V0U2V0dGluZ3MpID0+IHZvaWQgfTtcblxuZXhwb3J0IGNvbnN0IGxheW91dFNldHRpbmdzQnVuY2ggPSBnZXRQZXJzaXN0YWJsZVZhbHVlSW5qZWN0YWJsZUJ1bmNoPExheW91dFNldHRpbmdzPigpKHtcbiAgaWQ6IFwibGF5b3V0LXNldHRpbmdzXCIsXG4gIGRlZmF1bHRWYWx1ZTogeyBpbnN0YW50aWF0ZTogKCkgPT4gYXN5bmMgKCkgPT4gZW1wdHlTZXR0aW5ncyB9LFxufSk7XG5cbmV4cG9ydCBjb25zdCBsb2FkU2V0dGluZ3NJbmplY3RhYmxlID0gZ2V0SW5qZWN0YWJsZTIoe1xuICBpZDogXCJsZW5zLXdvcmtsb2FkLXJvd3MubG9hZC1zZXR0aW5nc1wiLFxuICBpbnN0YW50aWF0ZTogKGRpKSA9PiB7XG4gICAgY29uc3QgbG9hZCA9IGRpLmluamVjdChsYXlvdXRTZXR0aW5nc0J1bmNoLnBlcnNpc3RhYmxlKTtcbiAgICBjb25zdCBsb2FkU2V0dGluZ3MgPSAoKTogUHJvbWlzZTxTZXR0aW5nc0JveD4gPT4gbG9hZCgpO1xuICAgIHJldHVybiAoKSA9PiBsb2FkU2V0dGluZ3M7XG4gIH0sXG59KTtcbiIsICJpbXBvcnQgeyBnZXRJbmplY3RhYmxlMiB9IGZyb20gXCJAazhzbGVucy9pbmplY3RhYmxlXCI7XG5pbXBvcnQgeyBnZXRNb2RhbEluamVjdGFibGVCdW5jaCwgZ2V0TW9kYWxLaW5kLCBvcGVuTW9kYWxJbmplY3Rpb25Ub2tlbiwgdXNlUmVzcG9uZEZyb21Nb2RhbCwgdHlwZSBNb2RhbFByb3BzIH0gZnJvbSBcIkBrOHNsZW5zL21vZGFsLWNvbnRyYWN0c1wiO1xuaW1wb3J0IHsgTW9kYWxDb250YWluZXIsIE1vZGFsQ29udGVudCwgTW9kYWxIZWFkZXIgfSBmcm9tIFwiQGs4c2xlbnMvbW9kYWwtY29tcG9uZW50c1wiO1xuaW1wb3J0IHsgTGF5b3V0RWRpdG9yIH0gZnJvbSBcIi4vZWRpdG9yXCI7XG5pbXBvcnQgdHlwZSB7IExheW91dFNldHRpbmdzLCBUYWJsZUNhdGFsb2cgfSBmcm9tIFwiLi9jb25maWcudHNcIjtcblxuY29uc3QgbGF5b3V0RWRpdG9yS2luZCA9IGdldE1vZGFsS2luZDxbdGFibGVzOiBUYWJsZUNhdGFsb2dbXSwgc2V0dGluZ3M6IExheW91dFNldHRpbmdzXSwgTGF5b3V0U2V0dGluZ3MgfCBudWxsPigpKFwibGF5b3V0LWVkaXRvclwiKTtcblxuY29uc3QgRWRpdG9yTW9kYWwgPSAoeyBpbnB1dDogW3RhYmxlcywgc2V0dGluZ3NdIH06IE1vZGFsUHJvcHM8dHlwZW9mIGxheW91dEVkaXRvcktpbmQ+KSA9PiB7XG4gIGNvbnN0IHJlc3BvbmQgPSB1c2VSZXNwb25kRnJvbU1vZGFsKGxheW91dEVkaXRvcktpbmQpO1xuICByZXR1cm4gPE1vZGFsQ29udGFpbmVyICRzdHlsZT17eyB3aWR0aDogXCJtaW4oMTAyMHB4LCBjYWxjKDEwMHZ3IC0gNDhweCkpXCIsIG1heEhlaWdodDogXCJjYWxjKDEwMHZoIC0gNDhweClcIiwgb3ZlcmZsb3dZOiBcImF1dG9cIiB9fT5cbiAgICA8TW9kYWxIZWFkZXIgb25DbG9zZT17KCkgPT4gcmVzcG9uZChudWxsKX0+V29ya2xvYWQgbGF5b3V0PC9Nb2RhbEhlYWRlcj5cbiAgICA8TW9kYWxDb250ZW50PjxMYXlvdXRFZGl0b3IgdGFibGVzPXt0YWJsZXN9IHNldHRpbmdzPXtzZXR0aW5nc30gb25BcHBseT17KHZhbHVlKSA9PiByZXNwb25kKHZhbHVlKX0gb25DYW5jZWw9eygpID0+IHJlc3BvbmQobnVsbCl9IC8+PC9Nb2RhbENvbnRlbnQ+XG4gIDwvTW9kYWxDb250YWluZXI+O1xufTtcblxuZXhwb3J0IGNvbnN0IGxheW91dEVkaXRvck1vZGFsQnVuY2ggPSBnZXRNb2RhbEluamVjdGFibGVCdW5jaCh7IGtpbmQ6IGxheW91dEVkaXRvcktpbmQsIENvbXBvbmVudDogRWRpdG9yTW9kYWwsIG9uQ2xvc2U6ICgpID0+IG51bGwgfSk7XG5cbmV4cG9ydCBjb25zdCBvcGVuRWRpdG9ySW5qZWN0YWJsZSA9IGdldEluamVjdGFibGUyKHtcbiAgaWQ6IFwibGVucy13b3JrbG9hZC1yb3dzLm9wZW4tZWRpdG9yXCIsXG4gIGNvbnN1bXB0aW9uczogW29wZW5Nb2RhbEluamVjdGlvblRva2VuXSxcbiAgaW5zdGFudGlhdGU6IChkaSkgPT4ge1xuICAgIGNvbnN0IG9wZW4gPSBkaS5pbmplY3Qob3Blbk1vZGFsSW5qZWN0aW9uVG9rZW4uZm9yKGxheW91dEVkaXRvcktpbmQpLmZvcihkaS5zY29wZUlkcykpKCk7XG4gICAgcmV0dXJuICgpID0+IG9wZW47XG4gIH0sXG59KTtcbiIsICJpbXBvcnQgeyB1c2VTdGF0ZSwgdHlwZSBEcmFnRXZlbnQgfSBmcm9tIFwicmVhY3RcIjtcbmltcG9ydCB7IGRlZmF1bHRMYXlvdXQsIGRldGFpbEdyb3VwLCBpc1dhcm5pbmdJY29uLCBtb3ZlRmllbGQsIG5vcm1hbGl6ZSwgcmVzb2x2ZUxheW91dCwgdHlwZSBGaWVsZENvbmZpZywgdHlwZSBGaWVsZExpbmUsIHR5cGUgTGF5b3V0U2V0dGluZ3MsIHR5cGUgVGFibGVDYXRhbG9nLCB0eXBlIFRhYmxlTGF5b3V0IH0gZnJvbSBcIi4vY29uZmlnLnRzXCI7XG5cbmV4cG9ydCB0eXBlIEVkaXRvclByb3BzID0ge1xuICB0YWJsZXM6IFRhYmxlQ2F0YWxvZ1tdO1xuICBzZXR0aW5nczogTGF5b3V0U2V0dGluZ3M7XG4gIG9uQXBwbHk6IChzZXR0aW5nczogTGF5b3V0U2V0dGluZ3MpID0+IHZvaWQ7XG4gIG9uQ2FuY2VsOiAoKSA9PiB2b2lkO1xufTtcblxuY29uc3QgbGluZU5hbWVzOiBSZWNvcmQ8RmllbGRMaW5lLCBzdHJpbmc+ID0geyBwcmltYXJ5OiBcIkZpcnN0IGxpbmVcIiwgc2Vjb25kYXJ5OiBcIlNlY29uZCBsaW5lXCIsIGhpZGRlbjogXCJIaWRkZW5cIiB9O1xuY29uc3QgZXhhbXBsZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG4gIG5hbWU6IFwiZXhhbXBsZS1hcGktNjVkZjU2OWZmNi1hYmMxMlwiLCBuYW1lc3BhY2U6IFwiZXhhbXBsZS1hcHBcIiwgc3RhdHVzOiBcIlJ1bm5pbmdcIiwgcGhhc2U6IFwiUnVubmluZ1wiLFxuICBvd25lcnM6IFwiUmVwbGljYVNldFwiLCBjb250cm9sbGVkYnk6IFwiUmVwbGljYVNldFwiLCBhZ2U6IFwiMTloXCIsIGNwdTogXCIwLjAxMFwiLCBtZW1vcnk6IFwiMTQxLjEgTWlCXCIsXG4gIHJlc3RhcnRzOiBcIjZcIiwgbm9kZTogXCJ3b3JrZXItbm9kZS0wMVwiLCBxb3M6IFwiQnVyc3RhYmxlXCIsIGNvbnRhaW5lcnM6IFwiMS8xXCIsXG59O1xuXG5leHBvcnQgY29uc3QgTGF5b3V0RWRpdG9yID0gKHsgdGFibGVzLCBzZXR0aW5ncywgb25BcHBseSwgb25DYW5jZWwgfTogRWRpdG9yUHJvcHMpID0+IHtcbiAgY29uc3QgW3RhYmxlSWQsIHNldFRhYmxlSWRdID0gdXNlU3RhdGUodGFibGVzWzBdPy5pZCA/PyBcInBvZHNcIik7XG4gIGNvbnN0IFtkcmFmdHMsIHNldERyYWZ0c10gPSB1c2VTdGF0ZShzZXR0aW5ncy50YWJsZXMpO1xuICBjb25zdCBbZHJhZ2dlZCwgc2V0RHJhZ2dlZF0gPSB1c2VTdGF0ZTxzdHJpbmcgfCBudWxsPihudWxsKTtcbiAgY29uc3QgdGFibGUgPSB0YWJsZXMuZmluZCgoY2FuZGlkYXRlKSA9PiBjYW5kaWRhdGUuaWQgPT09IHRhYmxlSWQpID8/IHRhYmxlc1swXTtcbiAgaWYgKCF0YWJsZSkgcmV0dXJuIDxkaXYgY2xhc3NOYW1lPVwibHdyLWVkaXRvclwiPjxwPk9wZW4gYSB3b3JrbG9hZCBsaXN0IGZpcnN0LjwvcD48YnV0dG9uIG9uQ2xpY2s9e29uQ2FuY2VsfT5DbG9zZTwvYnV0dG9uPjwvZGl2PjtcbiAgY29uc3QgaWRzID0gdGFibGUuZmllbGRzLm1hcCgoZmllbGQpID0+IGZpZWxkLmlkKTtcbiAgY29uc3QgbGF5b3V0ID0gcmVzb2x2ZUxheW91dChpZHMsIGRyYWZ0c1t0YWJsZS5pZF0pO1xuICBjb25zdCBpbmZvID0gbmV3IE1hcCh0YWJsZS5maWVsZHMubWFwKChmaWVsZCkgPT4gW2ZpZWxkLmlkLCBmaWVsZF0pKTtcbiAgY29uc3QgdXBkYXRlID0gKG5leHQ6IFRhYmxlTGF5b3V0KSA9PiBzZXREcmFmdHMoKHByZXZpb3VzKSA9PiAoeyAuLi5wcmV2aW91cywgW3RhYmxlLmlkXTogbmV4dCB9KSk7XG4gIGNvbnN0IG1vdmUgPSAoaWQ6IHN0cmluZywgbGluZTogRmllbGRMaW5lLCBiZWZvcmU/OiBzdHJpbmcpID0+IHVwZGF0ZShtb3ZlRmllbGQobGF5b3V0LCBpZCwgbGluZSwgYmVmb3JlKSk7XG5cbiAgZnVuY3Rpb24gZHJvcChldmVudDogRHJhZ0V2ZW50LCBsaW5lOiBGaWVsZExpbmUsIGJlZm9yZT86IHN0cmluZykge1xuICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG4gICAgY29uc3QgaWQgPSBldmVudC5kYXRhVHJhbnNmZXIuZ2V0RGF0YShcInRleHQvcGxhaW5cIikgfHwgZHJhZ2dlZDtcbiAgICBpZiAoaWQgJiYgaWRzLmluY2x1ZGVzKGlkKSkgbW92ZShpZCwgbGluZSwgYmVmb3JlKTtcbiAgICBzZXREcmFnZ2VkKG51bGwpO1xuICB9XG5cbiAgZnVuY3Rpb24gbnVkZ2UoZmllbGQ6IEZpZWxkQ29uZmlnLCBkaXJlY3Rpb246IC0xIHwgMSkge1xuICAgIGNvbnN0IHBlZXJzID0gbGF5b3V0LmZpZWxkcy5maWx0ZXIoKGNhbmRpZGF0ZSkgPT4gY2FuZGlkYXRlLmxpbmUgPT09IGZpZWxkLmxpbmUpO1xuICAgIGNvbnN0IGluZGV4ID0gcGVlcnMuZmluZEluZGV4KChjYW5kaWRhdGUpID0+IGNhbmRpZGF0ZS5pZCA9PT0gZmllbGQuaWQpO1xuICAgIGlmIChkaXJlY3Rpb24gPT09IC0xICYmIGluZGV4ID4gMCkgbW92ZShmaWVsZC5pZCwgZmllbGQubGluZSwgcGVlcnNbaW5kZXggLSAxXS5pZCk7XG4gICAgaWYgKGRpcmVjdGlvbiA9PT0gMSAmJiBpbmRleCA8IHBlZXJzLmxlbmd0aCAtIDEpIG1vdmUoZmllbGQuaWQsIGZpZWxkLmxpbmUsIHBlZXJzW2luZGV4ICsgMl0/LmlkKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpZWxkQ2FyZChmaWVsZDogRmllbGRDb25maWcpIHtcbiAgICBjb25zdCBsYWJlbCA9IGluZm8uZ2V0KGZpZWxkLmlkKT8ubGFiZWwgPz8gZmllbGQuaWQ7XG4gICAgY29uc3QgcGVlcnMgPSBsYXlvdXQuZmllbGRzLmZpbHRlcigoY2FuZGlkYXRlKSA9PiBjYW5kaWRhdGUubGluZSA9PT0gZmllbGQubGluZSk7XG4gICAgY29uc3QgaW5kZXggPSBwZWVycy5maW5kSW5kZXgoKGNhbmRpZGF0ZSkgPT4gY2FuZGlkYXRlLmlkID09PSBmaWVsZC5pZCk7XG4gICAgcmV0dXJuIChcbiAgICAgIDxkaXYgY2xhc3NOYW1lPXtgbHdyLWZpZWxkICR7ZHJhZ2dlZCA9PT0gZmllbGQuaWQgPyBcImx3ci1kcmFnZ2luZ1wiIDogXCJcIn1gfSBrZXk9e2ZpZWxkLmlkfVxuICAgICAgICBkcmFnZ2FibGUgb25EcmFnU3RhcnQ9eyhldmVudCkgPT4geyBldmVudC5kYXRhVHJhbnNmZXIuc2V0RGF0YShcInRleHQvcGxhaW5cIiwgZmllbGQuaWQpOyBldmVudC5kYXRhVHJhbnNmZXIuZWZmZWN0QWxsb3dlZCA9IFwibW92ZVwiOyBzZXREcmFnZ2VkKGZpZWxkLmlkKTsgfX1cbiAgICAgICAgb25EcmFnRW5kPXsoKSA9PiBzZXREcmFnZ2VkKG51bGwpfSBvbkRyYWdPdmVyPXsoZXZlbnQpID0+IGV2ZW50LnByZXZlbnREZWZhdWx0KCl9IG9uRHJvcD17KGV2ZW50KSA9PiBkcm9wKGV2ZW50LCBmaWVsZC5saW5lLCBmaWVsZC5pZCl9PlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImx3ci1maWVsZC10aXRsZVwiPjxzcGFuIGNsYXNzTmFtZT1cImx3ci1ncmlwXCIgYXJpYS1oaWRkZW49XCJ0cnVlXCI+XHUyMkVFXHUyMkVFPC9zcGFuPjxzdHJvbmc+e2xhYmVsfTwvc3Ryb25nPjwvZGl2PlxuICAgICAgICA8ZGl2IGNsYXNzTmFtZT1cImx3ci1maWVsZC1hY3Rpb25zXCI+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgYXJpYS1sYWJlbD17YE1vdmUgJHtsYWJlbH0gbGVmdGB9IGRpc2FibGVkPXtpbmRleCA9PT0gMH0gb25DbGljaz17KCkgPT4gbnVkZ2UoZmllbGQsIC0xKX0+XHUyMTkwPC9idXR0b24+XG4gICAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgYXJpYS1sYWJlbD17YE1vdmUgJHtsYWJlbH0gcmlnaHRgfSBkaXNhYmxlZD17aW5kZXggPT09IHBlZXJzLmxlbmd0aCAtIDF9IG9uQ2xpY2s9eygpID0+IG51ZGdlKGZpZWxkLCAxKX0+XHUyMTkyPC9idXR0b24+XG4gICAgICAgICAgPHNlbGVjdCBhcmlhLWxhYmVsPXtgTGluZSBmb3IgJHtsYWJlbH1gfSB2YWx1ZT17ZmllbGQubGluZX0gb25DaGFuZ2U9eyhldmVudCkgPT4gbW92ZShmaWVsZC5pZCwgZXZlbnQudGFyZ2V0LnZhbHVlIGFzIEZpZWxkTGluZSl9PlxuICAgICAgICAgICAgPG9wdGlvbiB2YWx1ZT1cInByaW1hcnlcIj57aXNXYXJuaW5nSWNvbihmaWVsZC5pZCkgPyBcIkJlc2lkZSBuYW1lXCIgOiBcIkZpcnN0IGxpbmVcIn08L29wdGlvbj5cbiAgICAgICAgICAgIHshaXNXYXJuaW5nSWNvbihmaWVsZC5pZCkgJiYgPG9wdGlvbiB2YWx1ZT1cInNlY29uZGFyeVwiPlNlY29uZCBsaW5lPC9vcHRpb24+fVxuICAgICAgICAgICAgPG9wdGlvbiB2YWx1ZT1cImhpZGRlblwiIGRpc2FibGVkPXtub3JtYWxpemUoZmllbGQuaWQpID09PSBcIm5hbWVcIn0+SGlkZGVuPC9vcHRpb24+XG4gICAgICAgICAgPC9zZWxlY3Q+XG4gICAgICAgIDwvZGl2PlxuICAgICAgICB7ZmllbGQubGluZSAhPT0gXCJoaWRkZW5cIiAmJiAhaXNXYXJuaW5nSWNvbihmaWVsZC5pZCkgJiYgPGxhYmVsIGNsYXNzTmFtZT1cImx3ci13aWR0aFwiPntsYXlvdXQuYXV0b1NlY29uZGFyeSAmJiBmaWVsZC5saW5lID09PSBcInNlY29uZGFyeVwiID8gXCJBdXRvbWF0aWMgd2lkdGhcIiA6IFwiV2lkdGhcIn1cbiAgICAgICAgICA8aW5wdXQgdHlwZT1cInJhbmdlXCIgbWluPVwiMVwiIG1heD1cIjQ4XCIgdmFsdWU9e2ZpZWxkLndpZHRofSBkaXNhYmxlZD17bGF5b3V0LmF1dG9TZWNvbmRhcnkgJiYgZmllbGQubGluZSA9PT0gXCJzZWNvbmRhcnlcIn0gYXJpYS1sYWJlbD17YFdpZHRoIGZvciAke2xhYmVsfWB9XG4gICAgICAgICAgICBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGUoeyAuLi5sYXlvdXQsIGZpZWxkczogbGF5b3V0LmZpZWxkcy5tYXAoKGNhbmRpZGF0ZSkgPT4gY2FuZGlkYXRlLmlkID09PSBmaWVsZC5pZCA/IHsgLi4uY2FuZGlkYXRlLCB3aWR0aDogTnVtYmVyKGV2ZW50LnRhcmdldC52YWx1ZSkgfSA6IGNhbmRpZGF0ZSkgfSl9IC8+XG4gICAgICAgICAgPG91dHB1dD57ZmllbGQud2lkdGh9PC9vdXRwdXQ+XG4gICAgICAgIDwvbGFiZWw+fVxuICAgICAgPC9kaXY+XG4gICAgKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHByZXZpZXdMaW5lKGxpbmU6IFwicHJpbWFyeVwiIHwgXCJzZWNvbmRhcnlcIikge1xuICAgIGNvbnN0IGZpZWxkcyA9IGxheW91dC5maWVsZHMuZmlsdGVyKChmaWVsZCkgPT4gZmllbGQubGluZSA9PT0gbGluZSAmJiAhaXNXYXJuaW5nSWNvbihmaWVsZC5pZCkpO1xuICAgIGNvbnN0IGF1dG8gPSBsaW5lID09PSBcInNlY29uZGFyeVwiICYmIGxheW91dC5hdXRvU2Vjb25kYXJ5O1xuICAgIHJldHVybiA8ZGl2IGNsYXNzTmFtZT17YGx3ci1wcmV2aWV3LWxpbmUgbHdyLXByZXZpZXctJHtsaW5lfSAke2F1dG8gPyBcImx3ci1wcmV2aWV3LWF1dG9cIiA6IFwiXCJ9YH0gc3R5bGU9e3sgZ3JpZFRlbXBsYXRlQ29sdW1uczogYXV0byA/IHVuZGVmaW5lZCA6IGZpZWxkcy5tYXAoKGZpZWxkKSA9PiBgbWlubWF4KDAsICR7ZmllbGQud2lkdGh9ZnIpYCkuam9pbihcIiBcIikgfX0+XG4gICAgICB7ZmllbGRzLm1hcCgoZmllbGQsIGluZGV4KSA9PiB7XG4gICAgICAgIGNvbnN0IGNvbHVtbiA9IGluZm8uZ2V0KGZpZWxkLmlkKTtcbiAgICAgICAgY29uc3Qgc2FtcGxlID0gY29sdW1uPy5zYW1wbGUgfHwgZXhhbXBsZXNbbm9ybWFsaXplKGZpZWxkLmlkKV0gfHwgXCJcdTIwMTRcIjtcbiAgICAgICAgY29uc3Qgc3RhdHVzQ2xhc3MgPSBbXCJzdGF0dXNcIiwgXCJwaGFzZVwiXS5pbmNsdWRlcyhub3JtYWxpemUoZmllbGQuaWQpKVxuICAgICAgICAgID8gL2ZhaWxlZHxlcnJvcnxjcmFzaHxiYWNrb2ZmL2kudGVzdChzYW1wbGUpID8gXCJsd3ItcHJldmlldy1lcnJvclwiIDogL3J1bm5pbmd8cmVhZHl8aGVhbHRoeXxzdWNjZWVkZWQvaS50ZXN0KHNhbXBsZSkgPyBcImx3ci1wcmV2aWV3LXN0YXR1c1wiIDogXCJcIlxuICAgICAgICAgIDogXCJcIjtcbiAgICAgICAgY29uc3QgZ3JvdXBTdGFydCA9IGxpbmUgPT09IFwic2Vjb25kYXJ5XCIgJiYgaW5kZXggPiAwICYmIGRldGFpbEdyb3VwKGZpZWxkLmlkKSAhPT0gZGV0YWlsR3JvdXAoZmllbGRzW2luZGV4IC0gMV0uaWQpO1xuICAgICAgICByZXR1cm4gPGRpdiBjbGFzc05hbWU9e2Bsd3ItcHJldmlldy12YWx1ZSAke2dyb3VwU3RhcnQgPyBcImx3ci1wcmV2aWV3LWdyb3VwXCIgOiBcIlwifWB9IGtleT17ZmllbGQuaWR9IHRpdGxlPXtgJHtjb2x1bW4/LmxhYmVsfTogJHtzYW1wbGV9YH0+XG4gICAgICAgICAgeyhsaW5lID09PSBcInByaW1hcnlcIiB8fCBsYXlvdXQubGFiZWxzIHx8IGF1dG8pICYmIDxzcGFuIGNsYXNzTmFtZT1cImx3ci1wcmV2aWV3LWxhYmVsXCI+e2NvbHVtbj8ubGFiZWx9PC9zcGFuPn1cbiAgICAgICAgICA8c3BhbiBjbGFzc05hbWU9e2Ake25vcm1hbGl6ZShmaWVsZC5pZCkgPT09IFwibmFtZVwiID8gXCJsd3ItcHJldmlldy1uYW1lXCIgOiBcIlwifSAke3N0YXR1c0NsYXNzfWB9PntzYW1wbGV9PC9zcGFuPlxuICAgICAgICA8L2Rpdj47XG4gICAgICB9KX1cbiAgICAgIHshZmllbGRzLmxlbmd0aCAmJiA8c3BhbiBjbGFzc05hbWU9XCJsd3ItZW1wdHktbGluZVwiPk5vIGZpZWxkcyBvbiB0aGlzIGxpbmU8L3NwYW4+fVxuICAgIDwvZGl2PjtcbiAgfVxuXG4gIHJldHVybiA8ZGl2IGNsYXNzTmFtZT1cImx3ci1lZGl0b3JcIj5cbiAgICA8ZGl2IGNsYXNzTmFtZT1cImx3ci1lZGl0b3ItdG9vbGJhclwiPlxuICAgICAgPGxhYmVsPlZpZXcgPHNlbGVjdCBhcmlhLWxhYmVsPVwiV29ya2xvYWQgdmlld1wiIHZhbHVlPXt0YWJsZS5pZH0gb25DaGFuZ2U9eyhldmVudCkgPT4geyBzZXRUYWJsZUlkKGV2ZW50LnRhcmdldC52YWx1ZSk7IHNldERyYWdnZWQobnVsbCk7IH19PlxuICAgICAgICB7dGFibGVzLm1hcCgoY2FuZGlkYXRlKSA9PiA8b3B0aW9uIGtleT17Y2FuZGlkYXRlLmlkfSB2YWx1ZT17Y2FuZGlkYXRlLmlkfT57Y2FuZGlkYXRlLmlkLnJlcGxhY2UoLy0vZywgXCIgXCIpfTwvb3B0aW9uPil9XG4gICAgICA8L3NlbGVjdD48L2xhYmVsPlxuICAgICAgPGRpdiBjbGFzc05hbWU9XCJsd3ItcHJlc2V0c1wiPjxzcGFuPlN0YXJ0IGZyb208L3NwYW4+XG4gICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHVwZGF0ZShkZWZhdWx0TGF5b3V0KGlkcywgXCJiYWxhbmNlZFwiKSl9PkJhbGFuY2VkPC9idXR0b24+XG4gICAgICAgIDxidXR0b24gdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IHVwZGF0ZShkZWZhdWx0TGF5b3V0KGlkcywgXCJ0cm91Ymxlc2hvb3RpbmdcIikpfT5Ucm91Ymxlc2hvb3Rpbmc8L2J1dHRvbj5cbiAgICAgICAgPGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17KCkgPT4gdXBkYXRlKGRlZmF1bHRMYXlvdXQoaWRzLCBcImFsbFwiKSl9PkFsbCBmaWVsZHM8L2J1dHRvbj5cbiAgICAgIDwvZGl2PlxuICAgIDwvZGl2PlxuICAgIDxkaXYgY2xhc3NOYW1lPVwibHdyLXByZXZpZXdcIiBhcmlhLWxhYmVsPVwiTGF5b3V0IHByZXZpZXdcIj5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwibHdyLXNlY3Rpb24tbGFiZWxcIj5MaXZlIHByZXZpZXc8L2Rpdj5cbiAgICAgIHtwcmV2aWV3TGluZShcInByaW1hcnlcIil9e3ByZXZpZXdMaW5lKFwic2Vjb25kYXJ5XCIpfVxuICAgIDwvZGl2PlxuICAgIDxwIGNsYXNzTmFtZT1cImx3ci1oZWxwXCI+RHJhZyBmaWVsZHMgYmV0d2VlbiBsaW5lcyBvciBjaGFuZ2UgdGhlaXIgZHJvcGRvd24uIEFycm93cyBjaGFuZ2Ugb3JkZXIuIFdpZHRoIHNoYXJlcyBzcGFjZSB3aXRoaW4gZWFjaCBsaW5lLjwvcD5cbiAgICA8ZGl2IGNsYXNzTmFtZT1cImx3ci1sYW5lc1wiPlxuICAgICAgeyhbXCJwcmltYXJ5XCIsIFwic2Vjb25kYXJ5XCJdIGFzIGNvbnN0KS5tYXAoKGxpbmUpID0+IDxzZWN0aW9uIGNsYXNzTmFtZT17YGx3ci1sYW5lICR7ZHJhZ2dlZCA/IFwibHdyLWRyb3AtcmVhZHlcIiA6IFwiXCJ9YH0ga2V5PXtsaW5lfVxuICAgICAgICBhcmlhLWxhYmVsPXtsaW5lTmFtZXNbbGluZV19IG9uRHJhZ092ZXI9eyhldmVudCkgPT4gZXZlbnQucHJldmVudERlZmF1bHQoKX0gb25Ecm9wPXsoZXZlbnQpID0+IGRyb3AoZXZlbnQsIGxpbmUpfT5cbiAgICAgICAgPGgzPntsaW5lTmFtZXNbbGluZV19IDxzcGFuPntsYXlvdXQuZmllbGRzLmZpbHRlcigoZmllbGQpID0+IGZpZWxkLmxpbmUgPT09IGxpbmUpLmxlbmd0aH08L3NwYW4+PC9oMz5cbiAgICAgICAge2xheW91dC5maWVsZHMuZmlsdGVyKChmaWVsZCkgPT4gZmllbGQubGluZSA9PT0gbGluZSkubWFwKGZpZWxkQ2FyZCl9XG4gICAgICAgIHshbGF5b3V0LmZpZWxkcy5zb21lKChmaWVsZCkgPT4gZmllbGQubGluZSA9PT0gbGluZSkgJiYgPHAgY2xhc3NOYW1lPVwibHdyLWVtcHR5LWxpbmVcIj5Ecm9wIGEgZmllbGQgaGVyZTwvcD59XG4gICAgICA8L3NlY3Rpb24+KX1cbiAgICA8L2Rpdj5cbiAgICA8c2VjdGlvbiBjbGFzc05hbWU9XCJsd3ItaGlkZGVuXCIgYXJpYS1sYWJlbD1cIkhpZGRlbiBmaWVsZHNcIiBvbkRyYWdPdmVyPXsoZXZlbnQpID0+IGV2ZW50LnByZXZlbnREZWZhdWx0KCl9IG9uRHJvcD17KGV2ZW50KSA9PiBkcm9wKGV2ZW50LCBcImhpZGRlblwiKX0+XG4gICAgICA8aDM+SGlkZGVuIDxzcGFuPntsYXlvdXQuZmllbGRzLmZpbHRlcigoZmllbGQpID0+IGZpZWxkLmxpbmUgPT09IFwiaGlkZGVuXCIpLmxlbmd0aH08L3NwYW4+PC9oMz5cbiAgICAgIDxkaXYgY2xhc3NOYW1lPVwibHdyLWhpZGRlbi1saXN0XCI+e2xheW91dC5maWVsZHMuZmlsdGVyKChmaWVsZCkgPT4gZmllbGQubGluZSA9PT0gXCJoaWRkZW5cIikubWFwKGZpZWxkQ2FyZCl9PC9kaXY+XG4gICAgICB7IWxheW91dC5maWVsZHMuc29tZSgoZmllbGQpID0+IGZpZWxkLmxpbmUgPT09IFwiaGlkZGVuXCIpICYmIDxwIGNsYXNzTmFtZT1cImx3ci1lbXB0eS1saW5lXCI+RHJvcCBmaWVsZHMgaGVyZSB0byBoaWRlIHRoZW08L3A+fVxuICAgIDwvc2VjdGlvbj5cbiAgICA8ZGl2IGNsYXNzTmFtZT1cImx3ci1lZGl0b3Itb3B0aW9uc1wiPjxsYWJlbD48aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgYXJpYS1sYWJlbD1cIkF1dG8gd2lkdGggZm9yIHNlY29uZCBsaW5lXCIgY2hlY2tlZD17bGF5b3V0LmF1dG9TZWNvbmRhcnl9IG9uQ2hhbmdlPXsoZXZlbnQpID0+IHVwZGF0ZSh7IC4uLmxheW91dCwgYXV0b1NlY29uZGFyeTogZXZlbnQudGFyZ2V0LmNoZWNrZWQgfSl9IC8+IEF1dG8gd2lkdGggZm9yIHNlY29uZCBsaW5lPC9sYWJlbD5cbiAgICAgIDxsYWJlbD48aW5wdXQgdHlwZT1cImNoZWNrYm94XCIgY2hlY2tlZD17bGF5b3V0LmxhYmVscyB8fCBsYXlvdXQuYXV0b1NlY29uZGFyeX0gZGlzYWJsZWQ9e2xheW91dC5hdXRvU2Vjb25kYXJ5fSBvbkNoYW5nZT17KGV2ZW50KSA9PiB1cGRhdGUoeyAuLi5sYXlvdXQsIGxhYmVsczogZXZlbnQudGFyZ2V0LmNoZWNrZWQgfSl9IC8+IExhYmVsIGRldGFpbCB2YWx1ZXM8L2xhYmVsPlxuICAgICAgPHNwYW4+TGF5b3V0cyBzYXZlIHBlciB3b3JrbG9hZCB0eXBlLiBGaWVsZHMgaGlkZGVuIGluIExlbnNcdTIwMTlzIGNvbHVtbiBtZW51IHN0YXkgaGlkZGVuLjwvc3Bhbj5cbiAgICA8L2Rpdj5cbiAgICB7bGF5b3V0LmF1dG9TZWNvbmRhcnkgJiYgPHAgY2xhc3NOYW1lPVwibHdyLWhlbHBcIj5EZXRhaWwgZmllbGRzIGZpdCB0aGVpciB0ZXh0IGluIGVhY2ggcm93LiBMb25nIHZhbHVlcyBzaHJpbmsgd2hlbiBzcGFjZSBpcyBsaW1pdGVkLiBNYW51YWwgd2lkdGhzIGFyZSBrZXB0IGZvciB3aGVuIHlvdSBzd2l0Y2ggdGhpcyBvZmYuPC9wPn1cbiAgICA8ZGl2IGNsYXNzTmFtZT1cImx3ci1lZGl0b3ItZm9vdGVyXCI+PGJ1dHRvbiB0eXBlPVwiYnV0dG9uXCIgb25DbGljaz17b25DYW5jZWx9PkNhbmNlbDwvYnV0dG9uPjxidXR0b24gY2xhc3NOYW1lPVwibHdyLWFwcGx5XCIgdHlwZT1cImJ1dHRvblwiIG9uQ2xpY2s9eygpID0+IG9uQXBwbHkoeyAuLi5zZXR0aW5ncywgdGFibGVzOiB7IC4uLmRyYWZ0cywgW3RhYmxlLmlkXTogbGF5b3V0IH0gfSl9PkFwcGx5IGxheW91dDwvYnV0dG9uPjwvZGl2PlxuICA8L2Rpdj47XG59O1xuIiwgImV4cG9ydCBjb25zdCBlZGl0b3JDc3MgPSBgXG4ubHdyLWVkaXRvciB7IGNvbG9yOiB2YXIoLS10ZXh0Q29sb3JQcmltYXJ5LCAjMjYzNTQ4KTsgZm9udDogMTNweC8xLjQ1IHN5c3RlbS11aSwgc2Fucy1zZXJpZjsgfVxuLmx3ci1lZGl0b3IgKiwgLmx3ci1lZGl0b3IgKjo6YmVmb3JlLCAubHdyLWVkaXRvciAqOjphZnRlciB7IGJveC1zaXppbmc6IGJvcmRlci1ib3g7IH1cbi5sd3ItZWRpdG9yIGJ1dHRvbiwgLmx3ci1lZGl0b3Igc2VsZWN0IHsgZm9udDogaW5oZXJpdDsgY29sb3I6IGluaGVyaXQ7IGJhY2tncm91bmQ6IHZhcigtLWNvbnRlbnRDb2xvciwgI2ZmZik7IGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLWJvcmRlckNvbG9yLCAjY2FkNGRmKTsgYm9yZGVyLXJhZGl1czogNnB4OyBwYWRkaW5nOiA1cHggOXB4OyBjdXJzb3I6IHBvaW50ZXI7IH1cbi5sd3ItZWRpdG9yIGJ1dHRvbjpob3ZlciB7IGJhY2tncm91bmQ6IHZhcigtLXRhYmxlQmdjU2VsZWN0ZWQsICNlYWYxZmEpOyB9XG4ubHdyLWVkaXRvciBidXR0b246ZGlzYWJsZWQgeyBvcGFjaXR5OiAuMzU7IGN1cnNvcjogZGVmYXVsdDsgfVxuLmx3ci1lZGl0b3IgYnV0dG9uOmZvY3VzLXZpc2libGUsIC5sd3ItZWRpdG9yIHNlbGVjdDpmb2N1cy12aXNpYmxlLCAubHdyLWVkaXRvciBpbnB1dDpmb2N1cy12aXNpYmxlIHsgb3V0bGluZTogMnB4IHNvbGlkIHZhcigtLXByaW1hcnksICMyODc0ZDApOyBvdXRsaW5lLW9mZnNldDogMnB4OyB9XG4ubHdyLWVkaXRvci10b29sYmFyIHsgZGlzcGxheTogZmxleDsgZmxleC13cmFwOiB3cmFwOyBqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47IGFsaWduLWl0ZW1zOiBjZW50ZXI7IGdhcDogMTJweDsgbWFyZ2luLWJvdHRvbTogMTZweDsgfVxuLmx3ci1lZGl0b3ItdG9vbGJhciBsYWJlbCB7IGRpc3BsYXk6IGZsZXg7IGFsaWduLWl0ZW1zOiBjZW50ZXI7IGdhcDogOHB4OyBmb250LXdlaWdodDogNjAwOyB9XG4ubHdyLXByZXNldHMgeyBkaXNwbGF5OiBmbGV4OyBmbGV4LXdyYXA6IHdyYXA7IGFsaWduLWl0ZW1zOiBjZW50ZXI7IGdhcDogNnB4OyB9XG4ubHdyLXByZXNldHMgPiBzcGFuLCAubHdyLWhlbHAsIC5sd3ItZW1wdHktbGluZSB7IGNvbG9yOiB2YXIoLS10ZXh0Q29sb3JTZWNvbmRhcnksICM3NTgzOTkpOyB9XG4ubHdyLXByZXZpZXcgeyBib3JkZXI6IDFweCBzb2xpZCB2YXIoLS1ib3JkZXJDb2xvciwgI2NhZDRkZik7IGJvcmRlci1yYWRpdXM6IDEwcHg7IG92ZXJmbG93OiBoaWRkZW47IGJhY2tncm91bmQ6IHZhcigtLWNvbnRlbnRDb2xvciwgI2ZmZik7IH1cbi5sd3Itc2VjdGlvbi1sYWJlbCB7IHRleHQtdHJhbnNmb3JtOiB1cHBlcmNhc2U7IGxldHRlci1zcGFjaW5nOiAuMDhlbTsgZm9udC1zaXplOiAxMHB4OyBmb250LXdlaWdodDogNzAwOyBjb2xvcjogdmFyKC0tdGV4dENvbG9yU2Vjb25kYXJ5LCAjNzU4Mzk5KTsgcGFkZGluZzogMTBweCAxNHB4IDA7IH1cbi5sd3ItcHJldmlldy1saW5lIHsgZGlzcGxheTogZ3JpZDsgZ2FwOiAxNHB4OyBwYWRkaW5nOiAxMHB4IDE0cHg7IG1pbi1oZWlnaHQ6IDQ1cHg7IH1cbi5sd3ItcHJldmlldy1wcmltYXJ5IHsgYmFja2dyb3VuZDogY29sb3ItbWl4KGluIHNyZ2IsIHZhcigtLXRleHRDb2xvclByaW1hcnksICM2NDc0OGIpIDMlLCB2YXIoLS1jb250ZW50Q29sb3IsICNmZmYpKTsgfVxuLmx3ci1wcmV2aWV3LXNlY29uZGFyeSB7IGJvcmRlci10b3A6IDFweCBzb2xpZCB2YXIoLS1ib3JkZXJDb2xvciwgI2U0ZWFmMSk7IGJhY2tncm91bmQ6IHZhcigtLWNvbnRlbnRDb2xvciwgI2ZmZik7IH1cbi5sd3ItcHJldmlldy1zZWNvbmRhcnkgLmx3ci1wcmV2aWV3LXZhbHVlIHsgZmxleC1kaXJlY3Rpb246IHJvdzsgYWxpZ24taXRlbXM6IGNlbnRlcjsgZ2FwOiA2cHg7IH1cbi5sd3ItcHJldmlldy1zZWNvbmRhcnkgLmx3ci1wcmV2aWV3LWxhYmVsIHsgZmxleC1zaHJpbms6IDA7IG1hcmdpbi1ib3R0b206IDA7IH1cbi5sd3ItcHJldmlldy1zZWNvbmRhcnkgLmx3ci1wcmV2aWV3LWdyb3VwIHsgYm9yZGVyLWlubGluZS1zdGFydDogMXB4IHNvbGlkIHZhcigtLWJvcmRlckNvbG9yLCAjY2JkNWUxKTsgcGFkZGluZy1pbmxpbmUtc3RhcnQ6IDE0cHg7IH1cbi5sd3ItcHJldmlldy1hdXRvIHsgZGlzcGxheTogZmxleDsgZ2FwOiAxMnB4OyBvdmVyZmxvdzogaGlkZGVuOyB9XG4ubHdyLXByZXZpZXctYXV0byAubHdyLXByZXZpZXctdmFsdWUgeyBmbGV4OiAwIDEgYXV0bzsgfVxuLmx3ci1wcmV2aWV3LWF1dG8gLmx3ci1wcmV2aWV3LXZhbHVlOmhhcygubHdyLXByZXZpZXctbmFtZSkgeyBtaW4td2lkdGg6IDgwcHg7IH1cbi5sd3ItcHJldmlldy1zZWNvbmRhcnkgLmx3ci1wcmV2aWV3LXN0YXR1cywgLmx3ci1wcmV2aWV3LXByaW1hcnkgLmx3ci1wcmV2aWV3LXN0YXR1cyxcbi5sd3ItcHJldmlldy1zZWNvbmRhcnkgLmx3ci1wcmV2aWV3LWVycm9yLCAubHdyLXByZXZpZXctcHJpbWFyeSAubHdyLXByZXZpZXctZXJyb3IgeyBhbGlnbi1zZWxmOiBmbGV4LXN0YXJ0OyBib3JkZXItcmFkaXVzOiA5OTlweDsgcGFkZGluZzogMXB4IDdweDsgYmFja2dyb3VuZDogY29sb3ItbWl4KGluIHNyZ2IsIGN1cnJlbnRDb2xvciA5JSwgdHJhbnNwYXJlbnQpOyB9XG4ubHdyLXByZXZpZXctdmFsdWUgeyBtaW4td2lkdGg6IDA7IG92ZXJmbG93OiBoaWRkZW47IGRpc3BsYXk6IGZsZXg7IGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47IH1cbi5sd3ItcHJldmlldy12YWx1ZSA+IHNwYW4geyBvdmVyZmxvdzogaGlkZGVuOyB0ZXh0LW92ZXJmbG93OiBlbGxpcHNpczsgd2hpdGUtc3BhY2U6IG5vd3JhcDsgfVxuLmx3ci1wcmV2aWV3LWxhYmVsIHsgY29sb3I6IHZhcigtLXRleHRDb2xvclNlY29uZGFyeSwgIzc1ODM5OSk7IGZvbnQtc2l6ZTogMTBweDsgbWFyZ2luLWJvdHRvbTogM3B4OyB9XG4ubHdyLXByZXZpZXctbmFtZSB7IGZvbnQtd2VpZ2h0OiA2NTA7IH1cbi5sd3ItcHJldmlldy1zdGF0dXMgeyBjb2xvcjogdmFyKC0tY29sb3JPaywgIzI1ODI0Zik7IH1cbi5sd3ItcHJldmlldy1lcnJvciB7IGNvbG9yOiB2YXIoLS1jb2xvckVycm9yLCAjY2YzZjRiKTsgfVxuLmx3ci1oZWxwIHsgbWFyZ2luOiAxMnB4IDA7IGZvbnQtc2l6ZTogMTJweDsgfVxuLmx3ci1sYW5lcyB7IGRpc3BsYXk6IGdyaWQ7IGdyaWQtdGVtcGxhdGUtY29sdW1uczogMWZyIDFmcjsgZ2FwOiAxMnB4OyBtYXgtaGVpZ2h0OiAzN3ZoOyBtaW4taGVpZ2h0OiAxMjBweDsgb3ZlcmZsb3cteTogYXV0bzsgcGFkZGluZzogMnB4OyB9XG4ubHdyLWxhbmUsIC5sd3ItaGlkZGVuIHsgYm9yZGVyOiAxcHggc29saWQgdmFyKC0tYm9yZGVyQ29sb3IsICNkY2UzZWMpOyBib3JkZXItcmFkaXVzOiA5cHg7IHBhZGRpbmc6IDEwcHg7IG1pbi13aWR0aDogMDsgfVxuLmx3ci1sYW5lIGgzLCAubHdyLWhpZGRlbiBoMyB7IGZvbnQ6IDYwMCAxMnB4LzEuNCBzeXN0ZW0tdWk7IG1hcmdpbjogMCAwIDhweDsgZGlzcGxheTogZmxleDsgZ2FwOiA3cHg7IGFsaWduLWl0ZW1zOiBjZW50ZXI7IH1cbi5sd3ItbGFuZSBoMyA+IHNwYW4sIC5sd3ItaGlkZGVuIGgzID4gc3BhbiB7IGNvbG9yOiB2YXIoLS10ZXh0Q29sb3JTZWNvbmRhcnksICM3NTgzOTkpOyBmb250LXdlaWdodDogNDAwOyB9XG4ubHdyLWRyb3AtcmVhZHkgeyBib3JkZXItc3R5bGU6IGRhc2hlZDsgfVxuLmx3ci1maWVsZCB7IGJvcmRlcjogMXB4IHNvbGlkIHZhcigtLWJvcmRlckNvbG9yLCAjZGNlM2VjKTsgYm9yZGVyLXJhZGl1czogN3B4OyBwYWRkaW5nOiA4cHggMTBweDsgbWFyZ2luLXRvcDogN3B4OyBiYWNrZ3JvdW5kOiB2YXIoLS1jb250ZW50Q29sb3IsICNmZmYpOyBkaXNwbGF5OiBncmlkOyBncmlkLXRlbXBsYXRlLWNvbHVtbnM6IG1pbm1heCg4MHB4LCAxZnIpIGF1dG87IGdhcDogNnB4IDhweDsgfVxuLmx3ci1maWVsZC10aXRsZSB7IGRpc3BsYXk6IGZsZXg7IGdhcDogNnB4OyBhbGlnbi1pdGVtczogY2VudGVyOyBtaW4td2lkdGg6IDA7IH1cbi5sd3ItZmllbGQtdGl0bGUgc3Ryb25nIHsgZm9udC1zaXplOiAxMnB4OyBvdmVyZmxvdzogaGlkZGVuOyB0ZXh0LW92ZXJmbG93OiBlbGxpcHNpczsgd2hpdGUtc3BhY2U6IG5vd3JhcDsgfVxuLmx3ci1ncmlwIHsgY29sb3I6IHZhcigtLXRleHRDb2xvclNlY29uZGFyeSwgIzc1ODM5OSk7IGN1cnNvcjogZ3JhYjsgfVxuLmx3ci1maWVsZC1hY3Rpb25zIHsgZGlzcGxheTogZmxleDsgZ2FwOiAzcHg7IGFsaWduLWl0ZW1zOiBjZW50ZXI7IH1cbi5sd3ItZmllbGQtYWN0aW9ucyBidXR0b24geyBwYWRkaW5nOiAycHggNXB4OyB9XG4ubHdyLWZpZWxkLWFjdGlvbnMgc2VsZWN0IHsgbWF4LXdpZHRoOiAxMDRweDsgcGFkZGluZzogM3B4OyBmb250LXNpemU6IDExcHg7IH1cbi5sd3Itd2lkdGggeyBncmlkLWNvbHVtbjogMSAvIC0xOyBkaXNwbGF5OiBmbGV4OyBnYXA6IDhweDsgYWxpZ24taXRlbXM6IGNlbnRlcjsgZm9udC1zaXplOiAxMHB4OyBjb2xvcjogdmFyKC0tdGV4dENvbG9yU2Vjb25kYXJ5LCAjNzU4Mzk5KTsgfVxuLmx3ci13aWR0aCBpbnB1dCB7IGZsZXg6IDE7IG1pbi13aWR0aDogMDsgYWNjZW50LWNvbG9yOiB2YXIoLS1wcmltYXJ5LCAjMjg3NGQwKTsgaGVpZ2h0OiAxM3B4OyB9XG4ubHdyLXdpZHRoIGlucHV0OmRpc2FibGVkIHsgb3BhY2l0eTogLjM1OyB9XG4ubHdyLXdpZHRoIG91dHB1dCB7IG1pbi13aWR0aDogMThweDsgdGV4dC1hbGlnbjogcmlnaHQ7IH1cbi5sd3ItZHJhZ2dpbmcgeyBvcGFjaXR5OiAuNDsgfVxuLmx3ci1oaWRkZW4geyBtYXJnaW4tdG9wOiAxMnB4OyB9XG4ubHdyLWhpZGRlbi1saXN0IHsgZGlzcGxheTogZmxleDsgZmxleC13cmFwOiB3cmFwOyBnYXA6IDZweDsgfVxuLmx3ci1oaWRkZW4tbGlzdCAubHdyLWZpZWxkIHsgbWFyZ2luOiAwOyB9XG4ubHdyLWVtcHR5LWxpbmUgeyBmb250LXNpemU6IDExcHg7IG1hcmdpbjogNnB4IDA7IH1cbi5sd3ItZWRpdG9yLW9wdGlvbnMgeyBkaXNwbGF5OiBmbGV4OyBmbGV4LXdyYXA6IHdyYXA7IGdhcDogOHB4IDIwcHg7IGFsaWduLWl0ZW1zOiBjZW50ZXI7IG1hcmdpbjogMTJweCAwOyBmb250LXNpemU6IDExcHg7IH1cbi5sd3ItZWRpdG9yLW9wdGlvbnMgbGFiZWwgeyBkaXNwbGF5OiBmbGV4OyBnYXA6IDZweDsgYWxpZ24taXRlbXM6IGNlbnRlcjsgfVxuLmx3ci1lZGl0b3Itb3B0aW9ucyA+IHNwYW4geyBjb2xvcjogdmFyKC0tdGV4dENvbG9yU2Vjb25kYXJ5LCAjNzU4Mzk5KTsgfVxuLmx3ci1lZGl0b3ItZm9vdGVyIHsgZGlzcGxheTogZmxleDsganVzdGlmeS1jb250ZW50OiBmbGV4LWVuZDsgZ2FwOiA4cHg7IGJvcmRlci10b3A6IDFweCBzb2xpZCB2YXIoLS1ib3JkZXJDb2xvciwgI2RjZTNlYyk7IHBhZGRpbmctdG9wOiAxMnB4OyB9XG4ubHdyLWVkaXRvciBidXR0b24ubHdyLWFwcGx5IHsgYmFja2dyb3VuZDogdmFyKC0tcHJpbWFyeSwgIzI4NzRkMCk7IGNvbG9yOiB3aGl0ZTsgYm9yZGVyLWNvbG9yOiB0cmFuc3BhcmVudDsgfVxuQG1lZGlhIChtYXgtd2lkdGg6IDY1MHB4KSB7IC5sd3ItbGFuZXMgeyBncmlkLXRlbXBsYXRlLWNvbHVtbnM6IDFmcjsgfSAubHdyLWZpZWxkIHsgZ3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiAxZnI7IH0gLmx3ci1maWVsZC1hY3Rpb25zIHsganVzdGlmeS1jb250ZW50OiBmbGV4LWVuZDsgfSB9XG5gO1xuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsMEJBQTJCO0FBQzNCLGtDQUE2Qjs7O0FDT3RCLElBQU0sZ0JBQWdDLEVBQUUsU0FBUyxHQUFHLFNBQVMsTUFBTSxRQUFRLENBQUMsRUFBRTtBQUM5RSxJQUFNLFlBQVksQ0FBQyxPQUFlLEdBQUcsUUFBUSxlQUFlLEVBQUUsRUFBRSxZQUFZO0FBQzVFLElBQU0sZ0JBQWdCLENBQUMsT0FB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QUc7QUFBQSxFQUMzRixnQkFBZ0I7QUFDbEIsQ0FBQzs7O0FNN0VNLElBQU0sWUFBWTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBOzs7QVZRekIsSUFBTSxpQkFBYSwwQ0FBYSxFQUFFLElBQUksNkJBQTZCLEtBQUssWUFBWSxVQUFVLENBQUM7QUFFeEYsSUFBTSwwQkFBc0IsZ0NBQVc7QUFBQSxFQUM1QyxJQUFJO0FBQUEsRUFDSixVQUFVLENBQUMsT0FBTyxHQUFHLFNBQVMsWUFBWSxvQkFBb0IscUJBQXFCLHdCQUF3Qix3QkFBd0Isb0JBQW9CO0FBQ3pKLENBQUM7IiwKICAibmFtZXMiOiBbImRvY3VtZW50IiwgImZpZWxkIiwgIl9hIiwgImltcG9ydF9pbmplY3RhYmxlIiwgImltcG9ydF9yZWFjdCIsICJkb2N1bWVudCIsICJfYSIsICJfYiIsICJyb3ciLCAiaW1wb3J0X2luamVjdGFibGUiLCAiX2EiLCAiaW1wb3J0X2pzeF9ydW50aW1lIiwgImltcG9ydF9qc3hfcnVudGltZSJdCn0K
