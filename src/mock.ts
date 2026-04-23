import { setHandle } from './transport';
import type { MockOptions } from './types';

function smoothNoise(t: number, ...freqs: number[]): number {
  return freqs.reduce((s, f) => s + Math.sin(t * f), 0) / freqs.length;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function buildStatusResponse(t: number) {
  const dlMbps = clamp(120 + 100 * smoothNoise(t, 0.05, 0.13, 0.31), 25, 220);
  const ulMbps = clamp(12.5 + 7.5 * smoothNoise(t, 0.07, 0.17, 0.41), 5, 20);
  const ping = clamp(38 + 13 * smoothNoise(t, 0.1, 0.23, 0.51), 25, 200);
  const drop = clamp(0.005 + 0.01 * smoothNoise(t, 0.08, 0.19), 0, 0.05);
  return {
    dishGetStatus: {
      deviceInfo: { id: 'ut01000000-00000-demo0', hardwareVersion: 'rev4_proto3', softwareVersion: '2025.12.0.mr36752-prod', countryCode: 'US', bootcount: 1 },
      deviceState: { uptimeS: Math.floor(t) },
      downlinkThroughputBps: dlMbps * 1_000_000,
      uplinkThroughputBps: ulMbps * 1_000_000,
      popPingLatencyMs: ping,
      popPingDropRate: drop,
      obstructionStats: { fractionObstructed: 0, currentlyObstructed: false },
      isSnrAboveNoiseFloor: true,
      isSnrPersistentlyLow: false,
      boresightAzimuthDeg: 0,
      boresightElevationDeg: 0,
      gpsStats: { gpsValid: true, gpsSats: 8 + Math.floor(Math.abs(smoothNoise(t, 0.03, 0.11)) * 4) },
      ethSpeedMbps: 1000,
      alerts: {},
    },
  };
}

function buildHistoryResponse(t: number) {
  const samples = 60;
  const pingLatencyMs: number[] = [];
  const pingDropRate: number[] = [];
  const downlinkThroughputBps: number[] = [];
  const uplinkThroughputBps: number[] = [];

  for (let i = 0; i < samples; i++) {
    const ti = t - (samples - i);
    pingLatencyMs.push(clamp(38 + 13 * smoothNoise(ti, 0.1, 0.23, 0.51), 25, 60));
    pingDropRate.push(clamp(0.005 + 0.01 * smoothNoise(ti, 0.08, 0.19), 0, 0.05));
    downlinkThroughputBps.push(clamp(120 + 100 * smoothNoise(ti, 0.05, 0.13, 0.31), 25, 220) * 1_000_000);
    uplinkThroughputBps.push(clamp(12.5 + 7.5 * smoothNoise(ti, 0.07, 0.17, 0.41), 5, 20) * 1_000_000);
  }

  return { dishGetHistory: { current: Math.floor(t), popPingLatencyMs: pingLatencyMs, popPingDropRate: pingDropRate, downlinkThroughputBps, uplinkThroughputBps } };
}

export function useMock(options: MockOptions = {}): void {
  const { faultRate = 0 } = options;
  const start = Date.now();

  setHandle((request, callback) => {
    const req = request as Record<string, unknown>;
    if (Math.random() < faultRate) {
      callback(new Error('Mock fault injected') as any, null);
      return;
    }
    const t = (Date.now() - start) / 1000;

    if (req.getStatus !== undefined) {
      callback(null, buildStatusResponse(t));
    } else if (req.getHistory !== undefined) {
      callback(null, buildHistoryResponse(t));
    } else if (req.reboot !== undefined) {
      callback(null, { reboot: {} });
    } else if (req.startSpeedtest !== undefined) {
      callback(null, { startSpeedtest: {} });
    } else if (req.getSpeedtestResult !== undefined) {
      callback(null, { getSpeedtestResult: { downloadBps: 95_000_000, uploadBps: 11_000_000, latencyMs: 27.0, running: false } });
    } else {
      callback(new Error('Unknown mock request') as any, null);
    }
  });
}
