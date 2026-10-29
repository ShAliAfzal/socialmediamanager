import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Campaign, CampaignSchema } from './campaign.schema';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { ContentGeneratorService } from './content-generator.service';
import { ClientsModule } from '../clients/clients.module';
import { SettingsModule } from '../settings/settings.module';
import { DataForSeoService } from '../integrations/dataforseo.service';
import { HeyGenService } from '../integrations/heygen.service';
import { GoogleFlowService } from '../integrations/google-flow.service';
import { MetaService } from '../integrations/meta.service';
import { BlogPublishService } from '../integrations/blog-publish.service';
import { CursorContentService } from '../integrations/cursor-content.service';
import { CursorAgentService } from '../agent/cursor-agent.service';
import { CampaignScheduler } from './campaign.scheduler';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Campaign.name, schema: CampaignSchema },
    ]),
    ClientsModule,
    SettingsModule,
  ],
  providers: [
    CampaignsService,
    CampaignScheduler,
    ContentGeneratorService,
    CursorContentService,
    CursorAgentService,
    DataForSeoService,
    HeyGenService,
    GoogleFlowService,
    MetaService,
    BlogPublishService,
  ],
  controllers: [CampaignsController],
  exports: [CampaignsService, CampaignScheduler],
})
export class CampaignsModule {}
