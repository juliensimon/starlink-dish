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

  it('polls until running is false', async () => {
    let callCount = 0;
    setHandle((req: any, cb) => {
      if (req.startSpeedtest !== undefined) {
        cb(null, { startSpeedtest: {} });
      } else if (req.getSpeedtestResult !== undefined) {
        callCount++;
        if (callCount < 3) {
          cb(null, { getSpeedtestResult: { downloadBps: 0, uploadBps: 0, latencyMs: 0, running: true } });
        } else {
          cb(null, { getSpeedtestResult: { downloadBps: 50_000_000, uploadBps: 5_000_000, latencyMs: 30.0, running: false } });
        }
      }
    });

    const result = await speedTest();

    expect(result).not.toBeNull();
    expect(callCount).toBe(3);
    expect(result!.downloadMbps).toBeCloseTo(50);
  }, 10_000);

  it('returns null on gRPC error during polling', async () => {
    let callCount = 0;
    setHandle((req: any, cb) => {
      if (req.startSpeedtest !== undefined) {
        cb(null, { startSpeedtest: {} });
      } else if (req.getSpeedtestResult !== undefined) {
        callCount++;
        cb(new Error('poll error') as any, null);
      }
    });

    const result = await speedTest();
    expect(result).toBeNull();
    expect(callCount).toBeGreaterThan(0);
  });

  it('returns null when timeout expires', async () => {
    setHandle((req: any, cb) => {
      if (req.startSpeedtest !== undefined) {
        cb(null, { startSpeedtest: {} });
      } else if (req.getSpeedtestResult !== undefined) {
        // never complete: always running
        cb(null, { getSpeedtestResult: { downloadBps: 0, uploadBps: 0, latencyMs: 0, running: true } });
      }
    });

    const result = await speedTest(100); // 100ms timeout
    expect(result).toBeNull();
  }, 5_000);
});
