import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemapBookingServiceStatus1779000000000 implements MigrationInterface {
  name = 'RemapBookingServiceStatus1779000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "booking_services" DROP CONSTRAINT IF EXISTS "CHK_booking_services_status"`,
    );

    await queryRunner.query(
      `UPDATE "booking_services" SET "status" = 'CONFIRMED' WHERE "status" IN ('IN_PROGRESS', 'DONE')`,
    );
    await queryRunner.query(
      `UPDATE "booking_services" SET "status" = 'DECLINED' WHERE "status" = 'SKIPPED'`,
    );

    await queryRunner.query(
      `ALTER TABLE "booking_services" ADD CONSTRAINT "CHK_booking_services_status"
        CHECK ("status" IN ('PENDING', 'CONFIRMED', 'DECLINED'))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "booking_services" DROP CONSTRAINT IF EXISTS "CHK_booking_services_status"`,
    );
    await queryRunner.query(
      `UPDATE "booking_services" SET "status" = 'DONE' WHERE "status" = 'CONFIRMED'`,
    );
    await queryRunner.query(
      `UPDATE "booking_services" SET "status" = 'SKIPPED' WHERE "status" = 'DECLINED'`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_services" ADD CONSTRAINT "CHK_booking_services_status"
        CHECK ("status" IN ('PENDING', 'IN_PROGRESS', 'DONE', 'SKIPPED'))`,
    );
  }
}
