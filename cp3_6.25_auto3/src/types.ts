export interface Device {
  id: string;
  name: string;
  model: string;
  status: 'idle' | 'in-use' | 'maintenance';
  maintenance: boolean;
}

export interface Booking {
  id: string;
  deviceId: string;
  date: string;
  startTime: string;
  endTime: string;
  note: string;
  userId: string;
}

export interface DeviceUsage {
  deviceId: string;
  deviceName: string;
  bookingCount: number;
  totalHours: number;
  usageRate: number;
}
