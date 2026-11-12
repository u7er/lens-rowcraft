import { createRoot } from "react-dom/client";
import { LayoutEditor } from "../src/editor";
import { emptySettings, fieldLabel, sanitizeSettings } from "../src/config";

const host = window as typeof window & { openai?: {
  widgetState?: { modelContent?: { workloadLayout?: unknown } };
  setWidgetState?: (value: unknown) => Promise<void>;
} };
const fields = ["name", "status", "age", "namespace", "owners", "cpu", "memory", "restarts", "node", "containers", "qos"].map((id) => ({ id, label: fieldLabel(id) }));
const tables = [{ id: "pods", fields }, { id: "deployments", fields: fields.filter((field) => field.id !== "owners" && field.id !== "node") }];
const root = createRoot(document.getElementById("workload-layout-editor")!);
let settings = sanitizeSettings(host.openai?.widgetState?.modelContent?.workloadLayout ?? emptySettings);
let generation = 0;
function render() {
  root.render(<LayoutEditor key={generation} tables={tables} settings={settings}
    onApply={(value) => {
      settings = sanitizeSettings(value);
      host.openai?.setWidgetState?.({ modelContent: { workloadLayout: settings }, privateContent: null }).catch(() => {});
      document.getElementById("workload-layout-result")!.textContent = "Preview saved. Lens layouts are saved separately through the extension.";
    }}
    onCancel={() => { generation++; render(); document.getElementById("workload-layout-result")!.textContent = "Unsaved changes discarded."; }} />);
}
window.addEventListener("openai:set_globals", (event) => {
  const value = (event as CustomEvent).detail?.globals?.widgetState?.modelContent?.workloadLayout;
  if (value) { settings = sanitizeSettings(value); generation++; render(); }
});
render();
