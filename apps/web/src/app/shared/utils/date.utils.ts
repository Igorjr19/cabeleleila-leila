import { DateTime } from 'luxon';
import { BusinessHours } from '../../core/services/establishment-api.service';

export const SP_TZ = 'America/Sao_Paulo';

export function toSP(isoUtc: string): DateTime {
  return DateTime.fromISO(isoUtc, { zone: 'utc' }).setZone(SP_TZ);
}

export function formatSP(
  isoUtc: string,
  fmt = "dd/MM/yyyy 'às' HH:mm",
): string {
  return toSP(isoUtc).toFormat(fmt);
}

export function toUtcISO(jsDate: Date): string {
  return DateTime.fromJSDate(jsDate)
    .setZone(SP_TZ, { keepLocalTime: true })
    .toUTC()
    .toISO()!;
}

export function addDays(days: number): Date {
  return DateTime.now().setZone(SP_TZ).plus({ days }).startOf('day').toJSDate();
}

export interface BusinessHourValidation {
  valid: boolean;
  reason?: string;
}

export function isValidBusinessHour(
  dt: DateTime,
  hours: BusinessHours,
): BusinessHourValidation {
  const toMin = (hhmm: string): number => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };

  const mins = dt.hour * 60 + dt.minute;

  if (mins < toMin(hours.open) || mins >= toMin(hours.close)) {
    return {
      valid: false,
      reason: `Horário fora do expediente (${hours.open}–${hours.close})`,
    };
  }
  if (mins >= toMin(hours.lunchStart) && mins < toMin(hours.lunchEnd)) {
    return {
      valid: false,
      reason: `Horário de almoço (${hours.lunchStart}–${hours.lunchEnd})`,
    };
  }
  return { valid: true };
}

export function getWeekStart(date?: Date): string {
  const dt = date
    ? DateTime.fromJSDate(date).setZone(SP_TZ)
    : DateTime.now().setZone(SP_TZ);
  return dt.startOf('week').toISODate()!;
}
