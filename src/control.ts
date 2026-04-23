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
    let timer: ReturnType<typeof setTimeout> | null = null;

    function done(result: SpeedTestResult | null) {
      if (timer !== null) { clearTimeout(timer); timer = null; }
      resolve(result);
    }

    handle({ startSpeedtest: {} }, (err) => {
      if (err) { done(null); return; }

      const deadline = Date.now() + timeoutMs;

      function poll() {
        if (Date.now() > deadline) { done(null); return; }

        handle!({ getSpeedtestResult: {} }, (err2, response) => {
          if (err2) { done(null); return; }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const r = (response as any)?.getSpeedtestResult;
          if (!r) { done(null); return; }
          if (r.running) {
            timer = setTimeout(poll, 500);
            return;
          }
          done({
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
