import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddActiveToServices1780000000000 implements MigrationInterface {
  name = 'AddActiveToServices1780000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "services" ADD COLUMN "active" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "services" DROP COLUMN "active"`);
  }
}
