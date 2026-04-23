import { describe, it, expect, afterEach } from 'vitest';
import { reboot, speedTest } from '../src/control';
import { setHandle, clearHandle } from '../src/transport';

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

  it('returns null when not connected', async () => {
    expect(await speedTest()).toBeNull();
  });

  it('sends start + poll and returns SpeedTestResult', async () => {
    const requests: unknown[] = [];
    setHandle((req: any, cb) => {
      requests.push(req);
      if (req.startSpeedtest !== undefined) {
        cb(null, { startSpeedtest: {} });
      } else if (req.getSpeedtestResult !== undefined) {
        cb(null, {
          getSpeedtestResult: { downloadBps: 100_000_000, uploadBps: 10_000_000, latencyMs: 25.0, running: false }
        });
      }
    });

    const result = await speedTest();

    expect(result).not.toBeNull();
    expect(result!.downloadMbps).toBeCloseTo(100);
    expect(result!.uploadMbps).toBeCloseTo(10);
    expect(result!.latencyMs).toBe(25.0);
    expect(requests[0]).toEqual({ startSpeedtest: {} });
    expect(requests[1]).toEqual({ getSpeedtestResult: {} });
  });

  it('returns null on gRPC error during start', async () => {
    setHandle((_req, cb) => cb(new Error('error') as any, null));
    expect(await speedTest()).toBeNull();
  });
});
