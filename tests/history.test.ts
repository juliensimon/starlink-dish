import { describe, it, expect, afterEach } from 'vitest';
import { parseHistory, getHistory } from '../src/history';
import { setHandle, clearHandle } from '../src/transport';

describe('parseHistory()', () => {
  it('maps dishGetHistory fields to DishHistory', () => {
    const raw = {
      dishGetHistory: {
        current: 3600,
        popPingLatencyMs: [25.0, 28.0, 31.0],
        popPingDropRate: [0.001, 0.002, 0.0],
        downlinkThroughputBps: [100_000_000, 110_000_000, 95_000_000],
        uplinkThroughputBps: [10_000_000, 12_000_000, 9_000_000],
      },
    };

    const h = parseHistory(raw);

    expect(h).not.toBeNull();
    expect(h!.current).toBe(3600);
    expect(h!.pingLatencyMs).toEqual([25.0, 28.0, 31.0]);
    expect(h!.pingDropRate).toEqual([0.001, 0.002, 0.0]);
    expect(h!.downlinkThroughputBps).toEqual([100_000_000, 110_000_000, 95_000_000]);
    expect(h!.uplinkThroughputBps).toEqual([10_000_000, 12_000_000, 9_000_000]);
  });

  it('returns null when dishGetHistory is absent', () => {
    expect(parseHistory(null)).toBeNull();
    expect(parseHistory({})).toBeNull();
    expect(parseHistory({ dishGetStatus: {} })).toBeNull();
  });

  it('uses empty arrays when array fields are missing', () => {
    const h = parseHistory({ dishGetHistory: { current: 0 } })!;
    expect(h.pingLatencyMs).toEqual([]);
    expect(h.pingDropRate).toEqual([]);
    expect(h.downlinkThroughputBps).toEqual([]);
    expect(h.uplinkThroughputBps).toEqual([]);
  });
});

describe('getHistory()', () => {
  afterEach(() => clearHandle());

  it('returns null when not connected', async () => {
    expect(await getHistory()).toBeNull();
  });

  it('calls handle with { getHistory: {} } and returns parsed history', async () => {
    const raw = {
      dishGetHistory: {
        current: 10,
        popPingLatencyMs: [30.0],
        popPingDropRate: [0.0],
        downlinkThroughputBps: [80_000_000],
        uplinkThroughputBps: [8_000_000],
      },
    };
    let capturedRequest: unknown;
    setHandle((req, cb) => { capturedRequest = req; cb(null, raw); });

    const history = await getHistory();

    expect(capturedRequest).toEqual({ getHistory: {} });
    expect(history).not.toBeNull();
    expect(history!.pingLatencyMs).toEqual([30.0]);
  });

  it('returns null when handle returns an error', async () => {
    setHandle((_req, cb) => cb(new Error('network error') as any, null));
    expect(await getHistory()).toBeNull();
  });

  it('returns null when handle returns null response', async () => {
    setHandle((_req, cb) => cb(null, null));
    expect(await getHistory()).toBeNull();
  });
});
