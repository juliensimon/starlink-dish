export type { DishStatus, DishHistory, SpeedTestResult, SpeedTestProgress, MockOptions } from './types';
export { initClient, closeClient } from './client';
export { isConnected } from './transport';
export { getStatus } from './status';
export { getHistory } from './history';
export { reboot, speedTest } from './control';
export { useMock } from './mock';
