import type { DishHistory } from './types';
import { getHandle } from './transport';

export function parseHistory(raw: unknown): DishHistory | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const h = (raw as any)?.dishGetHistory;
  if (!h) return null;

  return {
    current: Number(h.current ?? 0),
    pingLatencyMs: h.popPingLatencyMs ?? [],
    pingDropRate: h.popPingDropRate ?? [],
    downlinkThroughputBps: h.downlinkThroughputBps ?? [],
    uplinkThroughputBps: h.uplinkThroughputBps ?? [],
  };
}

export function getHistory(): Promise<DishHistory | null> {
  const handle = getHandle();
  if (!handle) return Promise.resolve(null);
  return new Promise((resolve) => {
    handle({ getHistory: {} }, (err, response) => {
      if (err) { resolve(null); return; }
      resolve(parseHistory(response));
    });
  });
}
