import { describe, it, expect, afterEach } from 'vitest';
import { parseStatus, getStatus } from '../src/status';
import { setHandle, clearHandle } from '../src/transport';

describe('parseStatus()', () => {
  it('maps all dishGetStatus fields to DishStatus', () => {
    const raw = {
      dishGetStatus: {
        deviceInfo: {
          id: 'ut01-abc',
          hardwareVersion: '4.0',
          softwareVersion: '2025.12.0',
          countryCode: 'US',
          bootcount: 7,
        },
        deviceState: { uptimeS: 86400 },
        downlinkThroughputBps: 110_000_000,
        uplinkThroughputBps: 12_000_000,
        popPingLatencyMs: 28.3,
        popPingDropRate: 0.002,
        obstructionStats: { fractionObstructed: 0.005, currentlyObstructed: false },
        isSnrAboveNoiseFloor: true,
        isSnrPersistentlyLow: false,
        boresightAzimuthDeg: 185.0,
        boresightElevationDeg: 50.0,
        gpsStats: { gpsValid: true, gpsSats: 9 },
        ethSpeedMbps: 1000,
        alerts: {},
      },
    };

    const s = parseStatus(raw);

    expect(s).not.toBeNull();
    expect(s!.deviceId).toBe('ut01-abc');
    expect(s!.hardwareVersion).toBe('4.0');
    expect(s!.softwareVersion).toBe('2025.12.0');
    expect(s!.countryCode).toBe('US');
    expect(s!.bootcount).toBe(7);
    expect(s!.uptimeSeconds).toBe(86400);
    expect(s!.state).toBe('CONNECTED');
    expect(s!.downlinkThroughputBps).toBe(110_000_000);
    expect(s!.uplinkThroughputBps).toBe(12_000_000);
    expect(s!.popPingLatencyMs).toBe(28.3);
    expect(s!.popPingDropRate).toBe(0.002);
    expect(s!.obstructionPercentTime).toBeCloseTo(0.5);
    expect(s!.currentlyObstructed).toBe(false);
    expect(s!.snrAboveNoiseFloor).toBe(true);
    expect(s!.snrPersistentlyLow).toBe(false);
    expect(s!.boresightAzimuthDeg).toBe(185.0);
    expect(s!.boresightElevationDeg).toBe(50.0);
    expect(s!.gpsValid).toBe(true);
    expect(s!.gpsSats).toBe(9);
    expect(s!.ethSpeedMbps).toBe(1000);
    expect(s!.alerts).toEqual([]);
  });

  it('returns null when dishGetStatus is absent', () => {
    expect(parseStatus(null)).toBeNull();
    expect(parseStatus({})).toBeNull();
    expect(parseStatus({ dishGetHistory: {} })).toBeNull();
  });

  it('uses UNKNOWN state when deviceState is missing', () => {
    expect(parseStatus({ dishGetStatus: {} })!.state).toBe('UNKNOWN');
  });

  it('maps alert flags to string array', () => {
    const raw = {
      dishGetStatus: {
        alerts: {
          motorsStuck: true,
          thermalShutdown: true,
          thermalThrottle: false,
          unexpectedLocation: false,
          slowEthernetSpeeds: false,
        },
      },
    };
    expect(parseStatus(raw)!.alerts).toEqual(['motors_stuck', 'thermal_shutdown']);
  });

  it('uses safe defaults when optional fields are missing', () => {
    const s = parseStatus({ dishGetStatus: {} })!;
    expect(s.deviceId).toBe('unknown');
    expect(s.downlinkThroughputBps).toBe(0);
    expect(s.gpsSats).toBe(0);
    expect(s.snrAboveNoiseFloor).toBe(false);
    expect(s.alerts).toEqual([]);
  });

  it('converts fractionObstructed to obstructionPercentTime ×100', () => {
    const s = parseStatus({ dishGetStatus: { obstructionStats: { fractionObstructed: 0.037 } } })!;
    expect(s.obstructionPercentTime).toBeCloseTo(3.7);
  });

  it('maps all five alert flags when all are set', () => {
    const raw = {
      dishGetStatus: {
        alerts: {
          motorsStuck: true,
          thermalShutdown: true,
          thermalThrottle: true,
          unexpectedLocation: true,
          slowEthernetSpeeds: true,
        },
      },
    };
    expect(parseStatus(raw)!.alerts).toEqual([
      'motors_stuck', 'thermal_throttle', 'thermal_shutdown', 'unexpected_location', 'slow_ethernet_speeds',
    ]);
  });
});

describe('getStatus()', () => {
  afterEach(() => clearHandle());

  it('returns null when not connected', async () => {
    expect(await getStatus()).toBeNull();
  });

  it('calls handle with { getStatus: {} } and returns parsed status', async () => {
    const raw = {
      dishGetStatus: {
        deviceInfo: { id: 'test-id', hardwareVersion: '4.0', softwareVersion: '1.0', countryCode: 'FR', bootcount: 1 },
        deviceState: { uptimeS: 100 },
        isSnrAboveNoiseFloor: true,
        alerts: {},
      },
    };
    let capturedRequest: unknown;
    setHandle((req, cb) => { capturedRequest = req; cb(null, raw); });

    const status = await getStatus();

    expect(capturedRequest).toEqual({ getStatus: {} });
    expect(status).not.toBeNull();
    expect(status!.deviceId).toBe('test-id');
    expect(status!.snrAboveNoiseFloor).toBe(true);
  });

  it('returns null when handle returns an error', async () => {
    setHandle((_req, cb) => cb(new Error('network error') as any, null));
    expect(await getStatus()).toBeNull();
  });

  it('returns null when handle returns null response', async () => {
    setHandle((_req, cb) => cb(null, null));
    expect(await getStatus()).toBeNull();
  });

  it('returns null when handle returns response without dishGetStatus', async () => {
    setHandle((_req, cb) => cb(null, { dishGetHistory: {} }));
    expect(await getStatus()).toBeNull();
  });
});
