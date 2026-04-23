import type { DishStatus, DishHistory, SpeedTestResult } from '../src/types';

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  return `${d}d ${h}h`;
}

export function formatStatus(s: DishStatus): string {
  const dl = (s.downlinkThroughputBps / 1_000_000).toFixed(1);
  const ul = (s.uplinkThroughputBps / 1_000_000).toFixed(1);
  const drop = (s.popPingDropRate * 100).toFixed(2);
  const snr = s.snrAboveNoiseFloor ? 'above noise floor' : 'BELOW noise floor';
  const alerts = s.alerts.length ? s.alerts.join(', ') : 'none';
  const bar = '━'.repeat(51);

  return [
    `Starlink Dish  •  hw: ${s.hardwareVersion}  sw: ${s.softwareVersion}  up: ${formatUptime(s.uptimeSeconds)}`,
    bar,
    ` Download    ${dl} Mbps   Upload    ${ul} Mbps`,
    ` Ping        ${s.popPingLatencyMs.toFixed(1)} ms     Drop      ${drop}%`,
    ` SNR         ${snr}`,
    ` Obstruction ${s.obstructionPercentTime.toFixed(1)}%        GPS sats  ${s.gpsSats}`,
    ` Boresight   Az ${s.boresightAzimuthDeg.toFixed(0)}°  El ${s.boresightElevationDeg.toFixed(0)}°`,
    bar,
    ` Alerts: ${alerts}`,
  ].join('\n');
}

export function formatHistory(h: { pingLatencyMs: number[]; downlinkThroughputBps: number[] }): string {
  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const dlAvg = (avg(h.downlinkThroughputBps) / 1_000_000).toFixed(1);
  const pingAvg = avg(h.pingLatencyMs).toFixed(1);
  return [
    `Last ${h.pingLatencyMs.length} samples:`,
    ` Avg download: ${dlAvg} Mbps`,
    ` Avg ping:     ${pingAvg} ms`,
  ].join('\n');
}

export function formatSpeedTest(r: SpeedTestResult): string {
  return [
    'Speed Test Results:',
    ` Download: ${r.downloadMbps.toFixed(1)} Mbps`,
    ` Upload:   ${r.uploadMbps.toFixed(1)} Mbps`,
    ` Latency:  ${r.latencyMs.toFixed(1)} ms`,
  ].join('\n');
}
