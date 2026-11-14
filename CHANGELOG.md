## 0.3.2

- Keep positive grid spans for extreme field-width settings.
- Preserve saved settings for columns temporarily hidden through Lens when applying editor changes.
- Clear previous row styling if the host row structure becomes unsupported.

- Add marketplace installation guidance, troubleshooting, and a standalone editor screenshot.
- Discover Chrome and Edge across Windows, macOS, and Linux for browser checks and preview capture.
- Rebuild packages before packing and run Lens's publishing compatibility guard before npm publication.

- Prepare the Rowcraft GitHub distribution with Apache 2.0 licensing, repository metadata and a prebuilt extension.
- Use generic example workloads in previews and tests.

## 0.3.1

- Move the subtle row tint to the first line and keep detail lines plain, including in the layout preview.

## 0.3.0

- Separate workloads with subtle alternating backgrounds and clearer row boundaries.
- Tint the detail line, add separators between adjacent semantic groups and show compact status badges.
- Keep warning icons beside the workload name without a `status icon` caption.
- Add an optional content-sized second line, calculated separately for each workload. Long fields shrink when space is limited.
- Preserve manual width choices when automatic sizing is enabled; recompute on content and window-size changes.

## 0.2.0

- Add a visual layout editor with live preview, drag-and-drop and keyboard controls.
- Configure each field's line, order, width and visibility; save layouts per workload type across restarts.
- Add Balanced, Troubleshooting and All fields presets.
- Show labeled detail values with a simpler header; emphasize workload names.

## 0.1.0

- Add experimental two-line layouts for workload lists.
- Place name, status and controller on the first line and remaining fields on the second.
- Double virtualized row measurements and provide a status-bar toggle to restore normal rows.
