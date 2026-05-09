import { BusinessHours } from '@cabeleleila/contracts';
import { DateTime } from 'luxon';

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

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

export function isValidBusinessHour(
  dt: DateTime,
  hoursArray: BusinessHours[],
  durationMinutes = 0,
): BusinessHourValidation {
  const dayOfWeek = dt.weekday % 7; // luxon: 1=Mon..7=Sun → JS: 1=Mon..0=Sun
  const hours = hoursArray.find((h) => h.dayOfWeek === dayOfWeek);

  if (!hours || !hours.isOpen) {
    return { valid: false, reason: 'Salão fechado neste dia da semana' };
  }

  const startMin = dt.hour * 60 + dt.minute;
  const endMin = startMin + durationMinutes;
  const openMin = toMinutes(hours.openTime);
  const closeMin = toMinutes(hours.closeTime);

  if (startMin < openMin || startMin >= closeMin) {
    return {
      valid: false,
      reason: `Horário fora do expediente (${hours.openTime}–${hours.closeTime})`,
    };
  }
  if (endMin > closeMin) {
    return {
      valid: false,
      reason: `O serviço terminaria depois do fechamento (${hours.closeTime})`,
    };
  }
  if (hours.lunchStart && hours.lunchEnd) {
    const lunchStartMin = toMinutes(hours.lunchStart);
    const lunchEndMin = toMinutes(hours.lunchEnd);
    if (startMin < lunchEndMin && endMin > lunchStartMin) {
      return {
        valid: false,
        reason: `Conflita com o horário de almoço (${hours.lunchStart}–${hours.lunchEnd})`,
      };
    }
  }
  return { valid: true };
}

export function getWeekStart(date?: Date): string {
  const dt = date
    ? DateTime.fromJSDate(date).setZone(SP_TZ)
    : DateTime.now().setZone(SP_TZ);
  return dt.startOf('week').toISODate()!;
}
