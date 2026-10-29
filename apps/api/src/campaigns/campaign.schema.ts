import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CampaignDocument = HydratedDocument<Campaign>;

export type CampaignStatus =
  | 'draft'
  | 'scheduled'
  | 'generating'
  | 'ready_for_review'
  | 'pending_approval'
  | 'approved'
  | 'publishing'
  | 'published'
  | 'failed';

@Schema({ timestamps: true })
export class Campaign {
  @Prop({ type: Types.ObjectId, ref: 'Client', required: true, index: true })
  clientId!: Types.ObjectId;

  @Prop({ required: true })
  topic!: string;

  @Prop({
    default: 'draft',
    enum: [
      'draft',
      'scheduled',
      'generating',
      'ready_for_review',
      'pending_approval',
      'approved',
      'publishing',
      'published',
      'failed',
    ],
  })
  status!: CampaignStatus;

  /** When the post should go live */
  @Prop({ type: Date, default: null, index: true })
  publishAt!: Date | null;

  /** When content should be generated (usually publishAt − 2 days) */
  @Prop({ type: Date, default: null, index: true })
  generateAt!: Date | null;

  /** After review, allow the twice-daily cron to publish at publishAt */
  @Prop({ default: false })
  approvedForAutoPublish!: boolean;

  @Prop({ type: [String], default: [] })
  keywords!: string[];

  @Prop({
    type: {
      title: String,
      slug: String,
      excerpt: String,
      focusKeyword: String,
      bodyMarkdown: String,
    },
    default: {},
  })
  blog!: {
    title?: string;
    slug?: string;
    excerpt?: string;
    focusKeyword?: string;
    bodyMarkdown?: string;
  };

  @Prop({
    type: {
      facebook: String,
      instagram: String,
      hashtags: [String],
    },
    default: {},
  })
  social!: {
    facebook?: string;
    instagram?: string;
    hashtags?: string[];
  };

  @Prop({
    type: {
      heygenPrompt: String,
      script: String,
      videoUrl: String,
      heygenVideoId: String,
      googleFlowOperationId: String,
      provider: String,
      status: String,
    },
    default: {},
  })
  video!: {
    heygenPrompt?: string;
    script?: string;
    videoUrl?: string;
    heygenVideoId?: string;
    googleFlowOperationId?: string;
    provider?: string;
    status?: string;
  };

  /** Agent or manually pasted creative */
  @Prop({
    type: {
      imageUrl: String,
      videoUrl: String,
      imagePrompt: String,
      altText: String,
    },
    default: {},
  })
  media!: {
    imageUrl?: string;
    videoUrl?: string;
    imagePrompt?: string;
    altText?: string;
  };

  @Prop({
    type: {
      facebookPostId: String,
      instagramMediaId: String,
      blogGit: String,
      blogWebhook: String,
      dryRun: Boolean,
      error: String,
      publishedAt: Date,
    },
    default: {},
  })
  publishResult!: {
    facebookPostId?: string;
    instagramMediaId?: string;
    blogGit?: string;
    blogWebhook?: string;
    dryRun?: boolean;
    error?: string;
    publishedAt?: Date;
  };

  @Prop({ default: '' })
  notes!: string;

  @Prop({ default: '' })
  lastError!: string;
}

export const CampaignSchema = SchemaFactory.createForClass(Campaign);
CampaignSchema.index({ status: 1, generateAt: 1 });
CampaignSchema.index({ status: 1, publishAt: 1, approvedForAutoPublish: 1 });
