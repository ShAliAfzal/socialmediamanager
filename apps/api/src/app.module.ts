import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { SettingsModule } from './settings/settings.module';
import { CampaignsModule } from './campaigns/campaigns.module';
import { SeedModule } from './seed.module';
import { HealthController } from './health.controller';
import { resolveMongoUri } from './mongo';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env', '.env'],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const preferred = config.get<string>('MONGO_URI');
        try {
          const uri = await resolveMongoUri(
            process.env.USE_MEMORY_MONGO === 'true' ? undefined : preferred,
          );
          return { uri };
        } catch {
          const uri = await resolveMongoUri(undefined);
          return { uri };
        }
      },
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    ClientsModule,
    SettingsModule,
    CampaignsModule,
    SeedModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
