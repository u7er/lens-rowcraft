import { getFeature } from "@k8slens/feature-core";
import { asStylesheet } from "@k8slens/stylesheet-contracts";
import { layoutCss } from "./layout.ts";
import { workloadRowsToggle } from "./status.injectable";
import { editorCss } from "./editor-styles.ts";
import { layoutSettingsBunch, loadSettingsInjectable } from "./settings.injectable";
import { layoutEditorModalBunch, openEditorInjectable } from "./editor-modal.injectable";

const stylesheet = asStylesheet({ id: "lens-workload-rows/layout", css: layoutCss + editorCss });

export const workloadRowsFeature = getFeature({
  id: "lens-workload-rows",
  register: (di) => di.register(stylesheet, workloadRowsToggle, layoutSettingsBunch, loadSettingsInjectable, layoutEditorModalBunch, openEditorInjectable),
});
