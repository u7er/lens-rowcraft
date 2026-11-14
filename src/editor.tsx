import { useState, type DragEvent } from "react";
import { defaultLayout, detailGroup, isWarningIcon, moveField, normalize, resolveLayout, type FieldConfig, type FieldLine, type LayoutSettings, type TableCatalog, type TableLayout } from "./config.ts";

export type EditorProps = {
  tables: TableCatalog[];
  settings: LayoutSettings;
  onApply: (settings: LayoutSettings) => void;
  onCancel: () => void;
};

const lineNames: Record<FieldLine, string> = { primary: "First line", secondary: "Second line", hidden: "Hidden" };
const examples: Record<string, string> = {
  name: "example-api-65df569ff6-abc12", namespace: "example-app", status: "Running", phase: "Running",
  owners: "ReplicaSet", controlledby: "ReplicaSet", age: "19h", cpu: "0.010", memory: "141.1 MiB",
  restarts: "6", node: "worker-node-01", qos: "Burstable", containers: "1/1",
};

export const LayoutEditor = ({ tables, settings, onApply, onCancel }: EditorProps) => {
  const [tableId, setTableId] = useState(tables[0]?.id ?? "pods");
  const [drafts, setDrafts] = useState(settings.tables);
  const [dragged, setDragged] = useState<string | null>(null);
  const table = tables.find((candidate) => candidate.id === tableId) ?? tables[0];
  if (!table) return <div className="lwr-editor"><p>Open a workload list first.</p><button onClick={onCancel}>Close</button></div>;
  const ids = table.fields.map((field) => field.id);
  const layout = resolveLayout(ids, drafts[table.id]);
  const info = new Map(table.fields.map((field) => [field.id, field]));
  // Lens can temporarily omit columns. Keep their saved configuration in its
  // existing slots while replacing visible fields with the editor's new order.
  const preserveUnavailable = (next: TableLayout, previous?: TableLayout): TableLayout => {
    const visible = new Set(ids);
    const remaining = [...next.fields];
    const fields = (previous?.fields ?? []).flatMap((field) => {
      if (!visible.has(field.id)) return [field];
      const replacement = remaining.shift();
      return replacement ? [replacement] : [];
    });
    return { ...next, fields: [...fields, ...remaining] };
  };
  const update = (next: TableLayout) => setDrafts((previous) => ({ ...previous, [table.id]: preserveUnavailable(next, previous[table.id]) }));
  const move = (id: string, line: FieldLine, before?: string) => update(moveField(layout, id, line, before));

  function drop(event: DragEvent, line: FieldLine, before?: string) {
    event.preventDefault();
    event.stopPropagation();
    const id = event.dataTransfer.getData("text/plain") || dragged;
    if (id && ids.includes(id)) move(id, line, before);
    setDragged(null);
  }

  function nudge(field: FieldConfig, direction: -1 | 1) {
    const peers = layout.fields.filter((candidate) => candidate.line === field.line);
    const index = peers.findIndex((candidate) => candidate.id === field.id);
    if (direction === -1 && index > 0) move(field.id, field.line, peers[index - 1].id);
    if (direction === 1 && index < peers.length - 1) move(field.id, field.line, peers[index + 2]?.id);
  }

  function fieldCard(field: FieldConfig) {
    const label = info.get(field.id)?.label ?? field.id;
    const peers = layout.fields.filter((candidate) => candidate.line === field.line);
    const index = peers.findIndex((candidate) => candidate.id === field.id);
    return (
      <div className={`lwr-field ${dragged === field.id ? "lwr-dragging" : ""}`} key={field.id}
        draggable onDragStart={(event) => { event.dataTransfer.setData("text/plain", field.id); event.dataTransfer.effectAllowed = "move"; setDragged(field.id); }}
        onDragEnd={() => setDragged(null)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, field.line, field.id)}>
        <div className="lwr-field-title"><span className="lwr-grip" aria-hidden="true">⋮⋮</span><strong>{label}</strong></div>
        <div className="lwr-field-actions">
          <button type="button" aria-label={`Move ${label} left`} disabled={index === 0} onClick={() => nudge(field, -1)}>←</button>
          <button type="button" aria-label={`Move ${label} right`} disabled={index === peers.length - 1} onClick={() => nudge(field, 1)}>→</button>
          <select aria-label={`Line for ${label}`} value={field.line} onChange={(event) => move(field.id, event.target.value as FieldLine)}>
            <option value="primary">{isWarningIcon(field.id) ? "Beside name" : "First line"}</option>
            {!isWarningIcon(field.id) && <option value="secondary">Second line</option>}
            <option value="hidden" disabled={normalize(field.id) === "name"}>Hidden</option>
          </select>
        </div>
        {field.line !== "hidden" && !isWarningIcon(field.id) && <label className="lwr-width">{layout.autoSecondary && field.line === "secondary" ? "Automatic width" : "Width"}
          <input type="range" min="1" max="48" value={field.width} disabled={layout.autoSecondary && field.line === "secondary"} aria-label={`Width for ${label}`}
            onChange={(event) => update({ ...layout, fields: layout.fields.map((candidate) => candidate.id === field.id ? { ...candidate, width: Number(event.target.value) } : candidate) })} />
          <output>{field.width}</output>
        </label>}
      </div>
    );
  }

  function previewLine(line: "primary" | "secondary") {
    const fields = layout.fields.filter((field) => field.line === line && !isWarningIcon(field.id));
    const auto = line === "secondary" && layout.autoSecondary;
    return <div className={`lwr-preview-line lwr-preview-${line} ${auto ? "lwr-preview-auto" : ""}`} style={{ gridTemplateColumns: auto ? undefined : fields.map((field) => `minmax(0, ${field.width}fr)`).join(" ") }}>
      {fields.map((field, index) => {
        const column = info.get(field.id);
        const sample = column?.sample || examples[normalize(field.id)] || "—";
        const statusClass = ["status", "phase"].includes(normalize(field.id))
          ? /failed|error|crash|backoff/i.test(sample) ? "lwr-preview-error" : /running|ready|healthy|succeeded/i.test(sample) ? "lwr-preview-status" : ""
          : "";
        const groupStart = line === "secondary" && index > 0 && detailGroup(field.id) !== detailGroup(fields[index - 1].id);
        return <div className={`lwr-preview-value ${groupStart ? "lwr-preview-group" : ""}`} key={field.id} title={`${column?.label}: ${sample}`}>
          {(line === "primary" || layout.labels || auto) && <span className="lwr-preview-label">{column?.label}</span>}
          <span className={`${normalize(field.id) === "name" ? "lwr-preview-name" : ""} ${statusClass}`}>{sample}</span>
        </div>;
      })}
      {!fields.length && <span className="lwr-empty-line">No fields on this line</span>}
    </div>;
  }

  return <div className="lwr-editor">
    <div className="lwr-editor-toolbar">
      <label>View <select aria-label="Workload view" value={table.id} onChange={(event) => { setTableId(event.target.value); setDragged(null); }}>
        {tables.map((candidate) => <option key={candidate.id} value={candidate.id}>{candidate.id.replace(/-/g, " ")}</option>)}
      </select></label>
      <div className="lwr-presets"><span>Start from</span>
        <button type="button" onClick={() => update(defaultLayout(ids, "balanced"))}>Balanced</button>
        <button type="button" onClick={() => update(defaultLayout(ids, "troubleshooting"))}>Troubleshooting</button>
        <button type="button" onClick={() => update(defaultLayout(ids, "all"))}>All fields</button>
      </div>
    </div>
    <div className="lwr-preview" aria-label="Layout preview">
      <div className="lwr-section-label">Live preview</div>
      {previewLine("primary")}{previewLine("secondary")}
    </div>
    <p className="lwr-help">Drag fields between lines or change their dropdown. Arrows change order. Width shares space within each line.</p>
    <div className="lwr-lanes">
      {(["primary", "secondary"] as const).map((line) => <section className={`lwr-lane ${dragged ? "lwr-drop-ready" : ""}`} key={line}
        aria-label={lineNames[line]} onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, line)}>
        <h3>{lineNames[line]} <span>{layout.fields.filter((field) => field.line === line).length}</span></h3>
        {layout.fields.filter((field) => field.line === line).map(fieldCard)}
        {!layout.fields.some((field) => field.line === line) && <p className="lwr-empty-line">Drop a field here</p>}
      </section>)}
    </div>
    <section className="lwr-hidden" aria-label="Hidden fields" onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, "hidden")}>
      <h3>Hidden <span>{layout.fields.filter((field) => field.line === "hidden").length}</span></h3>
      <div className="lwr-hidden-list">{layout.fields.filter((field) => field.line === "hidden").map(fieldCard)}</div>
      {!layout.fields.some((field) => field.line === "hidden") && <p className="lwr-empty-line">Drop fields here to hide them</p>}
    </section>
    <div className="lwr-editor-options"><label><input type="checkbox" aria-label="Auto width for second line" checked={layout.autoSecondary} onChange={(event) => update({ ...layout, autoSecondary: event.target.checked })} /> Auto width for second line</label>
      <label><input type="checkbox" checked={layout.labels || layout.autoSecondary} disabled={layout.autoSecondary} onChange={(event) => update({ ...layout, labels: event.target.checked })} /> Label detail values</label>
      <span>Layouts save per workload type. Fields hidden in Lens’s column menu stay hidden.</span>
    </div>
    {layout.autoSecondary && <p className="lwr-help">Detail fields fit their text in each row. Long values shrink when space is limited. Manual widths are kept for when you switch this off.</p>}
    <div className="lwr-editor-footer"><button type="button" onClick={onCancel}>Cancel</button><button className="lwr-apply" type="button" onClick={() => onApply({ ...settings, tables: { ...drafts, [table.id]: preserveUnavailable(layout, drafts[table.id]) } })}>Apply layout</button></div>
  </div>;
};
