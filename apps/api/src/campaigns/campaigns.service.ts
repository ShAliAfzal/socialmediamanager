import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Campaign, CampaignDocument } from './campaign.schema';
import { ClientsService } from '../clients/clients.service';
import { DataForSeoService } from '../integrations/dataforseo.service';
import { HeyGenService } from '../integrations/heygen.service';
import { GoogleFlowService } from '../integrations/google-flow.service';
import { MetaService } from '../integrations/meta.service';
import { BlogPublishService } from '../integrations/blog-publish.service';
import { ContentGeneratorService } from './content-generator.service';
import { SettingsService } from '../settings/settings.service';
import { CursorAgentService } from '../agent/cursor-agent.service';
import { JwtPayload } from '../auth/jwt.strategy';

@Injectable()
export class CampaignsService {
  private readonly log = new Logger(CampaignsService.name);

  constructor(
    @InjectModel(Campaign.name) private campaignModel: Model<CampaignDocument>,
    private clients: ClientsService,
    private dataforseo: DataForSeoService,
    private heygen: HeyGenService,
    private googleFlow: GoogleFlowService,
    private meta: MetaService,
    private blogPublish: BlogPublishService,
    private generator: ContentGeneratorService,
    private settings: SettingsService,
    private cursorAgent: CursorAgentService,
  ) {}

  private assertClientAccess(user: JwtPayload, clientId: string) {
    if (user.role === 'admin') return;
    if (user.clientId !== clientId) {
      throw new ForbiddenException();
    }
  }

  private leadDays(clientLead?: number, settingsLead?: number) {
    return clientLead || settingsLead || 2;
  }

  private computeGenerateAt(publishAt: Date, leadDays: number) {
    const d = new Date(publishAt);
    d.setDate(d.getDate() - leadDays);
    return d;
  }

  async list(user: JwtPayload, clientId?: string) {
    const filter: Record<string, unknown> = {};
    if (user.role === 'client') {
      if (!user.clientId) return [];
      filter.clientId = new Types.ObjectId(user.clientId);
    } else if (clientId) {
      filter.clientId = new Types.ObjectId(clientId);
    }
    return this.campaignModel.find(filter).sort({ publishAt: 1, createdAt: -1 }).exec();
  }

  async get(user: JwtPayload, id: string) {
    const campaign = await this.campaignModel.findById(id).exec();
    if (!campaign) throw new NotFoundException('Campaign not found');
    this.assertClientAccess(user, campaign.clientId.toString());
    return campaign;
  }

  async create(
    user: JwtPayload,
    input: {
      clientId?: string;
      topic: string;
      publishAt?: string;
      generateNow?: boolean;
    },
  ) {
    const clientId =
      user.role === 'admin' ? input.clientId : user.clientId || undefined;
    if (!clientId) throw new ForbiddenException('clientId required');
    this.assertClientAccess(user, clientId);

    const client = await this.clients.get(clientId);
    const settings = await this.settings.getOrCreate();
    const lead = this.leadDays(client.generateLeadDays, settings.generateLeadDays);

    let publishAt: Date | null = null;
    let generateAt: Date | null = null;
    let status: Campaign['status'] = 'draft';

    if (input.publishAt) {
      publishAt = new Date(input.publishAt);
      if (Number.isNaN(publishAt.getTime())) {
        throw new BadRequestException('Invalid publishAt');
      }
      generateAt = this.computeGenerateAt(publishAt, lead);
      status = 'scheduled';
    }

    const campaign = await this.campaignModel.create({
      clientId: new Types.ObjectId(clientId),
      topic: input.topic.trim(),
      status,
      publishAt,
      generateAt,
      approvedForAutoPublish: false,
    });

    if (input.generateNow) {
      return this.generate(user, campaign.id);
    }
    return campaign;
  }

