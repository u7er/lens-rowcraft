import { getInjectable2 } from "@k8slens/injectable";
import { getPersistableValueInjectableBunch } from "@k8slens/persistable-contracts";
import { emptySettings, type LayoutSettings } from "./config.ts";

export type SettingsBox = { get: () => LayoutSettings; set: (value: LayoutSettings) => void };

export const layoutSettingsBunch = getPersistableValueInjectableBunch<LayoutSettings>()({
  id: "layout-settings",
  defaultValue: { instantiate: () => async () => emptySettings },
});

export const loadSettingsInjectable = getInjectable2({
  id: "lens-workload-rows.load-settings",
  instantiate: (di) => {
    const load = di.inject(layoutSettingsBunch.persistable);
    const loadSettings = (): Promise<SettingsBox> => load();
    return () => loadSettings;
  },
});
