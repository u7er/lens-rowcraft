/** Experimental adapter: Lens currently exposes no public row-height contribution. */
export interface VirtualizerOptions {
  count: number;
  estimateSize: (index: number) => number;
  getScrollElement: () => Element | null;
  [key: string]: unknown;
}

export interface VirtualizerLike {
  options: VirtualizerOptions;
  setOptions: (options: VirtualizerOptions) => void;
  measure: () => void;
  getVirtualItems: () => unknown[];
  scrollToOffset: (offset: number) => void;
  scrollOffset: number | null;
}

export function doubleRowHeights(
  virtualizer: VirtualizerLike,
  afterRender: (callback: () => void) => void = (callback) => callback(),
): () => void {
  const originalSetOptions = virtualizer.setOptions;
  let baseOptions = virtualizer.options;
  let baseEstimate = baseOptions.estimateSize;
  let active = true;
  const scaledEstimate = (index: number) => baseEstimate(index) * 2;

  const setOptions = (options: VirtualizerOptions) => {
    if (options.estimateSize !== scaledEstimate) baseEstimate = options.estimateSize;
    baseOptions = { ...options, estimateSize: baseEstimate };
    originalSetOptions.call(virtualizer, { ...options, estimateSize: scaledEstimate });
  };

  const originalOffset = virtualizer.scrollOffset ?? 0;
  virtualizer.setOptions = setOptions;
  try {
    setOptions(baseOptions);
    virtualizer.measure();
    // The scroll spacer must render its new height before a near-bottom offset is applied.
    afterRender(() => { if (active) virtualizer.scrollToOffset(originalOffset * 2); });
  } catch (error) {
    virtualizer.setOptions = originalSetOptions;
    originalSetOptions.call(virtualizer, baseOptions);
    virtualizer.measure();
    throw error;
  }

  return () => {
    if (!active) return;
    active = false;
    const offset = (virtualizer.scrollOffset ?? 0) / 2;
    // Do not overwrite an adapter installed by something else after ours.
    if (virtualizer.setOptions !== setOptions) return;
    virtualizer.setOptions = originalSetOptions;
    originalSetOptions.call(virtualizer, baseOptions);
    virtualizer.measure();
    afterRender(() => {
      if (virtualizer.setOptions === originalSetOptions) virtualizer.scrollToOffset(offset);
    });
  };
}

type Fiber = {
  return?: Fiber | null;
  alternate?: Fiber | null;
  memoizedProps?: { tableId?: unknown };
  memoizedState?: Hook | null;
  stateNode?: { current?: Fiber };
};
type Hook = { memoizedState?: unknown; next?: Hook | null };

const workloads = new Set([
  "pods", "deployments", "daemon-sets", "stateful-sets", "replica-sets",
  "replication-controllers", "jobs", "cron-jobs",
]);

function isVirtualizer(value: unknown, element: Element): value is VirtualizerLike {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<VirtualizerLike>;
  return typeof v.setOptions === "function" && typeof v.measure === "function" &&
    typeof v.getVirtualItems === "function" && typeof v.scrollToOffset === "function" &&
    typeof v.options?.estimateSize === "function" &&
    v.options.getScrollElement() === element;
}

/** Reads only the owning component's hook list, never the whole React tree. */
export function findWorkloadVirtualizer(element: Element): {
  workload: boolean;
  virtualizer?: VirtualizerLike;
  tableId?: string;
} {
  const key = Object.keys(element).find((name) => name.startsWith("__reactFiber$"));
  if (!key) return { workload: false };
  const node = element as unknown as Record<string, Fiber>;
  let fiber: Fiber | null | undefined = node[key];
  // A DOM node can retain the previous fiber after React swaps its double buffer.
  let root = fiber;
  for (let depth = 0; root?.return && depth < 128; depth++) root = root.return;
  if (root?.stateNode?.current && root.stateNode.current !== root && fiber?.alternate) fiber = fiber.alternate;
  for (let depth = 0; fiber && depth < 64; depth++, fiber = fiber.return) {
    const tableId = fiber.memoizedProps?.tableId;
    if (typeof tableId !== "string") continue;
    if (!workloads.has(tableId)) return { workload: false };
    for (const owner of [fiber, fiber.alternate]) {
      let hook = owner?.memoizedState;
      for (let count = 0; hook && count < 128; count++, hook = hook.next) {
        const state = hook.memoizedState;
        const candidates = [state];
        if (state && typeof state === "object" && "current" in state) candidates.push(state.current);
        for (const candidate of candidates) {
          if (isVirtualizer(candidate, element)) return { workload: true, virtualizer: candidate, tableId };
        }
      }
    }
    return { workload: true };
  }
  return { workload: false };
}
