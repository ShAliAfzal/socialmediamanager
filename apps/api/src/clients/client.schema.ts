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
      lastVerifiedAt: Date,
      lastVerifyStatus: String,
      lastVerifyMessage: String,
    },
    default: {},
  })
  meta!: {
    pageId?: string;
    pageName?: string;
    pageTokenEncrypted?: string;
    igUserId?: string;
    connectedAt?: Date;
    lastVerifiedAt?: Date;
    lastVerifyStatus?: string;
    lastVerifyMessage?: string;
  };

  @Prop({ default: 'General business' })
  niche!: string;

  @Prop({ default: 'Clear, helpful, on-brand. No hype.' })
  brandVoice!: string;

  /** Days before publishAt to generate full content pack (default 2) */
  @Prop({ default: 2 })
  generateLeadDays!: number;

  /** Soft cap: max Cursor full-pack generations per calendar day */
  @Prop({ default: 2 })
  maxGenerationsPerDay!: number;

  /**
   * Preferred go-live times for this client (local clock, HH:mm).
   * Typically two slots = twice a day.
   */
  @Prop({ type: [String], default: ['10:00', '18:00'] })
  postTimes!: string[];

  /** IANA timezone used when applying postTimes (e.g. Asia/Karachi) */
  @Prop({ default: 'Asia/Karachi' })
  timezone!: string;

  /** 0=Sun … 6=Sat; empty = every day */
  @Prop({ type: [Number], default: [1, 2, 3, 4, 5] })
  postWeekdays!: number[];
}

export const ClientSchema = SchemaFactory.createForClass(Client);
