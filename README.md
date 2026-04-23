# starlink-dish

[![npm version](https://img.shields.io/npm/v/starlink-dish)](https://www.npmjs.com/package/starlink-dish)
[![CI](https://github.com/juliensimon/starlink-dish/actions/workflows/ci.yml/badge.svg)](https://github.com/juliensimon/starlink-dish/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/node/v/starlink-dish)](https://www.npmjs.com/package/starlink-dish)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)](https://www.typescriptlang.org/)

TypeScript client library and CLI for the **Starlink dish local gRPC API** (`192.168.100.1:9200`).

No existing TypeScript/Node.js Starlink client existed — this fills that gap. Useful for building monitoring dashboards, Home Assistant integrations, and ISP tooling.

```
Starlink Dish  •  hw: rev4_proto3  sw: 2025.12.0  up: 3d 4h
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Download    87.3 Mbps   Upload    14.2 Mbps
 Ping        28.4 ms     Drop      0.02%
 SNR         above noise floor
 Obstruction 0.3%        GPS sats  9
 Boresight   Az 192°  El 47°
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Alerts: none
```

## Related projects

- [sparky8512/starlink-grpc-tools](https://github.com/sparky8512/starlink-grpc-tools) — Python, the canonical reference
- [ewilken/starlink-rs](https://github.com/ewilken/starlink-rs) — Rust
- [clarkzjw/starlink-grpc-golang](https://github.com/clarkzjw/starlink-grpc-golang) — Go

## Installation

```bash
# As a library
npm install starlink-dish

# As a global CLI
npm install -g starlink-dish

# Update to the latest version
npm install -g starlink-dish@latest
```

## CLI

```bash
# Show dish status (pretty-printed)
starlink-dish status

# Show dish status as JSON (pipeable)
starlink-dish status --json

# Show telemetry history
starlink-dish history
starlink-dish history --json

# Run a speed test (HTTP via Cloudflare, with live progress)
starlink-dish speed-test
starlink-dish speed-test --json

# Reboot the dish (prompts for confirmation)
starlink-dish reboot

# Use mock data — no dish required
starlink-dish --mock status
starlink-dish --mock speed-test

# Connect to a custom address
starlink-dish --address 10.0.0.1:9200 status
```

### Speed test output

```
Running speed test via Cloudflare...
Download  ████████████████████████████████████████   95.1 Mbps ✓
Upload    ████████████████████████████████████████   11.4 Mbps ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 Download  95.1 Mbps   Upload  11.4 Mbps   Ping   28.4 ms
```

## Library usage

```typescript
import {
  initClient, closeClient, isConnected,
  getStatus, getHistory,
  reboot, speedTest,
  useMock,
} from 'starlink-dish';

// Connect to dish at the default address (192.168.100.1:9200)
const connected = await initClient();

if (connected) {
  const status = await getStatus();
  console.log(`Download: ${status?.downlinkThroughputBps / 1e6} Mbps`);
  console.log(`SNR ok: ${status?.snrAboveNoiseFloor}`);

  const history = await getHistory();
  const avgPing = history?.pingLatencyMs.reduce((a, b) => a + b, 0) / history?.pingLatencyMs.length;
  console.log(`Avg ping: ${avgPing?.toFixed(1)} ms`);

  // Speed test runs via Cloudflare HTTP — no dish connection required
  const result = await speedTest();
  console.log(`Download: ${result?.downloadMbps.toFixed(1)} Mbps`);

  // With live progress callback
  await speedTest(30_000, (p) => {
    console.log(`${p.phase}: ${(p.progressFraction * 100).toFixed(0)}% — ${p.currentMbps.toFixed(1)} Mbps`);
  });

  closeClient();
}
```

### Mock mode (no dish needed)

```typescript
import { useMock, getStatus, getHistory, speedTest } from 'starlink-dish';

useMock();                        // call before any API function
const status = await getStatus(); // returns realistic generated data

useMock({ faultRate: 0.1 });     // 10% random failure rate for resilience testing
```

## API reference

### Connection

| Function | Returns | Description |
|----------|---------|-------------|
| `initClient(address?)` | `Promise<boolean>` | Connect to dish. Default address: `192.168.100.1:9200`. Returns `false` if unreachable. |
| `closeClient()` | `void` | Close the gRPC connection. |
| `isConnected()` | `boolean` | `true` if a connection is active. |

### Telemetry

| Function | Returns | Description |
|----------|---------|-------------|
| `getStatus()` | `Promise<DishStatus \| null>` | Current dish state and metrics. |
| `getHistory()` | `Promise<DishHistory \| null>` | Last 60 samples of throughput, latency, and drop rate. |

### Control

| Function | Returns | Description |
|----------|---------|-------------|
| `reboot()` | `Promise<boolean>` | Send a reboot command. Returns `true` on success. |
| `speedTest(timeoutMs?, onProgress?)` | `Promise<SpeedTestResult \| null>` | HTTP speed test via Cloudflare. Works without a dish connection. |

### Mock mode

| Function | Returns | Description |
|----------|---------|-------------|
| `useMock(options?)` | `void` | Install a mock transport. Call before `initClient()` or any API function. |

## Types

```typescript
interface DishStatus {
  deviceId: string;
  hardwareVersion: string;
  softwareVersion: string;
  countryCode: string;
  bootcount: number;
  uptimeSeconds: number;
  state: 'CONNECTED' | 'UNKNOWN';
  downlinkThroughputBps: number;
  uplinkThroughputBps: number;
  popPingLatencyMs: number;
  popPingDropRate: number;         // 0–1
  obstructionPercentTime: number;  // 0–100
  currentlyObstructed: boolean;
  snrAboveNoiseFloor: boolean;
  snrPersistentlyLow: boolean;
  boresightAzimuthDeg: number;
  boresightElevationDeg: number;
  gpsValid: boolean;
  gpsSats: number;
  ethSpeedMbps: number;
  alerts: string[];                // e.g. ['motors_stuck', 'thermal_throttle']
}

interface DishHistory {
  current: number;                 // write-index into the circular buffer
  pingLatencyMs: number[];
  pingDropRate: number[];
  downlinkThroughputBps: number[];
  uplinkThroughputBps: number[];
}

interface SpeedTestResult {
  downloadMbps: number;
  uploadMbps: number;
  latencyMs: number;               // dish popPingLatencyMs if connected, else 0
}

interface SpeedTestProgress {
  phase: 'download' | 'upload';
  progressFraction: number;        // 0–1
  currentMbps: number;
}

interface MockOptions {
  faultRate?: number;              // 0–1, probability of returning null
}
```

## Requirements

- Node.js 18+
- A Starlink dish on your local network (or use `--mock` / `useMock()`)
- Speed test requires internet access (uses Cloudflare endpoints)

## License

MIT © [Julien Simon](https://github.com/juliensimon)
