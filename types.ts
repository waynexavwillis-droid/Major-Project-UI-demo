export enum TrolleyStatus {
  ACTIVE = 'ACTIVE',
  IDLE = 'IDLE',
  MAINTENANCE = 'MAINTENANCE',
  LOW_BATTERY = 'LOW_BATTERY',
  LOST = 'LOST'
}

export enum ZoneType {
  STAGING = 'STAGING',
  PARKING = 'PARKING',
  ENTRY = 'ENTRY',
  PERIMETER = 'PERIMETER'
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Trolley {
  id: string;
  name: string;
  status: TrolleyStatus;
  batteryLevel: number; // 0-100
  lastSeen: string; // ISO Date
  location: Coordinates;
  zoneId: string | null;
  signalStrength: number; // RSSI dBm
  firmware: string;
}

export interface Zone {
  id: string;
  name: string;
  type: ZoneType;
  center: Coordinates;
  radius: number; // meters
  capacity: number;
  currentCount: number;
}

export type TabView = 'DASHBOARD' | 'MAP' | 'SETTINGS';