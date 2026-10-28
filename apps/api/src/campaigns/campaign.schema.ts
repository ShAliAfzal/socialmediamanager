import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type CampaignDocument = HydratedDocument<Campaign>;

export type CampaignStatus =
  | 'draft'
  | 'generating'
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
      'generating',
      'pending_approval',
      'approved',
      'publishing',
      'published',
      'failed',
    ],
  })
  status!: CampaignStatus;

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
      status: String,
    },
    default: {},
  })
  video!: {
    heygenPrompt?: string;
    script?: string;
    videoUrl?: string;
    heygenVideoId?: string;
    status?: string;
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
}

export const CampaignSchema = SchemaFactory.createForClass(Campaign);
