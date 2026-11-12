import { doubleRowHeights, findWorkloadVirtualizer, type VirtualizerLike } from "./virtualizer.ts";
import { clearLayout, layoutRow } from "./layout.ts";
import { defaultLayout, fieldLabel, isControl, type TableCatalog, type TableLayout } from "./config.ts";

export type LayoutStatus = { active: number; unsupported: number };

export function startLayout(document: Document, report: (status: LayoutStatus) => void, options: {
  getLayout?: (tableId: string, ids: string[]) => TableLayout;
  onCatalog?: (tables: TableCatalog[]) => void;
  subscribe?: (refresh: () => void) => () => void;
} = {}): () => void {
  const window = document.defaultView!;
  const attached = new Map<HTMLElement, { tableId: string; virtualizer: VirtualizerLike; restore: () => void; root: HTMLElement }>();
  let frame = 0;
  let stopped = false;
  let lastReport = "";
  let lastCatalog = "";
  const resizeObserver = typeof window.ResizeObserver === "function" ? new window.ResizeObserver(() => schedule()) : undefined;

  function scan() {
    frame = 0;
    if (stopped) return;
    for (const [element, entry] of attached) {
      if (!element.isConnected) {
        resizeObserver?.unobserve(element);
        entry.restore();
        clearLayout(entry.root);
        attached.delete(element);
      }
    }
    let unsupported = 0;
    const catalogs = new Map<string, TableCatalog>();
    for (const element of document.querySelectorAll<HTMLElement>("[data-table-container-test]")) {
      let entry = attached.get(element);
      try {
        const found = findWorkloadVirtualizer(element);
        if (entry && (!found.workload || found.virtualizer !== entry.virtualizer)) {
          entry.restore();
          clearLayout(entry.root);
          attached.delete(element);
          resizeObserver?.unobserve(element);
          entry = undefined;
        }
        if (!entry) {
          if (!found.workload) continue;
          if (!found.virtualizer) { unsupported++; continue; }
          // In this Lens build, the header and scroll body are siblings.
          const root = element.parentElement;
          if (!root?.querySelector("[data-table-head-test]")) { unsupported++; continue; }
          entry = {
            tableId: found.tableId!,
            virtualizer: found.virtualizer,
            restore: doubleRowHeights(found.virtualizer, (callback) => { window.requestAnimationFrame(callback); }),
            root,
          };
          attached.set(element, entry);
          resizeObserver?.observe(element);
        }
      } catch {
        // Unsupported host shapes are deliberately left unchanged.
        unsupported++;
        continue;
      }
      const row = element.querySelector<HTMLElement>("[data-row]");
      const headerCells = Array.from(entry.root.querySelectorAll<HTMLElement>("[data-table-head-test] [data-column-id-test]"));
      const fields = headerCells.map((cell) => {
        const id = cell.getAttribute("data-column-id-test")!;
        const sample = Array.from(row?.children ?? []).find((child) => child.getAttribute("data-column-id") === id)?.textContent?.trim().slice(0, 256);
        return { id, label: cell.textContent?.trim() || fieldLabel(id), sample };
      }).filter((field) => !isControl(field.id));
      catalogs.set(entry.tableId, { id: entry.tableId, fields });
      const layout = options.getLayout?.(entry.tableId, fields.map((field) => field.id)) ?? defaultLayout(fields.map((field) => field.id));
      const labels = new Map(fields.map((field) => [field.id, field.label]));
      const virtualRows = entry.virtualizer.getVirtualItems() as { index: number }[];
      Array.from(element.querySelectorAll<HTMLElement>("[data-row]")).forEach((row, index) =>
        layoutRow(row, false, layout, labels, { index: virtualRows[index]?.index ?? index, availableWidth: element.clientWidth }));
      for (const header of entry.root.querySelectorAll<HTMLElement>("[data-table-head-test] > div")) layoutRow(header, true, layout, labels);
    }
    const status = { active: attached.size, unsupported };
    const signature = JSON.stringify(status);
    if (signature !== lastReport) { lastReport = signature; report(status); }
    const tables = [...catalogs.values()];
    const catalogSignature = JSON.stringify(tables.map((table) => ({ ...table, fields: table.fields.map(({ id, label }) => ({ id, label })) })));
    if (catalogSignature !== lastCatalog) { lastCatalog = catalogSignature; options.onCatalog?.(tables); }
  }

  function schedule() {
    if (!stopped && !frame) frame = window.requestAnimationFrame(scan);
  }
  const observer = new window.MutationObserver(schedule);
  observer.observe(document.body, { subtree: true, childList: true, characterData: true });
  document.fonts?.ready.then(schedule).catch(() => {});
  // A fiber's layout effect may finish after the DOM mutation that introduced it.
  const retry = window.setInterval(schedule, 1000);
  const unsubscribe = options.subscribe?.(schedule);
  schedule();

  return () => {
    stopped = true;
    observer.disconnect();
    resizeObserver?.disconnect();
    unsubscribe?.();
    window.clearInterval(retry);
    window.cancelAnimationFrame(frame);
    for (const { restore, root } of attached.values()) {
      restore();
      clearLayout(root);
    }
    attached.clear();
  };
}
