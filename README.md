# starlink-dish

TypeScript client library and CLI for the Starlink dish local gRPC API.

## Installation

```bash
npm install starlink-dish
```

## CLI Usage

```bash
# Install globally
npm install -g starlink-dish

# Show dish status
starlink-dish status

# Show telemetry history
starlink-dish history

# Run a speed test
starlink-dish speed-test

# Reboot the dish (prompts for confirmation)
starlink-dish reboot

# Output as JSON
starlink-dish status --json

# Use mock data (no dish required)
starlink-dish --mock status

# Connect to custom address
starlink-dish --address 10.0.0.1:9200 status
```

## Library Usage

```typescript
import { initClient, closeClient, getStatus, getHistory, useMock } from 'starlink-dish';

// Connect to dish (default: 192.168.100.1:9200)
const connected = await initClient();

if (connected) {
  const status = await getStatus();
  console.log(status?.downlinkThroughputBps);

  const history = await getHistory();
  console.log(history?.pingLatencyMs);

  closeClient();
}

// Mock mode — no dish needed
useMock();
const status = await getStatus();
```

## API

### Connection

- `initClient(address?: string): Promise<boolean>` — connect to dish, returns false if unreachable
- `closeClient(): void` — close connection
- `isConnected(): boolean` — check connection state

### Telemetry

- `getStatus(): Promise<DishStatus | null>`
- `getHistory(): Promise<DishHistory | null>`

### Control

- `reboot(): Promise<boolean>`
- `speedTest(): Promise<SpeedTestResult | null>`

### Mock Mode

- `useMock(options?: MockOptions): void` — install mock transport for development

## Types

See [src/types.ts](src/types.ts) for the full type definitions.

## License

MIT
