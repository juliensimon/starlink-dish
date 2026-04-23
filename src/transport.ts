import type { ServiceError } from '@grpc/grpc-js';

export type HandleFn = (
  request: unknown,
  callback: (err: ServiceError | null, response?: unknown) => void
) => void;

let _handle: HandleFn | null = null;
let _mocked = false;

export function setHandle(fn: HandleFn): void {
  _handle = fn;
}

export function setMocked(v: boolean): void {
  _mocked = v;
}

export function clearHandle(): void {
  _handle = null;
  _mocked = false;
}

export function isMocked(): boolean {
  return _mocked;
}

export function getHandle(): HandleFn | null {
  return _handle;
}

export function isConnected(): boolean {
  return _handle !== null;
}
