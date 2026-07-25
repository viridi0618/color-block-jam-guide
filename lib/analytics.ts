/** Lightweight analytics helper. No-op when gtag is unavailable. */
export function track(
  eventName: string,
  params?: Record<string, string | number>,
): void {
  if (typeof window === "undefined") return;
  const w = window as Window & { gtag?: (...args: unknown[]) => void };
  if (!w.gtag) return;
  try {
    w.gtag("event", eventName, params);
  } catch {
    // silently ignore analytics failures
  }
}