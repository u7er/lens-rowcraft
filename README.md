# Rowcraft for Lens

Customize workload rows in Lens Kubernetes IDE with a visual layout editor, two-line layouts, automatic field widths, and per-view settings.

**Experimental extension.** Targets Lens **2026.11.91422-latest** using an internal row-layout adapter. Live Lens verification is still required before the first public release.

![Standalone layout editor preview with example workloads](assets/screenshots/layout-editor.png)

The screenshot shows the standalone editor preview, using example workloads.

- Balanced layout: **Name**, **Status** and **Age** on the first line, with labeled details underneath.
- Move any field between lines, change its order and share of space, or hide it.
- Checkboxes and action menus remain at the edges, spanning both lines.

Works on Pods, Deployments, DaemonSets, StatefulSets, ReplicaSets, ReplicationControllers, Jobs and CronJobs. It keeps the original cells, links, sorting and row actions. Configure widths in the layout editor; regular header resizing is disabled while the layout is enabled. Names may still truncate if longer than the available width.

Click **Layout…** in the bottom status bar to open the editor. Drag fields between **First line**, **Second line** and **Hidden**, or use the dropdowns and arrow buttons. Width sliders change the space each field receives within its line. The live preview updates before applying; **Cancel** discards unsaved changes. **Apply layout** saves changes through Lens, per workload type, across restarts and clusters.

Choose **Balanced**, **Troubleshooting**, or **All fields** as a starting point. Balanced hides QoS and Containers; All fields restores every field currently available in the Lens table. Fields hidden using Lens's own column menu must first be made visible there. Name remains visible; checkboxes and action menus stay at the edges. Toggle **Label detail values** to choose between inline detail labels and a full two-line header.

Enable **Auto width for second line** in the editor to size each detail field to its own text in each workload. Short metrics stay compact; long values receive more room and shrink when necessary. Fields remain on one detail line. Inline labels stay visible in this mode because detail positions can differ between workloads. Manual second-line width sliders are disabled while automatic sizing is enabled, and their values are restored when it is switched off. This choice is saved per workload type and is off by default, including for existing layouts.

Workloads have a subtly tinted first line, alternating between records, and a plain detail line. Resources such as CPU and Memory, relations such as controller and node, and QoS are separated where adjacent groups change; your configured field order is preserved. Status values appear as compact badges. The optional **Warnings** field displays its indicator beside the workload name and stays empty when there are no warnings.

Use **Rows: 2 lines** to switch back to **Rows: normal**. Your toggle choice is also saved. Disabling or removing the extension restores the original layout.

## Install from Marketplace

Once the first npm release is published, open **Extensions** in Lens, search for **lens-rowcraft**, check the publisher, and choose **Install**. Open a supported workload view and use **Layout…** in the status bar to configure it.

Marketplace installation requires Lens Plus, Pro, Enterprise, or an active trial. See the [Lens Marketplace](https://lenshq.io/extensions) and [Lens extension announcement](https://lenshq.io/blog/lens-release-2026-10). The package is not published yet.

## Install locally

Clone or download this repository into a permanent folder. The repository includes a ready-to-load `dist/index.js`; building is only required when changing the code.

In Lens, open **Preferences > Extensions > Install from File System** and select this folder's **package.json**. Keep the folder in place: Lens loads the extension directly from it. Open a workload list to try the layout, then click **Layout…** in the bottom-right status bar.

For build instructions and the standalone editor preview, see [DEVELOPMENT.md](DEVELOPMENT.md).

## Troubleshooting and feedback

- If a view looks wrong, use **Rows: 2 lines** to restore normal rows, or disable the extension in Lens.
- If a field is missing, first enable it in Lens's own column menu, then check the editor's **Hidden** group.
- If a Lens update stops the layout working, disable Rowcraft until compatibility is verified.
- Report problems through the repository's issue tracker once it is public. Include Lens version, OS, workload type, reproduction steps, and a screenshot with sensitive details removed. Do not include kubeconfigs, tokens, or private workload data.

## Compatibility

Prototype targets **Lens 2026.11.91422-latest**. Lens has no public row-height or row-layout extension API. This extension therefore uses an experimental adapter to locate the workload table's React-owned virtualizer, double its row measurements and apply a two-line CSS grid. It does not modify Lens application files or Kubernetes resources, and makes no network requests.

Unknown table structures are left unchanged. A future Lens update may require an adapter update. If the layout misbehaves, turn it off using the status-bar button or disable the extension in Lens. Automated checks cover the layout editor, configuration validation, field placement, row measurement, scrolling, React updates and restoration. The visual editor and Lens persistence integration still need live Lens verification.

## License

Copyright 2026 Pavel Manakov. Licensed under [Apache License 2.0](LICENSE). See [NOTICE](NOTICE) for attribution.
