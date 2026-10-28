import { Module } from '@nestjs/common';
import { SeedService } from './seed.service';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { SettingsModule } from './settings/settings.module';
import { CampaignsModule } from './campaigns/campaigns.module';

@Module({
  imports: [UsersModule, ClientsModule, SettingsModule, CampaignsModule],
  providers: [SeedService],
})
export class SeedModule {}
