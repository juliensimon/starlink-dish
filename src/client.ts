import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import * as path from 'path';
import { setHandle, clearHandle } from './transport';

const PROTO_PATH = path.join(__dirname, '../../proto/dish.proto');

let _client: grpc.Client | null = null;

export async function initClient(address = '192.168.100.1:9200'): Promise<boolean> {
  try {
    const packageDefinition = await protoLoader.load(PROTO_PATH, {
      keepCase: false,
      longs: Number,
      enums: String,
      defaults: true,
      oneofs: true,
    });
    const proto = grpc.loadPackageDefinition(packageDefinition);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const DeviceService = (proto as any).SpaceX?.API?.Device?.Device;
    if (!DeviceService) return false;

    _client = new DeviceService(address, grpc.credentials.createInsecure(), {
      'grpc.keepalive_time_ms': 10000,
      'grpc.keepalive_timeout_ms': 5000,
    });

    return new Promise((resolve) => {
      const deadline = new Date(Date.now() + 3000);
      _client!.waitForReady(deadline, (err?: Error) => {
        if (err) { resolve(false); return; }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setHandle((_client as any).handle.bind(_client));
        resolve(true);
      });
    });
  } catch {
    return false;
  }
}

export function closeClient(): void {
  _client?.close();
  _client = null;
  clearHandle();
}