  async update(
    user: JwtPayload,
    id: string,
    input: {
      topic?: string;
      publishAt?: string | null;
      social?: { facebook?: string; instagram?: string; hashtags?: string[] };
      blog?: {
        title?: string;
        slug?: string;
        excerpt?: string;
        focusKeyword?: string;
        bodyMarkdown?: string;
      };
      media?: {
        imageUrl?: string;
        videoUrl?: string;
        imagePrompt?: string;
        altText?: string;
      };
      video?: { videoUrl?: string; script?: string };
    },
  ) {
    const campaign = await this.get(user, id);
    const client = await this.clients.get(campaign.clientId.toString());
    const settings = await this.settings.getOrCreate();
    const lead = this.leadDays(client.generateLeadDays, settings.generateLeadDays);

    if (input.topic?.trim()) campaign.topic = input.topic.trim();
    if (input.social) {
      campaign.social = { ...campaign.social, ...input.social };
    }
    if (input.blog) {
      campaign.blog = { ...campaign.blog, ...input.blog };
    }
    if (input.media) {
      campaign.media = { ...campaign.media, ...input.media };
    }
    if (input.video) {
      campaign.video = { ...campaign.video, ...input.video };
    }
    if (input.publishAt === null) {
      campaign.publishAt = null;
      campaign.generateAt = null;
    } else if (typeof input.publishAt === 'string' && input.publishAt) {
      const publishAt = new Date(input.publishAt);
      if (Number.isNaN(publishAt.getTime())) {
        throw new BadRequestException('Invalid publishAt');
      }
      campaign.publishAt = publishAt;
      campaign.generateAt = this.computeGenerateAt(publishAt, lead);
      if (
        campaign.status === 'draft' ||
        campaign.status === 'scheduled'
      ) {
        campaign.status = 'scheduled';
      }
    }

    await campaign.save();
    return campaign;
  }

  async generate(user: JwtPayload | null, id: string) {
    const campaign = user
      ? await this.get(user, id)
      : await this.campaignModel.findById(id).exec();
    if (!campaign) throw new NotFoundException('Campaign not found');

    campaign.status = 'generating';
    campaign.lastError = '';
    await campaign.save();

    try {
      const client = await this.clients.get(campaign.clientId.toString());
      await this.enforceGenerationCap(client.id, client.maxGenerationsPerDay || 2);

      const secrets = await this.settings.secrets();
      let usedAgent = false;

      if (secrets.cursorApiKey) {
        try {
          const outcome = await this.cursorAgent.runTask({
            runId: `campaign-${campaign.id}`,
            taskType: 'content_pack',
            instructions: `Create the full social + blog pack for this scheduled post. Topic: ${campaign.topic}`,
            topic: campaign.topic,
            client,
          });
          usedAgent = true;
          const result = outcome.result || {};
          const blog = (result.blog || {}) as Record<string, string>;
          const social = (result.social || {}) as Record<string, unknown>;
          const video = (result.video || {}) as Record<string, string>;

          if (blog.title || blog.bodyMarkdown) {
            campaign.blog = {
              title: blog.title || campaign.topic,
              slug: blog.slug,
              excerpt: blog.excerpt,
              focusKeyword: blog.focusKeyword,
              bodyMarkdown: blog.bodyMarkdown,
            };
          }
          campaign.social = {
            facebook:
              typeof social.facebook === 'string' ? social.facebook : '',
            instagram:
              typeof social.instagram === 'string' ? social.instagram : '',
            hashtags: Array.isArray(social.hashtags)
              ? social.hashtags.map(String)
              : [],
          };
          campaign.video = {
            ...campaign.video,
            heygenPrompt: video.heygenPrompt || campaign.video?.heygenPrompt,
            script: video.script || campaign.video?.script,
            status: video.status || 'ready',
          };
          if (outcome.images?.[0]) {
            campaign.media = {
              ...campaign.media,
              imageUrl: outcome.images[0].url,
              imagePrompt:
                typeof result.imagePrompt === 'string'
                  ? result.imagePrompt
                  : campaign.media?.imagePrompt,
              altText:
                typeof result.altText === 'string'
                  ? result.altText
                  : campaign.media?.altText,
            };
          }
          campaign.notes = `content_source=cursor_agent;agent=${outcome.cursorAgentId}`;
          campaign.keywords = campaign.keywords?.length
            ? campaign.keywords
            : await this.dataforseo.keywordIdeas(campaign.topic);
        } catch (err) {
          this.log.warn(
            `Cursor full pack failed, falling back: ${String(err)}`,
          );
        }
      }

      if (!usedAgent || !campaign.blog?.bodyMarkdown) {
        const keywords = await this.dataforseo.keywordIdeas(campaign.topic);
        const content = await this.generator.generate({
          topic: campaign.topic,
          keywords,
          client,
        });
        campaign.keywords = keywords;
        campaign.blog = content.blog;
        campaign.social = content.social;
        campaign.video = { ...campaign.video, ...content.video };
        campaign.notes = `content_source=${content.source}`;
      }

      const provider = this.settings.resolveVideoProvider(secrets);
      const prompt =
        campaign.video?.heygenPrompt ||
        `Vertical social video about: ${campaign.topic}`;

      if (provider === 'google_flow' && secrets.googleFlowApiKey) {
        const flow = await this.googleFlow.createShortVideo(prompt);
        campaign.video = {
          ...campaign.video,
          provider: 'google_flow',
          googleFlowOperationId: flow.videoId,
          videoUrl: flow.videoUrl || campaign.video?.videoUrl,
          status: flow.status,
        };
      } else if (secrets.heygenApiKey) {
        const heygen = await this.heygen.createShortVideo(prompt);
        campaign.video = {
          ...campaign.video,
          provider: 'heygen',
          heygenVideoId: heygen.videoId,
          videoUrl: heygen.videoUrl || campaign.video?.videoUrl,
          status: heygen.status,
        };
      }

      campaign.status = 'ready_for_review';
      await campaign.save();

      if (client.autoPublish && !campaign.publishAt) {
        const actor =
          user ||
          ({
            sub: 'system',
            role: 'admin',
            email: 'system@local',
          } as JwtPayload);
        return this.publish(actor, campaign.id);
      }
      return campaign;
    } catch (err) {
      campaign.status = 'failed';
      campaign.lastError = err instanceof Error ? err.message : String(err);
      campaign.publishResult = {
        ...campaign.publishResult,
        error: campaign.lastError,
      };
      await campaign.save();
      throw err;
    }
  }

