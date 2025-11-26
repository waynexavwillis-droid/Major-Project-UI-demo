import { Trolley, TrolleyStatus, Zone, ZoneType } from './types';

export const APP_NAME = "TrolleyOps Pro";

// Singapore Changi Airport Mock Coords
const BASE_LAT = 1.3455;
const BASE_LNG = 103.9323;

export const ZONES: Zone[] = [
  {
    id: 'ZONE-A',
    name: 'Zone A (Arrivals)',
    type: ZoneType.ENTRY,
    center: { lat: BASE_LAT + 0.001, lng: BASE_LNG - 0.001 },
    radius: 60,
    capacity: 50,
    currentCount: 42
  },
  {
    id: 'ZONE-B',
    name: 'Zone B (Basement)',
    type: ZoneType.PARKING,
    center: { lat: BASE_LAT - 0.0015, lng: BASE_LNG + 0.0005 },
    radius: 80,
    capacity: 100,
    currentCount: 12
  },
  {
    id: 'ZONE-C',
    name: 'Zone C (Staging)',
    type: ZoneType.STAGING,
    center: { lat: BASE_LAT, lng: BASE_LNG },
    radius: 40,
    capacity: 200,
    currentCount: 185
  }
];

// Generate 50 realistic trolleys
export const MOCK_TROLLEYS: Trolley[] = Array.from({ length: 50 }).map((_, i) => {
  const isFaulty = Math.random() > 0.9;
  const isLowBat = Math.random() > 0.85;
  
  let status = TrolleyStatus.ACTIVE;
  if (isFaulty) status = TrolleyStatus.MAINTENANCE;
  else if (isLowBat) status = TrolleyStatus.LOW_BATTERY;
  else if (Math.random() > 0.7) status = TrolleyStatus.IDLE;

  return {
    id: `TR-${(1000 + i).toString()}`,
    name: `Unit ${1000 + i}`,
    status,
    batteryLevel: isLowBat ? Math.floor(Math.random() * 15) : Math.floor(Math.random() * 60) + 40,
    lastSeen: new Date(Date.now() - Math.floor(Math.random() * 10000000)).toISOString(),
    location: {
      lat: BASE_LAT + (Math.random() * 0.006 - 0.003),
      lng: BASE_LNG + (Math.random() * 0.006 - 0.003)
    },
    zoneId: Math.random() > 0.2 ? ZONES[Math.floor(Math.random() * ZONES.length)].id : null,
    signalStrength: -(Math.floor(Math.random() * 40) + 40), // -40 to -80
    firmware: 'v2.4.1'
  };
});