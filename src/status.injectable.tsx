import { getInjectable2 } from "@k8slens/injectable";
import { statusBarItemInjectionToken } from "@k8slens/status-bar-contracts";
import { useEffect, useRef, useState } from "react";
import { useSyncInject } from "@k8slens/use-inject";
import { reaction, runInAction } from "mobx";
import { startLayout, type LayoutStatus } from "./controller.ts";
import { emptySettings, resolveLayout, sanitizeSettings, type LayoutSettings, type TableCatalog } from "./config.ts";
import { loadSettingsInjectable, type SettingsBox } from "./settings.injectable";
import { openEditorInjectable } from "./editor-modal.injectable";

const Toggle = () => {
  const loadSettings = useSyncInject(loadSettingsInjectable);
  const openEditor = useSyncInject(openEditorInjectable);
  const [settings, setSettings] = useState<LayoutSettings>(emptySettings);
  const [box, setBox] = useState<SettingsBox | null>(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [tables, setTables] = useState<TableCatalog[]>([]);
  const settingsRef = useRef(settings);
  const refresh = useRef<() => void>(() => {});
  const [status, setStatus] = useState<LayoutStatus>({ active: 0, unsupported: 0 });
  useEffect(() => {
    let cancelled = false;
    let dispose: (() => void) | undefined;
    loadSettings().then((value) => {
      if (cancelled) return;
      setBox(value);
      setSettings(sanitizeSettings(value.get()));
      dispose = reaction(() => value.get(), (next) => setSettings(sanitizeSettings(next)));
    }).catch(() => { if (!cancelled) setError("Could not load layout settings. Reload the extension to retry."); });
    return () => { cancelled = true; dispose?.(); };
  }, [loadSettings]);
  useEffect(() => {
    settingsRef.current = settings;
    refresh.current();
  }, [settings]);
  useEffect(() => {
    if (!box || !settings.enabled) return;
    return startLayout(document, setStatus, {
      getLayout: (tableId, ids) => resolveLayout(ids, settingsRef.current.tables[tableId]),
      onCatalog: setTables,
      subscribe: (callback) => { refresh.current = callback; return () => { refresh.current = () => {}; }; },
    });
  }, [box, settings.enabled]);
  function save(value: LayoutSettings) {
    if (!box) return;
    runInAction(() => box.set(sanitizeSettings(value)));
  }
  async function edit() {
    if (editing) return;
    setEditing(true);
    try {
      const result = await openEditor(tables, settings);
      if (result) save(result);
    } catch { setError("Could not open the layout editor. Reload the extension to retry."); }
    finally { setEditing(false); }
  }
  const label = error ? "Rows: error" : !box ? "Rows: loading" : !settings.enabled ? "Rows: normal" : status.unsupported ? "Rows: unsupported" : "Rows: 2 lines";
  return (
    <span style={{ display: "inline-flex", gap: "5px" }}><button
      className="lwr-toggle"
      type="button"
      disabled={!box}
      aria-pressed={settings.enabled}
      title={error || (settings.enabled
        ? `Two-line layout on ${status.active} workload table(s). Click to restore normal rows.`
        : "Click to enable the two-line workload layout.")}
      onClick={() => save({ ...settings, enabled: !settings.enabled })}
    >{label}</button><button className="lwr-toggle" type="button" disabled={!box || !tables.length || editing || !settings.enabled}
      title="Configure field placement, order, widths and visibility" onClick={edit}>Layout…</button></span>
  );
};

export const workloadRowsToggle = getInjectable2({
  id: "lens-workload-rows.toggle",
  instantiate: () => () => ({ Component: Toggle, position: "right" as const, orderNumber: 90 }),
  injectionToken: statusBarItemInjectionToken,
});
