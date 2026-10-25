let counter = 0;

/** Collision-resistant local id; no crypto dependency needed for on-device records. */
export function uid(): string {
  counter = (counter + 1) % 1_000_000;
  return `${Date.now().toString(36)}-${counter.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
