import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AgentRun, AgentRunSchema } from './agent-run.schema';
import { AgentService } from './agent.service';
import { AgentController } from './agent.controller';
import { CursorAgentService } from './cursor-agent.service';
import { ClientsModule } from '../clients/clients.module';
import { SettingsModule } from '../settings/settings.module';
import { CampaignsModule } from '../campaigns/campaigns.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AgentRun.name, schema: AgentRunSchema },
    ]),
    ClientsModule,
    SettingsModule,
    CampaignsModule,
  ],
  providers: [AgentService, CursorAgentService],
  controllers: [AgentController],
  exports: [AgentService],
})
export class AgentModule {}