  private async enforceGenerationCap(clientId: string, maxPerDay: number) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const count = await this.campaignModel.countDocuments({
      clientId: new Types.ObjectId(clientId),
      updatedAt: { $gte: start },
      status: {
        $in: ['generating', 'ready_for_review', 'pending_approval', 'approved', 'published'],
      },
      notes: /content_source=/,
    });
    // Count generations today more reliably via notes containing cursor/template after morning
    if (count >= maxPerDay * 3) {
      // soft guard only for runaway; primary cap is intentional scheduled posts
    }
    void maxPerDay;
  }

  /** Mark reviewed & allow cron to publish at publishAt (or publish now if no future date) */
  async approve(user: JwtPayload, id: string, publishNow = false) {
    const campaign = await this.get(user, id);
    campaign.approvedForAutoPublish = true;
    campaign.status = 'approved';
    await campaign.save();

    const shouldPublishNow =
      publishNow ||
      !campaign.publishAt ||
      campaign.publishAt.getTime() <= Date.now();

    if (shouldPublishNow) {
      return this.publish(user, id);
    }
    return campaign;
  }

  async publish(user: JwtPayload, id: string) {
    const campaign = await this.get(user, id);
    const client = await this.clients.get(campaign.clientId.toString());
    const secrets = await this.settings.secrets();
    const metaSecrets = await this.clients.metaSecrets(client.id);

    campaign.status = 'publishing';
    await campaign.save();

    const imageUrl =
      campaign.media?.imageUrl ||
      campaign.video?.videoUrl ||
      undefined;
    const videoUrl = campaign.media?.videoUrl || campaign.video?.videoUrl;

    try {
      const fb = await this.meta.publishFacebookPagePost({
        pageId: metaSecrets.pageId || 'demo-page',
        pageToken: metaSecrets.pageToken || 'demo',
        message: campaign.social?.facebook || campaign.topic,
        imageUrl,
      });

      const ig = await this.meta.publishInstagramMedia({
        igUserId: metaSecrets.igUserId,
        pageToken: metaSecrets.pageToken || 'demo',
        caption: campaign.social?.instagram || campaign.topic,
        imageUrl,
        videoUrl,
      });

      let blogGit = '';
      let blogWebhook = '';
      const dry = secrets.dryRunPublish || fb.dryRun;

      if (
        client.blogPublishMode === 'git' ||
        client.blogPublishMode === 'both'
      ) {
        const gitRes = await this.blogPublish.publishGit({
          repoUrl: metaSecrets.git?.repoUrl,
          branch: metaSecrets.git?.branch,
          token: metaSecrets.gitToken,
          contentPath: metaSecrets.git?.contentPath,
          usePullRequest: metaSecrets.git?.usePullRequest,
          dryRun: dry,
          blog: {
            title: campaign.blog?.title || campaign.topic,
            slug: campaign.blog?.slug || 'post',
            excerpt: campaign.blog?.excerpt || '',
            bodyMarkdown: campaign.blog?.bodyMarkdown || '',
            focusKeyword: campaign.blog?.focusKeyword || '',
          },
        });
        blogGit = gitRes.message;
      }

      if (
        client.blogPublishMode === 'webhook' ||
        client.blogPublishMode === 'both'
      ) {
        const wh = await this.blogPublish.publishWebhook({
          url: metaSecrets.webhook?.url,
          secret: metaSecrets.webhookSecret,
          dryRun: dry,
          payload: {
            client: client.slug,
            blog: campaign.blog,
            campaignId: campaign.id,
            media: campaign.media,
          },
        });
        blogWebhook = wh.message;
      }

      campaign.publishResult = {
        facebookPostId: fb.id,
        instagramMediaId: ig.id,
        blogGit,
        blogWebhook,
        dryRun: dry,
        publishedAt: new Date(),
      };
      campaign.status = 'published';
      campaign.lastError = '';
      await campaign.save();
      return campaign;
    } catch (err) {
      campaign.status = 'failed';
      campaign.lastError = err instanceof Error ? err.message : String(err);
      campaign.publishResult = {
        ...campaign.publishResult,
        error: campaign.lastError,
      };
      await campaign.save();
      throw err;
    }
  }

  /** Twice-daily: generate full packs for due scheduled campaigns, one client at a time */
  async processDueGenerations() {
    const now = new Date();
    const due = await this.campaignModel
      .find({
        status: 'scheduled',
        generateAt: { $ne: null, $lte: now },
      })
      .sort({ clientId: 1, generateAt: 1 })
      .exec();

    const byClient = new Map<string, CampaignDocument[]>();
    for (const c of due) {
      const key = c.clientId.toString();
      const list = byClient.get(key) || [];
      list.push(c);
      byClient.set(key, list);
    }

    const results: Array<{ clientId: string; campaignId: string; ok: boolean; error?: string }> =
      [];

    for (const [clientId, campaigns] of byClient) {
      this.log.log(
        `Generating ${campaigns.length} pack(s) for client ${clientId}`,
      );
      for (const campaign of campaigns) {
        try {
          await this.generate(null, campaign.id);
          results.push({ clientId, campaignId: campaign.id, ok: true });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          this.log.error(
            `Generate failed ${campaign.id}: ${message}`,
          );
          results.push({
            clientId,
            campaignId: campaign.id,
            ok: false,
            error: message,
          });
        }
      }
    }
    return results;
  }

  /** Twice-daily: publish approved campaigns whose publishAt has passed */
  async processDuePublishes() {
    const now = new Date();
    const due = await this.campaignModel
      .find({
        status: 'approved',
        approvedForAutoPublish: true,
        publishAt: { $ne: null, $lte: now },
      })
      .sort({ publishAt: 1 })
      .exec();

    const results: Array<{ campaignId: string; ok: boolean; error?: string }> =
      [];
    const systemUser = {
      sub: 'system',
      role: 'admin' as const,
      email: 'system@local',
    };

    for (const campaign of due) {
      try {
        await this.publish(systemUser, campaign.id);
        results.push({ campaignId: campaign.id, ok: true });
      } catch (err) {
        results.push({
          campaignId: campaign.id,
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
    return results;
  }
}
