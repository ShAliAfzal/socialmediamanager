import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SettingsDocument = HydratedDocument<Settings>;

@Schema({ timestamps: true })
export class Settings {
  @Prop({ default: 'global', unique: true })
  key!: string;

  @Prop({ default: '' })
  heygenApiKeyEncrypted!: string;

  @Prop({ default: '' })
  dataforseoLoginEncrypted!: string;

  @Prop({ default: '' })
  dataforseoPasswordEncrypted!: string;

  @Prop({ default: true })
  dryRunPublish!: boolean;
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);
