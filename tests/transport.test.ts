import { describe, it, expect, afterEach } from 'vitest';
import { isConnected, setHandle, clearHandle, getHandle } from '../src/transport';

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
