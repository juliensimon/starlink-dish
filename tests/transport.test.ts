import { describe, it, expect, afterEach } from 'vitest';
import { isConnected, isMocked, setHandle, setMocked, clearHandle, getHandle } from '../src/transport';
import { useMock } from '../src/mock';
import { initClient, closeClient } from '../src/client';

describe('transport', () => {
  afterEach(() => clearHandle());

  it('isConnected() is false initially', () => {
    clearHandle();
    expect(isConnected()).toBe(false);
  });

  it('isConnected() is true after setHandle()', () => {
    setHandle((_req, cb) => cb(null, {}));
    expect(isConnected()).toBe(true);
  });

  it('isConnected() is false after clearHandle()', () => {
    setHandle((_req, cb) => cb(null, {}));
    clearHandle();
    expect(isConnected()).toBe(false);
  });

  it('getHandle() returns the function set by setHandle()', () => {
    const fn = (_req: unknown, cb: (err: null, res: unknown) => void) => cb(null, { ok: true });
    setHandle(fn);
    expect(getHandle()).toBe(fn);
  });

  it('getHandle() returns null after clearHandle()', () => {
    setHandle((_req, cb) => cb(null, {}));
    clearHandle();
    expect(getHandle()).toBeNull();
  });
});

describe('isMocked()', () => {
  afterEach(() => clearHandle());

  it('is false initially', () => {
    clearHandle();
    expect(isMocked()).toBe(false);
  });

  it('is false after setHandle() — real gRPC path does not set mock flag', () => {
    setHandle((_req, cb) => cb(null, {}));
    expect(isMocked()).toBe(false);
  });

  it('is true after useMock()', () => {
    useMock();
    expect(isMocked()).toBe(true);
  });

  it('is false after clearHandle() even if mock was set', () => {
    useMock();
    clearHandle();
    expect(isMocked()).toBe(false);
  });

  it('setMocked(true) / setMocked(false) toggle the flag directly', () => {
    setMocked(true);
    expect(isMocked()).toBe(true);
    setMocked(false);
    expect(isMocked()).toBe(false);
  });
});

describe('initClient()', () => {
  afterEach(() => closeClient());

  it('returns false when address is unreachable', async () => {
    const result = await initClient('127.0.0.1:19999');
    expect(result).toBe(false);
  }, 5000);

  it('sets isConnected() to false after closeClient()', async () => {
    closeClient();
    expect(isConnected()).toBe(false);
  });
});
