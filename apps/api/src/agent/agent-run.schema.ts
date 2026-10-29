import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AgentRunDocument = HydratedDocument<AgentRun>;

export type AgentTaskType = 'image_post' | 'content_pack' | 'custom';

export type AgentRunStatus =
  | 'queued'
  | 'running'
  | 'succeeded'
  | 'failed';

@Schema({ timestamps: true })
export class AgentRun {
  @Prop({ type: Types.ObjectId, ref: 'Client', required: true, index: true })
  clientId!: Types.ObjectId;

  @Prop({
    required: true,
    enum: ['image_post', 'content_pack', 'custom'],
  })
  taskType!: AgentTaskType;

  @Prop({ required: true })
  instructions!: string;

  @Prop({ default: '' })
  topic!: string;

  @Prop({
    default: 'queued',
    enum: ['queued', 'running', 'succeeded', 'failed'],
  })
  status!: AgentRunStatus;

  @Prop({ default: '' })
  cursorAgentId!: string;

  @Prop({ default: '' })
  cursorRunId!: string;

  @Prop({ default: '' })
  summary!: string;

  @Prop({ type: Object, default: {} })
  result!: Record<string, unknown>;

  @Prop({
    type: [
      {
        path: String,
        url: String,
        filename: String,
        mimeType: String,
        sizeBytes: Number,
      },
    ],
    default: [],
  })
  images!: Array<{
    path: string;
    url: string;
    filename: string;
    mimeType?: string;
    sizeBytes?: number;
  }>;

  @Prop({ default: '' })
  error!: string;

  @Prop({ type: Types.ObjectId, ref: 'Campaign', default: null })
  campaignId?: Types.ObjectId | null;
}

export const AgentRunSchema = SchemaFactory.createForClass(AgentRun);
