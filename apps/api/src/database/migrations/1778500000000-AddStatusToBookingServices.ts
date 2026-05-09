import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStatusToBookingServices1778500000000 implements MigrationInterface {
  name = 'AddStatusToBookingServices1778500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "booking_services" ADD COLUMN "status" text NOT NULL DEFAULT 'PENDING'`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_services" ADD CONSTRAINT "CHK_booking_services_status"
        CHECK ("status" IN ('PENDING', 'IN_PROGRESS', 'DONE', 'SKIPPED'))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "booking_services" DROP CONSTRAINT "CHK_booking_services_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_services" DROP COLUMN "status"`,
    );
  }
}
