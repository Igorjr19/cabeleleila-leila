import { BusinessHours } from '@cabeleleila/contracts';
import { DateTime } from 'luxon';
import {
  SP_TZ,
  formatSP,
  getWeekStart,
  isValidBusinessHour,
  toSP,
  toUtcISO,
} from './date.utils';

// 2026-04-04 is a Saturday → dayOfWeek = 6
const BUSINESS_HOURS: BusinessHours[] = Array.from({ length: 7 }).map(
  (_, dayOfWeek) => ({
    dayOfWeek,
    isOpen: true,
    openTime: '08:00',
    closeTime: '18:00',
    lunchStart: '12:00',
    lunchEnd: '13:00',
  }),
);

const CLOSED_ALL_WEEK: BusinessHours[] = Array.from({ length: 7 }).map(
  (_, dayOfWeek) => ({
    dayOfWeek,
    isOpen: false,
    openTime: '08:00',
    closeTime: '18:00',
    lunchStart: null,
    lunchEnd: null,
  }),
);

describe('date.utils', () => {
  // ── toSP() ──────────────────────────────────────────────────────────────────

  describe('toSP()', () => {
    it('converte UTC ISO para timezone America/Sao_Paulo', () => {
      // 15:00 UTC = 12:00 BRT (UTC-3)
      const result = toSP('2026-04-04T15:00:00.000Z');

      expect(result.hour).toBe(12);
      expect(result.zoneName).toBe(SP_TZ);
    });

    it('ajusta corretamente para horário de verão quando aplicável', () => {
      // BRT é sempre UTC-3 (sem DST), resultado deve ser consistente
      const result = toSP('2026-01-01T03:00:00.000Z');

      expect(result.hour).toBe(0);
      expect(result.day).toBe(1);
    });

    it('retorna instância DateTime', () => {
      const result = toSP('2026-04-04T12:00:00.000Z');
      expect(result).toBeInstanceOf(DateTime);
    });
  });

  // ── formatSP() ──────────────────────────────────────────────────────────────

  describe('formatSP()', () => {
    it('formata com o padrão padrão dd/MM/yyyy às HH:mm', () => {
      // 15:00 UTC = 12:00 BRT
      const result = formatSP('2026-04-04T15:00:00.000Z');

      expect(result).toBe('04/04/2026 às 12:00');
    });

    it('aceita formato personalizado', () => {
      const result = formatSP('2026-04-04T15:00:00.000Z', 'HH:mm');

      expect(result).toBe('12:00');
    });

    it('formata apenas a data quando pedido', () => {
      const result = formatSP('2026-04-04T15:00:00.000Z', 'dd/MM/yyyy');

      expect(result).toBe('04/04/2026');
    });
  });

  // ── toUtcISO() ──────────────────────────────────────────────────────────────

  describe('toUtcISO()', () => {
    it('converte JS Date (local) para UTC ISO string', () => {
      // Cria uma data interpretada como horário de SP: 04/04/2026 10:00 BRT = 13:00 UTC
      const jsDate = new Date(2026, 3, 4, 10, 0, 0); // local time
      const result = toUtcISO(jsDate);

      expect(typeof result).toBe('string');
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('retorna string no formato ISO 8601', () => {
      const jsDate = new Date(2026, 3, 15, 14, 30, 0);
      const result = toUtcISO(jsDate);

      // Deve ser um ISO 8601 válido
      const parsed = DateTime.fromISO(result);
      expect(parsed.isValid).toBe(true);
    });

    it('keepLocalTime: interpreta a hora da JS Date como horário de SP', () => {
      // 2026-04-15 10:00 local → tratado como 10:00 SP → 13:00 UTC
      const jsDate = new Date(2026, 3, 15, 10, 0, 0);
      const result = toUtcISO(jsDate);
      const parsed = DateTime.fromISO(result, { zone: 'utc' });

      expect(parsed.hour).toBe(13);
    });
  });

  // ── isValidBusinessHour() ───────────────────────────────────────────────────

  describe('isValidBusinessHour()', () => {
    const dt = (hour: number, minute = 0): DateTime =>
      DateTime.fromObject(
        { year: 2026, month: 4, day: 4, hour, minute },
        { zone: SP_TZ },
      );

    it('hora válida dentro do expediente retorna valid=true', () => {
      expect(isValidBusinessHour(dt(10), BUSINESS_HOURS).valid).toBe(true);
      expect(isValidBusinessHour(dt(9, 30), BUSINESS_HOURS).valid).toBe(true);
      expect(isValidBusinessHour(dt(15), BUSINESS_HOURS).valid).toBe(true);
    });

    it('exatamente no horário de abertura (08:00) é válido', () => {
      const result = isValidBusinessHour(dt(8, 0), BUSINESS_HOURS);
      expect(result.valid).toBe(true);
    });

    it('antes do horário de abertura (07:59) é inválido', () => {
      const result = isValidBusinessHour(dt(7, 59), BUSINESS_HOURS);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('expediente');
    });

    it('exatamente no horário de fechamento (18:00) é inválido', () => {
      const result = isValidBusinessHour(dt(18, 0), BUSINESS_HOURS);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('expediente');
    });

    it('último minuto válido (17:59) é aceito', () => {
      const result = isValidBusinessHour(dt(17, 59), BUSINESS_HOURS);
      expect(result.valid).toBe(true);
    });

    it('horário de almoço (12:00–12:59) é inválido', () => {
      expect(isValidBusinessHour(dt(12, 0), BUSINESS_HOURS).valid).toBe(false);
      expect(isValidBusinessHour(dt(12, 30), BUSINESS_HOURS).valid).toBe(false);
      expect(isValidBusinessHour(dt(12, 59), BUSINESS_HOURS).valid).toBe(false);
    });

    it('horário de almoço retorna reason com horário de almoço', () => {
      const result = isValidBusinessHour(dt(12, 0), BUSINESS_HOURS);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('almoço');
    });

    it('exatamente no retorno do almoço (13:00) é válido', () => {
      const result = isValidBusinessHour(dt(13, 0), BUSINESS_HOURS);
      expect(result.valid).toBe(true);
    });

    it('fora do expediente à noite é inválido', () => {
      const result = isValidBusinessHour(dt(20, 0), BUSINESS_HOURS);
      expect(result.valid).toBe(false);
    });

    it('dia marcado como fechado (isOpen=false) retorna inválido', () => {
      const result = isValidBusinessHour(dt(10, 0), CLOSED_ALL_WEEK);
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/fechado/i);
    });
  });

  // ── getWeekStart() ──────────────────────────────────────────────────────────

  describe('getWeekStart()', () => {
    it('retorna string no formato YYYY-MM-DD', () => {
      const result = getWeekStart();
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('retorna a segunda-feira da semana para uma data fornecida', () => {
      // 2026-04-04 é sábado, semana começa na segunda 2026-03-30
      const saturday = new Date(2026, 3, 4); // abril 04
      const result = getWeekStart(saturday);

      // Luxon considera segunda como início da semana (ISO week)
      const parsed = DateTime.fromISO(result);
      expect(parsed.weekday).toBe(1); // 1 = segunda
    });

    it('para uma segunda-feira, retorna ela mesma', () => {
      // 2026-03-30 é segunda
      const monday = new Date(2026, 2, 30);
      const result = getWeekStart(monday);
      const parsed = DateTime.fromISO(result);

      expect(parsed.weekday).toBe(1);
      expect(result).toBe('2026-03-30');
    });
  });
});
