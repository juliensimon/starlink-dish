import type { SpeedTestResult } from './types';
import { getHandle } from './transport';

export function reboot(): Promise<boolean> {
  const handle = getHandle();
  if (!handle) return Promise.resolve(false);
  return new Promise((resolve) => {
    handle({ reboot: {} }, (err) => resolve(!err));
  });
}

export function speedTest(timeoutMs = 30_000): Promise<SpeedTestResult | null> {
  const handle = getHandle();
  if (!handle) return Promise.resolve(null);

  return new Promise((resolve) => {
    handle({ startSpeedtest: {} }, (err) => {
      if (err) { resolve(null); return; }

      const deadline = Date.now() + timeoutMs;

      function poll() {
        if (Date.now() > deadline) { resolve(null); return; }

        handle!({ getSpeedtestResult: {} }, (err2, response) => {
          if (err2) { resolve(null); return; }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const r = (response as any)?.getSpeedtestResult;
          if (!r) { resolve(null); return; }
          if (r.running) {
            setTimeout(poll, 500);
            return;
          }
          resolve({
            downloadMbps: (r.downloadBps ?? 0) / 1_000_000,
            uploadMbps: (r.uploadBps ?? 0) / 1_000_000,
            latencyMs: r.latencyMs ?? 0,
          });
        });
      }

      poll();
    });
  });
}
