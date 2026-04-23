import { describe, it, expect, afterEach } from 'vitest';
import { reboot, speedTest } from '../src/control';
import { setHandle, clearHandle } from '../src/transport';
import { useMock } from '../src/mock';
import type { SpeedTestProgress } from '../src/types';

describe('reboot()', () => {
  afterEach(() => clearHandle());

  it('returns false when not connected', async () => {
    expect(await reboot()).toBe(false);
  });

  it('sends { reboot: {} } and returns true on success', async () => {
    let capturedRequest: unknown;
    setHandle((req, cb) => { capturedRequest = req; cb(null, { reboot: {} }); });

    const result = await reboot();

    expect(capturedRequest).toEqual({ reboot: {} });
    expect(result).toBe(true);
  });

  it('returns false on gRPC error', async () => {
    setHandle((_req, cb) => cb(new Error('connection refused') as any, null));
    expect(await reboot()).toBe(false);
  });
});

describe('speedTest()', () => {
  afterEach(() => clearHandle());

  it('returns a SpeedTestResult in mock mode', async () => {
    useMock();
    const r = await speedTest();
    expect(r).not.toBeNull();
    expect(r!.downloadMbps).toBeGreaterThan(0);
    expect(r!.uploadMbps).toBeGreaterThan(0);
    expect(typeof r!.latencyMs).toBe('number');
  });

  it('returns null in mock mode with faultRate 1', async () => {
    useMock({ faultRate: 1 });
    expect(await speedTest()).toBeNull();
  });

  it('calls onProgress with download and upload phases in mock mode', async () => {
    useMock();
    const events: SpeedTestProgress[] = [];
    await speedTest(30_000, (p) => events.push(p));
    expect(events.some((e) => e.phase === 'download')).toBe(true);
    expect(events.some((e) => e.phase === 'upload')).toBe(true);
    expect(events.find((e) => e.phase === 'download')!.progressFraction).toBe(1);
    expect(events.find((e) => e.phase === 'upload')!.progressFraction).toBe(1);
  });

  it('reports correct speeds in mock progress events', async () => {
    useMock();
    const events: SpeedTestProgress[] = [];
    const r = await speedTest(30_000, (p) => events.push(p));
    const dl = events.find((e) => e.phase === 'download');
    const ul = events.find((e) => e.phase === 'upload');
    expect(dl!.currentMbps).toBeCloseTo(r!.downloadMbps);
    expect(ul!.currentMbps).toBeCloseTo(r!.uploadMbps);
  });
});
