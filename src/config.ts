export type FieldLine = "primary" | "secondary" | "hidden";
export type FieldConfig = { id: string; line: FieldLine; width: number };
export type TableLayout = { fields: FieldConfig[]; labels: boolean; autoSecondary: boolean };
export type LayoutSettings = { version: 1; enabled: boolean; tables: Record<string, TableLayout> };
export type FieldInfo = { id: string; label: string; sample?: string };
export type TableCatalog = { id: string; fields: FieldInfo[] };
export type Preset = "balanced" | "all" | "troubleshooting";

export const emptySettings: LayoutSettings = { version: 1, enabled: true, tables: {} };
export const normalize = (id: string) => id.replace(/[^a-z0-9]/gi, "").toLowerCase();
export const isWarningIcon = (id: string) => normalize(id) === "statusicon";
export const isControl = (id: string) => ["selection", "select", "checkbox", "id0", "menu", "actions", "contextmenu"].includes(normalize(id));
const isName = (id: string) => normalize(id) === "name";
const isOwner = (id: string) => ["controlledby", "owner", "owners", "ownerreferences"].includes(normalize(id));
const isStatus = (id: string) => ["status", "phase"].includes(normalize(id));

export function fieldLabel(id: string): string {
  const labels: Record<string, string> = {
    name: "Name", namespace: "Namespace", cpu: "CPU", memory: "Memory", containers: "Containers",
    restarts: "Restarts", node: "Node", qos: "QoS", age: "Age", status: "Status", phase: "Status",
    owners: "Controlled By", owner: "Controlled By", controlledby: "Controlled By", warning: "Warnings", warnings: "Warnings",
    statusicon: "Warnings",
  };
  return labels[normalize(id)] ?? id.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[-_]/g, " ");
}

export function defaultLayout(ids: string[], preset: Preset = "balanced"): TableLayout {
  const fields: FieldConfig[] = ids.filter((id) => !isControl(id)).map((id) => {
    const key = normalize(id);
    let line: FieldLine = "secondary";
    let width = /namespace|node/i.test(id) ? 10 : 5;
    if (isName(id)) { line = "primary"; width = 36; }
    if (isStatus(id)) { line = "primary"; width = 7; }
    if (key === "age") { line = "primary"; width = 5; }
    if (isWarningIcon(id)) { line = "primary"; width = 1; }
    if (preset !== "all" && ["qos", "containers"].includes(key)) line = "hidden";
    if (preset === "all") {
      if (key === "age") line = "secondary";
      if (isOwner(id)) { line = "primary"; width = 10; }
    }
    if (preset === "troubleshooting") {
      if (key === "restarts" || /warning/.test(key)) { line = "primary"; width = 5; }
      if (key === "containers") line = "secondary";
    }
    return { id, line, width };
  });
  // Preserve column order within each line, with Name always leading the default layout.
  fields.sort((a, b) => Number(isName(b.id)) - Number(isName(a.id)));
  return { fields, labels: true, autoSecondary: false };
}

/** Validate persisted or imported values and merge columns added after a layout was saved. */
export function resolveLayout(ids: string[], value?: unknown): TableLayout {
  const defaults = defaultLayout(ids);
  if (!value || typeof value !== "object") return defaults;
  const raw = value as Partial<TableLayout>;
  if (!Array.isArray(raw.fields)) return defaults;
  const allowed = new Set(defaults.fields.map((field) => field.id));
  const seen = new Set<string>();
  const fields: FieldConfig[] = [];
  for (const field of raw.fields) {
    if (!field || typeof field.id !== "string" || !allowed.has(field.id) || seen.has(field.id)) continue;
    if (!["primary", "secondary", "hidden"].includes(field.line)) continue;
    seen.add(field.id);
    fields.push({
      id: field.id,
      line: (isName(field.id) && field.line === "hidden") || (isWarningIcon(field.id) && field.line !== "hidden") ? "primary" : field.line,
      width: Number.isFinite(field.width) ? Math.max(1, Math.min(48, Math.round(field.width))) : 5,
    });
  }
  fields.push(...defaults.fields.filter((field) => !seen.has(field.id)));
  return { fields, labels: raw.labels !== false, autoSecondary: raw.autoSecondary === true };
}

export function sanitizeSettings(value: unknown): LayoutSettings {
  if (!value || typeof value !== "object") return { ...emptySettings, tables: {} };
  const raw = value as Partial<LayoutSettings>;
  const tables: Record<string, TableLayout> = {};
  if (raw.tables && typeof raw.tables === "object" && !Array.isArray(raw.tables)) {
    for (const [id, layout] of Object.entries(raw.tables)) {
      if (!layout || !Array.isArray(layout.fields)) continue;
      const ids = layout.fields.filter((field) => field && typeof field.id === "string").map((field) => field.id);
      tables[id] = resolveLayout(ids, layout);
    }
  }
  return { version: 1, enabled: raw.enabled !== false, tables };
}

export function moveField(layout: TableLayout, id: string, line: FieldLine, before?: string): TableLayout {
  const field = layout.fields.find((candidate) => candidate.id === id);
  if (!field || (isName(id) && line === "hidden")) return layout;
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

export function detailGroup(id: string): string {
  const key = normalize(id);
  if (["cpu", "memory", "containers", "restarts"].includes(key)) return "resources";
  if (isOwner(id) || ["node", "namespace"].includes(key)) return "relations";
  if (key === "qos") return "quality";
  return "other";
}
