import type { DishStatus } from './types';
import { getHandle } from './transport';

export function parseStatus(raw: unknown): DishStatus | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const s = (raw as any)?.dishGetStatus;
  if (!s) return null;

  const alerts: string[] = [];
  if (s.alerts?.motorsStuck) alerts.push('motors_stuck');
  if (s.alerts?.thermalThrottle) alerts.push('thermal_throttle');
  if (s.alerts?.thermalShutdown) alerts.push('thermal_shutdown');
  if (s.alerts?.unexpectedLocation) alerts.push('unexpected_location');
  if (s.alerts?.slowEthernetSpeeds) alerts.push('slow_ethernet_speeds');

  return {
    deviceId: s.deviceInfo?.id ?? 'unknown',
    hardwareVersion: s.deviceInfo?.hardwareVersion ?? 'unknown',
    softwareVersion: s.deviceInfo?.softwareVersion ?? 'unknown',
    countryCode: s.deviceInfo?.countryCode ?? '',
    bootcount: s.deviceInfo?.bootcount ?? 0,
    uptimeSeconds: Number(s.deviceState?.uptimeS ?? 0),
    state: s.deviceState ? 'CONNECTED' : 'UNKNOWN',
    downlinkThroughputBps: s.downlinkThroughputBps ?? 0,
    uplinkThroughputBps: s.uplinkThroughputBps ?? 0,
    popPingLatencyMs: s.popPingLatencyMs ?? 0,
    popPingDropRate: s.popPingDropRate ?? 0,
    obstructionPercentTime: (s.obstructionStats?.fractionObstructed ?? 0) * 100,
    currentlyObstructed: s.obstructionStats?.currentlyObstructed ?? false,
    snrAboveNoiseFloor: s.isSnrAboveNoiseFloor ?? false,
    snrPersistentlyLow: s.isSnrPersistentlyLow ?? false,
    boresightAzimuthDeg: s.boresightAzimuthDeg ?? 0,
    boresightElevationDeg: s.boresightElevationDeg ?? 0,
    gpsValid: s.gpsStats?.gpsValid ?? false,
    gpsSats: s.gpsStats?.gpsSats ?? 0,
    ethSpeedMbps: s.ethSpeedMbps ?? 0,
    alerts,
  };
}

export function getStatus(): Promise<DishStatus | null> {
  const handle = getHandle();
  if (!handle) return Promise.resolve(null);
  return new Promise((resolve) => {
    handle({ getStatus: {} }, (err, response) => {
      if (err) { resolve(null); return; }
      resolve(parseStatus(response));
    });
  });
}
