import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ClientDocument = HydratedDocument<Client>;

export type PublishMode = 'git' | 'webhook' | 'both' | 'none';

@Schema({ timestamps: true })
export class Client {
  @Prop({ required: true, unique: true, trim: true })
  slug!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ default: '' })
  websiteUrl!: string;

  @Prop({ default: false })
  autoPublish!: boolean;

  @Prop({ default: 'none', enum: ['git', 'webhook', 'both', 'none'] })
  blogPublishMode!: PublishMode;

  @Prop({
    type: {
      repoUrl: String,
      branch: String,
      tokenEncrypted: String,
      contentPath: String,
      usePullRequest: Boolean,
    },
    default: {},
  })
  git!: {
    repoUrl?: string;
    branch?: string;
    tokenEncrypted?: string;
    contentPath?: string;
    usePullRequest?: boolean;
  };

  @Prop({
    type: {
      url: String,
      secretEncrypted: String,
    },
    default: {},
  })
  webhook!: {
    url?: string;
    secretEncrypted?: string;
  };

  @Prop({
    type: {
      pageId: String,
      pageName: String,
      pageTokenEncrypted: String,
      igUserId: String,
      connectedAt: Date,
    },
    default: {},
  })
  meta!: {
    pageId?: string;
    pageName?: string;
    pageTokenEncrypted?: string;
    igUserId?: string;
    connectedAt?: Date;
  };

  @Prop({ default: 'Amazon FBA growth, PPC, listing conversion' })
  niche!: string;

  @Prop({ default: 'Ecom Risers tone: direct operator voice, no hype.' })
  brandVoice!: string;
}

export const ClientSchema = SchemaFactory.createForClass(Client);
