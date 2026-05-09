export interface BusinessHours {
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  lunchStart: string | null;
  lunchEnd: string | null;
}

export interface EstablishmentConfig {
  minDaysForOnlineUpdate: number;
  businessHours: BusinessHours[];
}

export const DEFAULT_BUSINESS_HOURS: BusinessHours[] = [
  {
    dayOfWeek: 0,
    isOpen: false,
    openTime: '09:00',
    closeTime: '18:00',
    lunchStart: null,
    lunchEnd: null,
  },
  {
    dayOfWeek: 1,
    isOpen: true,
    openTime: '09:00',
    closeTime: '18:00',
    lunchStart: '12:00',
    lunchEnd: '13:00',
  },
  {
    dayOfWeek: 2,
    isOpen: true,
    openTime: '09:00',
    closeTime: '18:00',
    lunchStart: '12:00',
    lunchEnd: '13:00',
  },
  {
    dayOfWeek: 3,
    isOpen: true,
    openTime: '09:00',
    closeTime: '18:00',
    lunchStart: '12:00',
    lunchEnd: '13:00',
  },
  {
    dayOfWeek: 4,
    isOpen: true,
    openTime: '09:00',
    closeTime: '18:00',
    lunchStart: '12:00',
    lunchEnd: '13:00',
  },
  {
    dayOfWeek: 5,
    isOpen: true,
    openTime: '09:00',
    closeTime: '18:00',
    lunchStart: '12:00',
    lunchEnd: '13:00',
  },
  {
    dayOfWeek: 6,
    isOpen: true,
    openTime: '09:00',
    closeTime: '14:00',
    lunchStart: null,
    lunchEnd: null,
  },
];

export const DEFAULT_ESTABLISHMENT_CONFIG: EstablishmentConfig = {
  minDaysForOnlineUpdate: 2,
  businessHours: DEFAULT_BUSINESS_HOURS,
};
