import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Client, ClientSchema } from './client.schema';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { UsersModule } from '../users/users.module';
import { SettingsModule } from '../settings/settings.module';
import { MetaService } from '../integrations/meta.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Client.name, schema: ClientSchema }]),
    UsersModule,
    SettingsModule,
  ],
  providers: [ClientsService, MetaService],
  controllers: [ClientsController],
  exports: [ClientsService],
})
export class ClientsModule {}
