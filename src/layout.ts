import { defaultLayout, detailGroup, fieldLabel, isWarningIcon, normalize, resolveLayout, type TableLayout } from "./config.ts";
import { fitNaturalWidths, measureText } from "./auto-width.ts";
type Placement = { column: string; line: string; hidden?: boolean; secondary?: boolean; warning?: boolean };

/** One common grid lets the two lines use different column widths without moving DOM nodes. */
export function placements(ids: string[], layout: TableLayout = defaultLayout(ids, "all")): Map<string, Placement> {
  const result = new Map<string, Placement>();
  const find = (...names: string[]) => ids.find((id) => names.includes(normalize(id)));
  const selection = find("selection", "select", "checkbox", "id0");
  const menu = find("menu", "actions", "contextmenu");
  if (selection) result.set(selection, { column: "1 / 2", line: "1 / 3" });
  if (menu) result.set(menu, { column: "122 / 123", line: "1 / 3" });

  const fields = resolveLayout(ids, layout).fields;
  function distribute(items: { id: string; width: number }[], line: string, secondary = false) {
    const total = items.reduce((sum, item) => sum + item.width, 0);
    let used = 0;
    let start = 2;
    items.forEach((item, index) => {
      used += item.width;
      const end = index === items.length - 1 ? 122 : 2 + Math.round(120 * used / total);
      result.set(item.id, { column: `${start} / ${end}`, line, ...(secondary ? { secondary: true } : {}) });
      start = end;
    });
  }
  distribute(fields.filter((field) => field.line === "primary" && !isWarningIcon(field.id)), "1 / 2");
  distribute(fields.filter((field) => field.line === "secondary" && !isWarningIcon(field.id)), "2 / 3", true);
  for (const field of fields.filter((field) => field.line === "hidden")) {
    result.set(field.id, { column: "2 / 122", line: "2 / 3", hidden: true });
  }
  const name = fields.find((field) => normalize(field.id) === "name");
  const warning = fields.find((field) => isWarningIcon(field.id) && field.line !== "hidden");
  const namePosition = name && result.get(name.id);
  if (warning && namePosition) result.set(warning.id, { ...namePosition, warning: true });
  return result;
}

const rowAttribute = "data-lwr-row";
const cellAttribute = "data-lwr-cell";

export function layoutRow(row: HTMLElement, header = false, layout?: TableLayout, labels?: Map<string, string>, context: { index?: number; availableWidth?: number } = {}): void {
  const cells = Array.from(row.children).filter((child): child is HTMLElement =>
    child instanceof row.ownerDocument.defaultView!.HTMLElement);
  const getId = (cell: HTMLElement) =>
    cell.getAttribute(header ? "data-column-id-test" : "data-column-id") ??
    (header && cell.querySelector("[data-select-all-checkbox-test]") ? "id-0" : "");
  const ids = cells.map(getId);
  // Refuse an unknown structure rather than misplacing controls.
  if (ids.some((id) => !id) || !ids.some((id) => normalize(id) === "name")) return;
  const positions = placements(ids, layout);
  const resolved = resolveLayout(ids, layout ?? defaultLayout(ids, "all"));
  const showLabels = Boolean(layout?.labels) || resolved.autoSecondary;
  const details = resolved.fields.filter((field) => field.line === "secondary" && !isWarningIcon(field.id));
  const groupStarts = new Set(details.filter((field, index) => index > 0 && detailGroup(field.id) !== detailGroup(details[index - 1].id)).map((field) => field.id));
  const warningCell = cells.find((cell) => isWarningIcon(getId(cell)));
  const warningVisible = warningCell && !positions.get(getId(warningCell))?.hidden && Boolean(warningCell.querySelector("button, svg, input") || warningCell.textContent?.trim());
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
      if (value) cell.style.setProperty("--lwr-status-color", row.ownerDocument.defaultView!.getComputedStyle(value).color);
    }
    cell.toggleAttribute("data-lwr-group-start", groupStarts.has(getId(cell)));
    cell.toggleAttribute("data-lwr-warning", placement.warning === true);
    cell.toggleAttribute("data-lwr-empty-icon", placement.warning === true && !warningVisible);
    cell.toggleAttribute("data-lwr-has-warning", normalize(getId(cell)) === "name" && Boolean(warningVisible));
    cell.toggleAttribute("data-lwr-auto", !header && placement.secondary === true && resolved.autoSecondary);
    cell.setAttribute("data-lwr-label", isWarningIcon(getId(cell)) ? "" : labels?.get(getId(cell)) ?? fieldLabel(getId(cell)));
    cell.style.removeProperty("--lwr-offset");
    cell.style.removeProperty("--lwr-natural-width");
  }
  if (!header && resolved.autoSecondary) {
    const available = Math.max(0, (context.availableWidth ?? row.clientWidth) - 80);
    const natural = details.map((field) => {
      const cell = cells.find((candidate) => getId(candidate) === field.id)!;
      const value = cell.textContent?.trim() ?? "";
      const style = row.ownerDocument.defaultView!.getComputedStyle(cell);
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
      const cell = cells.find((candidate) => getId(candidate) === fitted.id)!;
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

export function clearLayout(root: HTMLElement): void {
  for (const row of root.querySelectorAll(`[${rowAttribute}]`)) {
    row.removeAttribute(rowAttribute);
    row.removeAttribute("data-lwr-labels");
    row.removeAttribute("data-lwr-stripe");
  }
  for (const cell of root.querySelectorAll<HTMLElement>(`[${cellAttribute}]`)) {
    cell.removeAttribute(cellAttribute);
    for (const attribute of ["data-lwr-hidden", "data-lwr-secondary", "data-lwr-name", "data-lwr-label", "data-lwr-auto", "data-lwr-group-start", "data-lwr-status", "data-lwr-warning", "data-lwr-empty-icon", "data-lwr-has-warning"]) cell.removeAttribute(attribute);
    cell.style.removeProperty("--lwr-column");
    cell.style.removeProperty("--lwr-line");
    cell.style.removeProperty("--lwr-offset");
    cell.style.removeProperty("--lwr-natural-width");
    cell.style.removeProperty("--lwr-status-color");
  }
}

export const layoutCss = `
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
