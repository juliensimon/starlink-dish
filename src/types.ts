export interface DishStatus {
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
  popPingDropRate: number;
  obstructionPercentTime: number;
  currentlyObstructed: boolean;
  snrAboveNoiseFloor: boolean;
  snrPersistentlyLow: boolean;
  boresightAzimuthDeg: number;
  boresightElevationDeg: number;
  gpsValid: boolean;
  gpsSats: number;
  ethSpeedMbps: number;
  alerts: string[];
}

export interface DishHistory {
  current: number;
  pingLatencyMs: number[];
  pingDropRate: number[];
  downlinkThroughputBps: number[];
  uplinkThroughputBps: number[];
}

export interface SpeedTestResult {
  downloadMbps: number;
  uploadMbps: number;
  latencyMs: number;
}

export interface MockOptions {
  faultRate?: number;
}
