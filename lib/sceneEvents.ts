/**
 * Scene event bus.
 * GSAP timelines emit "scene active" events; React components subscribe
 * to fire anime.js animations at the right scroll position.
 */

type Listener = () => void;

const registry = new Map<string, Listener[]>();
const fired    = new Set<string>();

export function onSceneActive(name: string, fn: Listener): () => void {
  if (!registry.has(name)) registry.set(name, []);
  registry.get(name)!.push(fn);

  // If already fired this session, call immediately
  if (fired.has(name)) fn();

  return () => {
    const arr = registry.get(name);
    if (!arr) return;
    const i = arr.indexOf(fn);
    if (i !== -1) arr.splice(i, 1);
  };
}

export function emitSceneActive(name: string): void {
  if (fired.has(name)) return;
  fired.add(name);
  registry.get(name)?.forEach((fn) => fn());
}

/** Call to reset all fired flags (e.g. on hot reload) */
export function resetSceneEvents(): void {
  fired.clear();
}
