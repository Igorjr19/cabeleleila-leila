import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTimeBlocks1779500000000 implements MigrationInterface {
  name = 'CreateTimeBlocks1779500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "time_blocks" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "establishment_id" uuid NOT NULL,
        "starts_at" timestamptz NOT NULL,
        "ends_at" timestamptz NOT NULL,
        "reason" varchar(255),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_time_blocks_establishment"
          FOREIGN KEY ("establishment_id")
          REFERENCES "establishments"("id")
          ON DELETE CASCADE,
        CONSTRAINT "CHK_time_blocks_range"
          CHECK ("ends_at" > "starts_at")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_time_blocks_establishment_starts" ON "time_blocks" ("establishment_id", "starts_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_time_blocks_establishment_starts"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "time_blocks"`);
  }
}
