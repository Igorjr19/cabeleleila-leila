import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDescriptionToServices1780500000000 implements MigrationInterface {
  name = 'AddDescriptionToServices1780500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "services" ADD COLUMN "description" text`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "services" DROP COLUMN "description"`);
  }
}
