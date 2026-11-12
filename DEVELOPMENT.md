# Development

Requirements: Node.js 22.18 or later and npm.

```sh
npm ci
npm test
npm run test:browser
npm run build
npm run preview
npm pack
```

Install the resulting package through Lens's local extension installer. The archive includes the built CommonJS entrypoint. Keep source development here; do not change Lens's application bundle.

The only unsupported dependency is the adapter in `src/virtualizer.ts`: DOM React fiber names, the owning table's `tableId` prop, and the virtualizer's methods and options. The adapter patches `setOptions` to scale only row estimates and calls `measure()` to discard cached measurements. Lens continues to calculate visible rows, scroll offsets, total height and row placement. Restoration preserves current host options and the approximate top row.

The layout never reparents React-owned elements. It uses CSS grid placements on the original cells. Only tables identified by a workload `tableId`, with a matching virtualizer scroll element and a sibling header, are modified.

Automatic detail widths use canvas text measurement with the cell's font, including label and group-spacing widths. Short fields retain their natural width when possible. When content exceeds available space, long fields shrink toward minimums before all fields are reduced further. Detail cells remain original React-owned elements, positioned inside the second grid row. ResizeObserver, text mutations and loaded fonts refresh measurements. Browser geometry checks use an isolated headless Chrome process and a synthetic local fixture; override `CHROME_PATH` if Chrome is installed elsewhere.

Settings use Lens's `getPersistableValueInjectableBunch`, scoped to the existing feature id and keyed by workload table id inside the stored value. There is no cluster data in persisted settings. The editor uses the public modal API and returns a draft only when Apply is selected. The controller reads updated settings without replacing the row-height adapter. Standalone preview choices stay separate from Lens settings.

Before distribution, verify in Lens with a large workload list: scrolling to the end, sorting, filtering, changing visible columns, namespace selection, row selection, details, menus, switching tabs, toggling off and disabling the extension. Use the installed build's generated extension dependency versions when rebuilding after a Lens upgrade.
