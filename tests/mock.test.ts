import { describe, it, expect, afterEach } from 'vitest';
import { useMock } from '../src/mock';
import { clearHandle, isConnected, isMocked } from '../src/transport';
import { getStatus } from '../src/status';
import { getHistory } from '../src/history';
import { reboot, speedTest } from '../src/control';

describe('useMock()', () => {
  afterEach(() => clearHandle());

  it('sets isConnected() to true', () => {
    useMock();
    expect(isConnected()).toBe(true);
  });

  it('getStatus() returns a valid DishStatus', async () => {
    useMock();
    const s = await getStatus();
    expect(s).not.toBeNull();
    expect(typeof s!.deviceId).toBe('string');
    expect(typeof s!.snrAboveNoiseFloor).toBe('boolean');
    expect(typeof s!.downlinkThroughputBps).toBe('number');
    expect(s!.downlinkThroughputBps).toBeGreaterThan(0);
    expect(Array.isArray(s!.alerts)).toBe(true);
  });

  it('getHistory() returns a valid DishHistory', async () => {
    useMock();
    const h = await getHistory();
    expect(h).not.toBeNull();
    expect(Array.isArray(h!.pingLatencyMs)).toBe(true);
    expect(h!.pingLatencyMs.length).toBe(60);
    expect(h!.pingLatencyMs.every((v) => v > 0)).toBe(true);
    expect(Array.isArray(h!.downlinkThroughputBps)).toBe(true);
  });

  it('reboot() returns true', async () => {
    useMock();
    expect(await reboot()).toBe(true);
  });

  it('speedTest() returns a valid SpeedTestResult', async () => {
    useMock();
    const r = await speedTest();
    expect(r).not.toBeNull();
    expect(r!.downloadMbps).toBeGreaterThan(0);
    expect(r!.uploadMbps).toBeGreaterThan(0);
    expect(r!.latencyMs).toBeGreaterThan(0);
  });

  it('faultRate:1 causes getStatus() to return null', async () => {
    useMock({ faultRate: 1 });
    expect(await getStatus()).toBeNull();
  });

  it('faultRate:1 causes speedTest() to return null', async () => {
    useMock({ faultRate: 1 });
    expect(await speedTest()).toBeNull();
  });

  it('isMocked() is true after useMock() and false after clearHandle()', () => {
    useMock();
    expect(isMocked()).toBe(true);
    clearHandle();
    expect(isMocked()).toBe(false);
  });
});
