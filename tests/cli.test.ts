import { describe, it, expect } from 'vitest';
import { formatStatus, formatHistory, formatSpeedTest } from '../cli/format';
import type { DishStatus, DishHistory, SpeedTestResult } from '../src/types';

const sampleStatus: DishStatus = {
  deviceId: 'ut01-test',
  hardwareVersion: '4.0',
  softwareVersion: '2025.12.0',
  countryCode: 'US',
  bootcount: 3,
  uptimeSeconds: 86400 * 3 + 3600 * 4,
  state: 'CONNECTED',
  downlinkThroughputBps: 87_300_000,
  uplinkThroughputBps: 14_200_000,
  popPingLatencyMs: 28.4,
  popPingDropRate: 0.0002,
  obstructionPercentTime: 0.3,
  currentlyObstructed: false,
  snrAboveNoiseFloor: true,
  snrPersistentlyLow: false,
  boresightAzimuthDeg: 192,
  boresightElevationDeg: 47,
  gpsValid: true,
  gpsSats: 9,
  ethSpeedMbps: 1000,
  alerts: [],
};

describe('formatStatus()', () => {
  it('includes download and upload Mbps', () => {
    const out = formatStatus(sampleStatus);
    expect(out).toContain('87.3');
    expect(out).toContain('14.2');
  });

  it('includes ping latency', () => {
    expect(formatStatus(sampleStatus)).toContain('28.4');
  });

  it('includes SNR above noise floor text', () => {
    expect(formatStatus(sampleStatus)).toContain('above noise floor');
  });

  it('includes uptime formatted as days/hours', () => {
    expect(formatStatus(sampleStatus)).toContain('3d 4h');
  });

  it('shows "none" when no alerts', () => {
    expect(formatStatus(sampleStatus)).toContain('none');
  });

  it('shows alert names when present', () => {
    const s = { ...sampleStatus, alerts: ['thermal_throttle'] };
    expect(formatStatus(s)).toContain('thermal_throttle');
  });
});

const sampleResult: SpeedTestResult = { downloadMbps: 95.4, uploadMbps: 11.2, latencyMs: 27.0 };

describe('formatSpeedTest()', () => {
  it('includes download and upload Mbps', () => {
    const out = formatSpeedTest(sampleResult);
    expect(out).toContain('95.4');
    expect(out).toContain('11.2');
  });
});
