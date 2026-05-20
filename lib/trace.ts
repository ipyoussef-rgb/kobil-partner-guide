/**
 * Tiny trace helper used by every /api/* route so the partner developer can
 * always see what the server actually did. Each step records:
 *   { ts, step, url?, method?, status?, durationMs?, note?, error?, … }
 *
 * Routes return `trace` on every response (success or failure). The agent's
 * Debug panel aggregates traces from every call and shows them inline.
 */

export type TraceStep = {
  ts: number;
  step: string;
  url?: string;
  method?: string;
  status?: number;
  durationMs?: number;
  note?: string;
  error?: string;
  [k: string]: unknown;
};

const ROUTE_TAG = (() => {
  if (typeof process !== "undefined" && process.env?.VERCEL_REGION) {
    return `vercel-${process.env.VERCEL_REGION}`;
  }
  return "local";
})();

export class Trace {
  private entries: TraceStep[] = [];
  private readonly route: string;
  private readonly traceId: string;

  constructor(route: string) {
    this.route = route;
    this.traceId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? (crypto as Crypto & { randomUUID(): string }).randomUUID().slice(0, 8)
        : Math.random().toString(36).slice(2, 10);
  }

  push(step: string, fields: Partial<TraceStep> = {}): TraceStep {
    const entry: TraceStep = { ts: Date.now(), step, ...fields };
    this.entries.push(entry);
    // Vercel function logs (one structured line per step).
    try {
      // eslint-disable-next-line no-console
      console.log(
        `[${ROUTE_TAG}] ${this.route} t=${this.traceId} ${step}${
          entry.url ? ` ${entry.method ?? "GET"} ${entry.url}` : ""
        }${entry.status !== undefined ? ` → ${entry.status}` : ""}${
          entry.durationMs !== undefined ? ` (${entry.durationMs}ms)` : ""
        }${entry.error ? ` err=${entry.error}` : ""}${entry.note ? ` note=${entry.note}` : ""}`,
      );
    } catch {
      /* never throw from logging */
    }
    return entry;
  }

  /**
   * Wrap a fetch call: record start, await, record end with status + timing.
   * Returns the Response (still consumable for body).
   */
  async wrapFetch(
    step: string,
    url: string,
    init: RequestInit = {},
    extra: Partial<TraceStep> = {},
  ): Promise<{ response: Response; durationMs: number; entry: TraceStep }> {
    const t0 = Date.now();
    const method = init.method ?? "GET";
    const entry = this.push(step, { url, method, ...extra });
    try {
      const response = await fetch(url, init);
      const durationMs = Date.now() - t0;
      this.push(`${step}-done`, {
        url,
        method,
        status: response.status,
        durationMs,
      });
      entry.status = response.status;
      entry.durationMs = durationMs;
      return { response, durationMs, entry };
    } catch (e) {
      const durationMs = Date.now() - t0;
      const error = e instanceof Error ? e.message : String(e);
      this.push(`${step}-failed`, { url, method, durationMs, error });
      entry.error = error;
      entry.durationMs = durationMs;
      throw e;
    }
  }

  toArray(): TraceStep[] {
    return this.entries;
  }

  meta(): { traceId: string; route: string } {
    return { traceId: this.traceId, route: this.route };
  }
}
