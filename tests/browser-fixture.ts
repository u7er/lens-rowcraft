import { defaultLayout, resolveLayout } from "../src/config";
import { clearLayout, layoutCss, layoutRow } from "../src/layout";

const style = document.createElement("style");
style.textContent = `
body { font: 14px system-ui; margin: 16px; color: #263548; --textColorPrimary: #263548; --textColorSecondary: #6d7889; --borderColor: #d5dde7; }
#table { position: relative; height: 300px; width: 100%; }
[data-row] { display: flex; position: absolute; top: 0; left: 0; width: 100%; height: 80px; }
[data-column-id] { display: flex; align-items: center; overflow: hidden; white-space: nowrap; }
.TableCell { display: flex; align-items: center; padding: 8px; overflow: hidden; min-width: 0; }
.TableCell a, .TableCell span { text-overflow: ellipsis; overflow: hidden; white-space: nowrap; }
a { color: #247abc; } [data-column-id="status"] span { color: #25824f; }
` + layoutCss;
document.head.append(style);
const table = document.createElement("div");
table.id = "table";
document.body.append(table);
const ids = ["id-0", "name", "status-icon", "namespace", "status", "age", "cpu", "memory", "owners", "node", "qos", "menu"];
const layout = defaultLayout(ids, "all");
layout.fields = layout.fields.map((field) => ({ ...field, line: ["name", "status", "age", "status-icon"].includes(field.id) ? "primary" : "secondary" }));
const values = [
  { name: "example-api-65df569ff6-abc12", namespace: "example-app", cpu: "0.000", memory: "104.6 MiB", node: "worker-node-eu-west-01-long-example", owners: "ReplicaSet", qos: "Burstable", status: "Running", age: "20h" },
  { name: "example-worker-6dffc76f7b-def34", namespace: "example-app", cpu: "1.125", memory: "16.2 MiB", node: "short-node", owners: "ReplicaSet", qos: "BestEffort", status: "Running", age: "7d23h" },
];
let clicks = 0;
values.forEach((values, index) => {
  const row = document.createElement("div");
  row.setAttribute("data-row", String(index));
  row.style.transform = `translateY(${index * 80}px)`;
  for (const id of ids) {
    const cell = document.createElement("div");
    cell.setAttribute("data-column-id", id);
    cell.style.width = "120px";
    const content = document.createElement("div");
    content.className = "TableCell";
    if (id === "status-icon") {
      if (!index) { const button = document.createElement("button"); button.textContent = "!"; button.onclick = () => clicks++; content.append(button); }
    } else {
      const link = document.createElement(["node", "owners", "namespace", "name"].includes(id) ? "a" : "span");
      link.textContent = values[id as keyof typeof values] ?? "";
      link.onclick = () => clicks++;
      content.append(link);
    }
    cell.append(content);
    row.append(cell);
  }
  table.append(row);
});

function apply(auto = true) {
  const config = resolveLayout(ids, { ...layout, autoSecondary: auto, labels: true });
  table.querySelectorAll<HTMLElement>("[data-row]").forEach((row, index) => layoutRow(row, false, config, undefined, { availableWidth: table.clientWidth, index }));
}
Object.assign(window, { fixture: { apply, clear: () => clearLayout(table), clicks: () => clicks } });
apply();
