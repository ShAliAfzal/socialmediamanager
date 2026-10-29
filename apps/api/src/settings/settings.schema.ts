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
  googleFlowApiKeyEncrypted!: string;

  @Prop({ default: 'gemini-omni-1.1-flash' })
  googleFlowModel!: string;

  /** heygen | google_flow | auto */
  @Prop({ default: 'auto' })
  videoProvider!: string;

  @Prop({ default: '' })
  cursorApiKeyEncrypted!: string;

  @Prop({ default: 'composer-2.5' })
  cursorModel!: string;

  @Prop({ default: '' })
  dataforseoLoginEncrypted!: string;

  @Prop({ default: '' })
  dataforseoPasswordEncrypted!: string;

  @Prop({ default: true })
  dryRunPublish!: boolean;

  /** Hours (0–23, server local) for the twice-daily job */
  @Prop({ type: [Number], default: [9, 21] })
  scheduleHours!: number[];

  @Prop({ default: 2 })
  generateLeadDays!: number;
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);
