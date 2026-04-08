import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as path from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth/auth.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { EstablishmentModule } from './modules/establishment/establishment.module';
import { ServicesModule } from './modules/services/services.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      username: process.env.DB_USER ?? 'cabeleleila',
      password: process.env.DB_PASSWORD ?? 'cabeleleila123',
      database: process.env.DB_NAME ?? 'cabeleleila_db',
      synchronize: false,
      autoLoadEntities: true,
      logging: process.env.NODE_ENV === 'development',
      migrations: [path.join(__dirname, 'database/migrations/*.{ts,js}')],
      migrationsRun: true,
    }),
    AuthModule,
    UsersModule,
    EstablishmentModule,
    ServicesModule,
    BookingsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
