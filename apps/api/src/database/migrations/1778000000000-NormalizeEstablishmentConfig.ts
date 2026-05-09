/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { MigrationInterface, QueryRunner } from 'typeorm';

interface OldBusinessHours {
  day_of_week: number;
  open_time: string;
  close_time: string;
  lunch_start: string | null;
  lunch_end: string | null;
}

interface OldConfig {
  min_days_for_online_update?: number;
  business_hours?: OldBusinessHours[] | Record<string, string>;
}

interface NewBusinessHours {
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  lunchStart: string | null;
  lunchEnd: string | null;
}

interface NewConfig {
  minDaysForOnlineUpdate: number;
  businessHours: NewBusinessHours[];
}

const FALLBACK_OPEN_TIME = '09:00';
const FALLBACK_CLOSE_TIME = '18:00';

function buildSevenDayHours(old: OldConfig): NewBusinessHours[] {
  const oldHours = Array.isArray(old.business_hours) ? old.business_hours : [];

  return Array.from({ length: 7 }).map((_, dayOfWeek) => {
    const match = oldHours.find((h) => h.day_of_week === dayOfWeek);
    if (match) {
      return {
        dayOfWeek,
        isOpen: true,
        openTime: match.open_time ?? FALLBACK_OPEN_TIME,
        closeTime: match.close_time ?? FALLBACK_CLOSE_TIME,
        lunchStart: match.lunch_start ?? null,
        lunchEnd: match.lunch_end ?? null,
      };
    }
    return {
      dayOfWeek,
      isOpen: false,
      openTime: FALLBACK_OPEN_TIME,
      closeTime: FALLBACK_CLOSE_TIME,
      lunchStart: null,
      lunchEnd: null,
    };
  });
}

export class NormalizeEstablishmentConfig1778000000000 implements MigrationInterface {
  name = 'NormalizeEstablishmentConfig1778000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "establishments" ALTER COLUMN "config" DROP DEFAULT`,
    );
    await queryRunner.query(
      `ALTER TABLE "establishments" ALTER COLUMN "config" DROP NOT NULL`,
    );

    const rows: { id: string; config: OldConfig | null }[] =
      await queryRunner.query(
        `SELECT id, config FROM establishments WHERE config IS NOT NULL`,
      );

    for (const row of rows) {
      if (!row.config) continue;
      if (
        Object.prototype.hasOwnProperty.call(row.config, 'businessHours') ||
        Object.prototype.hasOwnProperty.call(
          row.config,
          'minDaysForOnlineUpdate',
        )
      ) {
        continue;
      }

      const newConfig: NewConfig = {
        minDaysForOnlineUpdate: row.config.min_days_for_online_update ?? 2,
        businessHours: buildSevenDayHours(row.config),
      };

      await queryRunner.query(
        `UPDATE establishments SET config = $1::jsonb WHERE id = $2`,
        [JSON.stringify(newConfig), row.id],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE establishments SET config = '{"min_days_for_online_update":2,"business_hours":{"open":"08:00","close":"18:00","lunchStart":"12:00","lunchEnd":"13:00"}}'::jsonb WHERE config IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "establishments" ALTER COLUMN "config" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "establishments" ALTER COLUMN "config" SET DEFAULT '{"min_days_for_online_update":2,"business_hours":{"open":"08:00","close":"18:00","lunchStart":"12:00","lunchEnd":"13:00"}}'`,
    );

    const rows: { id: string; config: NewConfig | null }[] =
      await queryRunner.query(
        `SELECT id, config FROM establishments WHERE config IS NOT NULL`,
      );

    for (const row of rows) {
      if (!row.config) continue;
      if (!Array.isArray(row.config.businessHours)) continue;

      const oldConfig: OldConfig = {
        min_days_for_online_update: row.config.minDaysForOnlineUpdate ?? 2,
        business_hours: row.config.businessHours
          .filter((h) => h.isOpen)
          .map((h) => ({
            day_of_week: h.dayOfWeek,
            open_time: h.openTime,
            close_time: h.closeTime,
            lunch_start: h.lunchStart,
            lunch_end: h.lunchEnd,
          })),
      };

      await queryRunner.query(
        `UPDATE establishments SET config = $1::jsonb WHERE id = $2`,
        [JSON.stringify(oldConfig), row.id],
      );
    }
  }
}
