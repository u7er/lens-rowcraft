export type NaturalWidth = { id: string; preferred: number; minimum: number };
export type FittedWidth = { id: string; offset: number; width: number };

/** Keep short fields at their natural width; shrink long fields only when space runs out. */
export function fitNaturalWidths(fields: NaturalWidth[], available: number): FittedWidth[] {
  available = Math.max(0, Number.isFinite(available) ? available : 0);
  const preferred = fields.map((field) => Math.max(0, field.preferred));
  const minimum = fields.map((field, index) => Math.max(0, Math.min(preferred[index], field.minimum)));
  const total = preferred.reduce((sum, width) => sum + width, 0);
  const floor = minimum.reduce((sum, width) => sum + width, 0);
  let widths = preferred;
  if (total > available) {
    widths = floor >= available
      ? minimum.map((width) => floor ? width * available / floor : 0)
      : preferred.map((width, index) => width - (width - minimum[index]) * (total - available) / (total - floor));
  }
  let offset = 0;
  return fields.map((field, index) => {
    const result = { id: field.id, offset, width: widths[index] };
    offset += widths[index];
    return result;
  });
}

const contexts = new WeakMap<Document, { context: CanvasRenderingContext2D | null; cache: Map<string, number> }>();

export function measureText(document: Document, text: string, font: string): number {
  let state = contexts.get(document);
  if (!state) {
    // Tests and non-browser environments can lack canvas support.
    const supported = typeof document.defaultView?.CanvasRenderingContext2D === "function";
    state = { context: supported ? document.createElement("canvas").getContext("2d") : null, cache: new Map() };
    contexts.set(document, state);
  }
  const key = `${font}\n${text}`;
  const cached = state.cache.get(key);
  if (cached !== undefined) return cached;
  let width: number;
  if (state.context) {
    state.context.font = font;
    width = state.context.measureText(text).width;
  } else width = text.length * (Number.parseFloat(font.match(/[\d.]+px/)?.[0] ?? "13") * 0.55);
  if (state.cache.size > 2048) state.cache.clear();
  state.cache.set(key, width);
  return width;
}
