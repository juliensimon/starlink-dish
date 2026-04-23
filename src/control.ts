import * as https from 'https';
import type { SpeedTestResult, SpeedTestProgress } from './types';
import { getHandle, isMocked } from './transport';
import { getStatus } from './status';

export function reboot(): Promise<boolean> {
  const handle = getHandle();
  if (!handle) return Promise.resolve(false);
  return new Promise((resolve) => {
    handle({ reboot: {} }, (err) => resolve(!err));
  });
}

const CF_HOST = 'speed.cloudflare.com';

function httpDownload(
  bytes: number,
  timeoutMs: number,
  onProgress?: (p: SpeedTestProgress) => void
): Promise<number> {
  return new Promise((resolve, reject) => {
    let received = 0;
    const start = Date.now();
    const req = https.get(
      { host: CF_HOST, path: `/__down?bytes=${bytes}` },
      (res) => {
        res.on('data', (chunk: Buffer) => {
          received += chunk.length;
          const elapsed = (Date.now() - start) / 1000;
          const mbps = elapsed > 0.01 ? (received * 8) / elapsed / 1e6 : 0;
          onProgress?.({ phase: 'download', progressFraction: received / bytes, currentMbps: mbps });
        });
        res.on('end', () => {
          const elapsed = (Date.now() - start) / 1000;
          const mbps = elapsed > 0.01 ? (received * 8) / elapsed / 1e6 : 0;
          onProgress?.({ phase: 'download', progressFraction: 1, currentMbps: mbps });
          resolve(mbps);
        });
        res.on('error', reject);
      }
    );
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
  });
}

function httpUpload(
  bytes: number,
  timeoutMs: number,
  onProgress?: (p: SpeedTestProgress) => void
): Promise<number> {
  return new Promise((resolve, reject) => {
    let sent = 0;
    const start = Date.now();
    const req = https.request(
      {
        host: CF_HOST, path: '/__up', method: 'POST',
        headers: { 'Content-Length': bytes, 'Content-Type': 'application/octet-stream' },
      },
      (res) => {
        res.resume();
        res.on('end', () => {
          const elapsed = (Date.now() - start) / 1000;
          const mbps = elapsed > 0.01 ? (bytes * 8) / elapsed / 1e6 : 0;
          onProgress?.({ phase: 'upload', progressFraction: 1, currentMbps: mbps });
          resolve(mbps);
        });
        res.on('error', reject);
      }
    );
    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);

    const chunkSize = 65_536;
    function writeNext() {
      while (sent < bytes) {
        const n = Math.min(chunkSize, bytes - sent);
        sent += n;
        const elapsed = (Date.now() - start) / 1000;
        const mbps = elapsed > 0.01 ? (sent * 8) / elapsed / 1e6 : 0;
        onProgress?.({ phase: 'upload', progressFraction: sent / bytes, currentMbps: mbps });
        const ok = req.write(Buffer.alloc(n));
        if (!ok) { req.once('drain', writeNext); return; }
      }
      req.end();
    }
    writeNext();
  });
}

async function httpSpeedTest(
  timeoutMs: number,
  onProgress?: (p: SpeedTestProgress) => void
): Promise<SpeedTestResult | null> {
  try {
    const half = Math.max(5_000, Math.floor((timeoutMs - 2_000) / 2));
    const downloadMbps = await httpDownload(25_000_000, half, onProgress);
    const uploadMbps = await httpUpload(5_000_000, half, onProgress);
    const status = await getStatus();
    return { downloadMbps, uploadMbps, latencyMs: status?.popPingLatencyMs ?? 0 };
  } catch {
    return null;
  }
}

export async function speedTest(
  timeoutMs = 30_000,
  onProgress?: (p: SpeedTestProgress) => void
): Promise<SpeedTestResult | null> {
  if (isMocked()) {
    const handle = getHandle()!;
    return new Promise((resolve) => {
      handle({ startSpeedtest: {} }, (err, response) => {
        if (err) { resolve(null); return; }
        const r = (response as Record<string, unknown>)?.['speedTest'] as {
          downloadMbps: number; uploadMbps: number; latencyMs: number;
        } | undefined;
        if (!r) { resolve(null); return; }
        onProgress?.({ phase: 'download', progressFraction: 1, currentMbps: r.downloadMbps });
        onProgress?.({ phase: 'upload', progressFraction: 1, currentMbps: r.uploadMbps });
        resolve({ downloadMbps: r.downloadMbps, uploadMbps: r.uploadMbps, latencyMs: r.latencyMs });
      });
    });
  }

  return httpSpeedTest(timeoutMs, onProgress);
}
