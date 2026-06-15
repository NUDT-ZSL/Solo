import { v4 as uuidv4 } from 'uuid';

export type SpaceType = 'standard' | 'luxury' | 'group';
export type SpaceStatus = 'idle' | 'occupied' | 'cleaning';

export interface Space {
  id: string;
  type: SpaceType;
  status: SpaceStatus;
}

export interface Booking {
  id: string;
  petName: string;
  spaceId: string;
  spaceType: SpaceType;
  startDate: string;
  endDate: string;
  totalFee: number;
}

export interface BookingRequest {
  petName: string;
  spaceType: SpaceType;
  startDate: string;
  endDate: string;
  spaces: Space[];
  bookings: Booking[];
}

export interface ConflictInfo {
  hasConflict: boolean;
  spaceId?: string;
  conflictStart?: string;
  conflictEnd?: string;
  reason?: string;
}

export interface BookingResult {
  success: boolean;
  booking?: Booking;
  conflict?: ConflictInfo;
  message: string;
}

export const SPACE_TYPE_LABELS: Record<SpaceType, string> = {
  standard: '标准单间',
  luxury: '豪华套房',
  group: '团体笼舍',
};

export const SPACE_TYPE_PRICES: Record<SpaceType, number> = {
  standard: 50,
  luxury: 120,
  group: 80,
};

export function createInitialSpaces(): Space[] {
  const spaces: Space[] = [];
  const types: SpaceType[] = ['standard', 'luxury', 'group', 'standard'];

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      const idx = row * 4 + col;
      spaces.push({
        id: `S${String(idx + 1).padStart(2, '0')}`,
        type: types[idx % 4],
        status: 'idle',
      });
    }
  }
  return spaces;
}

export function calculateDays(startDate: string, endDate: string): number {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (end <= start) return 0;
  const diffTime = end.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function calculateFee(spaceType: SpaceType, startDate: string, endDate: string): number {
  const days = calculateDays(startDate, endDate);
  return days * SPACE_TYPE_PRICES[spaceType];
}

export function datesOverlap(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string
): boolean {
  const as = new Date(aStart).getTime();
  const ae = new Date(aEnd).getTime();
  const bs = new Date(bStart).getTime();
  const be = new Date(bEnd).getTime();
  return as < be && bs < ae;
}

export function findAvailableSpace(
  spaceType: SpaceType,
  startDate: string,
  endDate: string,
  spaces: Space[],
  bookings: Booking[]
): { space: Space | null; conflict: ConflictInfo } {
  const candidateSpaces = spaces.filter((s) => s.type === spaceType);

  for (const space of candidateSpaces) {
    if (space.status === 'cleaning') {
      continue;
    }

    const overlappingBookings = bookings.filter(
      (b) => b.spaceId === space.id && datesOverlap(startDate, endDate, b.startDate, b.endDate)
    );

    if (overlappingBookings.length === 0) {
      return { space, conflict: { hasConflict: false } };
    } else {
      const conflictBooking = overlappingBookings[0];
      return {
        space: null,
        conflict: {
          hasConflict: true,
          spaceId: space.id,
          conflictStart: conflictBooking.startDate,
          conflictEnd: conflictBooking.endDate,
          reason: `空间 ${space.id} 在 ${conflictBooking.startDate} 至 ${conflictBooking.endDate} 已被「${conflictBooking.petName}」占用`,
        },
      };
    }
  }

  return {
    space: null,
    conflict: {
      hasConflict: true,
      reason: `当前所选时间段内无可用的${SPACE_TYPE_LABELS[spaceType]}`,
    },
  };
}

export function validateDates(startDate: string, endDate: string): { valid: boolean; error?: string } {
  if (!startDate || !endDate) {
    return { valid: false, error: '请选择起止日期' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (start < today) {
    return { valid: false, error: '起始日期不能早于今天' };
  }

  if (end <= start) {
    return { valid: false, error: '结束日期必须晚于起始日期' };
  }

  return { valid: true };
}

export function processBookingRequest(request: BookingRequest): BookingResult {
  const { petName, spaceType, startDate, endDate, spaces, bookings } = request;

  if (!petName.trim()) {
    return { success: false, message: '请输入宠物名称' };
  }

  const dateValidation = validateDates(startDate, endDate);
  if (!dateValidation.valid) {
    return { success: false, message: dateValidation.error || '日期无效' };
  }

  const { space, conflict } = findAvailableSpace(spaceType, startDate, endDate, spaces, bookings);

  if (conflict.hasConflict) {
    return {
      success: false,
      conflict,
      message: conflict.reason || '预约冲突',
    };
  }

  if (!space) {
    return {
      success: false,
      message: '没有可用的空间',
    };
  }

  const totalFee = calculateFee(spaceType, startDate, endDate);
  const newBooking: Booking = {
    id: uuidv4(),
    petName: petName.trim(),
    spaceId: space.id,
    spaceType,
    startDate,
    endDate,
    totalFee,
  };

  return {
    success: true,
    booking: newBooking,
    message: `预约成功！空间 ${space.id} 已为「${petName}」预留`,
  };
}

export function updateSpaceStatuses(spaces: Space[], bookings: Booking[]): Space[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return spaces.map((space) => {
    const activeBookings = bookings.filter(
      (b) =>
        b.spaceId === space.id &&
        datesOverlap(
          today.toISOString().split('T')[0],
          new Date(today.getTime() + 86400000).toISOString().split('T')[0],
          b.startDate,
          b.endDate
        )
    );

    if (activeBookings.length > 0) {
      return { ...space, status: 'occupied' as SpaceStatus };
    }
    return space;
  });
}
