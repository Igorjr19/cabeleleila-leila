import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConfigAndPriceAtBooking1775210000000 implements MigrationInterface {
  name = 'AddConfigAndPriceAtBooking1775210000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "establishments" ADD "config" jsonb NOT NULL DEFAULT '{"min_days_for_online_update":2,"business_hours":{"open":"08:00","close":"18:00","lunchStart":"12:00","lunchEnd":"13:00"}}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "booking_services" ADD "price_at_booking" numeric(10,2) NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "booking_services" DROP COLUMN "price_at_booking"`,
    );
    await queryRunner.query(
      `ALTER TABLE "establishments" DROP COLUMN "config"`,
    );
  }
}
