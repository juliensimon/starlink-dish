#!/usr/bin/env node
import { Command } from 'commander';
import { initClient, closeClient, useMock, getStatus, getHistory, reboot, speedTest } from '../src/index';
import type { SpeedTestProgress } from '../src/index';
import { formatStatus, formatHistory, formatSpeedTest } from './format';

const program = new Command();

program
  .name('starlink-dish')
  .description('Starlink dish local gRPC client')
  .version('0.1.0')
  .option('--address <addr>', 'dish address', '192.168.100.1:9200')
  .option('--mock', 'use mock data (no dish required)');

async function connect(opts: { address: string; mock?: boolean }): Promise<boolean> {
  if (opts.mock) { useMock(); return true; }
  const ok = await initClient(opts.address);
  if (!ok) { console.error(`Cannot connect to dish at ${opts.address}`); }
  return ok;
}

program
  .command('status')
  .description('Show current dish status')
  .option('--json', 'output raw JSON')
  .action(async (cmdOpts) => {
    const opts = program.opts<{ address: string; mock?: boolean }>();
    if (!await connect(opts)) { closeClient(); process.exit(1); }
    const s = await getStatus();
    closeClient();
    if (!s) { console.error('Failed to get status'); process.exit(1); }
    console.log(cmdOpts.json ? JSON.stringify(s, null, 2) : formatStatus(s));
  });

program
  .command('history')
  .description('Show telemetry history')
  .option('--json', 'output raw JSON')
  .action(async (cmdOpts) => {
    const opts = program.opts<{ address: string; mock?: boolean }>();
    if (!await connect(opts)) { closeClient(); process.exit(1); }
    const h = await getHistory();
    closeClient();
    if (!h) { console.error('Failed to get history'); process.exit(1); }
    console.log(cmdOpts.json ? JSON.stringify(h, null, 2) : formatHistory(h));
  });

program
  .command('reboot')
  .description('Reboot the dish (prompts for confirmation)')
  .action(async () => {
    const opts = program.opts<{ address: string; mock?: boolean }>();
    if (!opts.mock) {
      process.stdout.write('Reboot dish? This will drop your connection. [y/N] ');
      const line = await new Promise<string>((res) => {
        process.stdin.once('data', (d) => res(d.toString().trim()));
      });
      if (line.toLowerCase() !== 'y') { console.log('Aborted.'); process.exit(0); }
    }
    if (!await connect(opts)) { closeClient(); process.exit(1); }
    const ok = await reboot();
    closeClient();
    console.log(ok ? 'Reboot command sent.' : 'Reboot failed.');
    process.exit(ok ? 0 : 1);
  });

program
  .command('speed-test')
  .description('Run a speed test via Cloudflare')
  .option('--json', 'output raw JSON')
  .action(async (cmdOpts) => {
    const opts = program.opts<{ address: string; mock?: boolean }>();
    if (!await connect(opts)) { closeClient(); process.exit(1); }

    const showProgress = process.stdout.isTTY && !cmdOpts.json;
    let lastPhase: SpeedTestProgress['phase'] | null = null;

    function renderBar(p: SpeedTestProgress): string {
      const BAR = 40;
      const filled = Math.round(Math.min(1, p.progressFraction) * BAR);
      const bar = '█'.repeat(filled) + '░'.repeat(BAR - filled);
      const label = p.phase === 'download' ? 'Download' : 'Upload  ';
      const check = p.progressFraction >= 1 ? ' ✓' : '  ';
      return `${label}  ${bar}  ${p.currentMbps.toFixed(1).padStart(6)} Mbps${check}`;
    }

    function onProgress(p: SpeedTestProgress) {
      if (!showProgress) return;
      if (lastPhase !== null && p.phase !== lastPhase) process.stdout.write('\n');
      lastPhase = p.phase;
      process.stdout.write('\r' + renderBar(p));
    }

    if (!cmdOpts.json) process.stdout.write('Running speed test via Cloudflare...\n');

    const r = await speedTest(30_000, showProgress ? onProgress : undefined);

    if (showProgress && lastPhase !== null) process.stdout.write('\n');
    closeClient();

    if (!r) { console.error('Speed test failed'); process.exit(1); }
    console.log(cmdOpts.json ? JSON.stringify(r, null, 2) : formatSpeedTest(r));
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
