import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Campaign, CampaignDocument } from './campaign.schema';
import { ClientsService } from '../clients/clients.service';
import { DataForSeoService } from '../integrations/dataforseo.service';
import { HeyGenService } from '../integrations/heygen.service';
import { MetaService } from '../integrations/meta.service';
import { BlogPublishService } from '../integrations/blog-publish.service';
import { ContentGeneratorService } from './content-generator.service';
import { SettingsService } from '../settings/settings.service';
import { JwtPayload } from '../auth/jwt.strategy';

@Injectable()
export class CampaignsService {
  constructor(
    @InjectModel(Campaign.name) private campaignModel: Model<CampaignDocument>,
    private clients: ClientsService,
    private dataforseo: DataForSeoService,
    private heygen: HeyGenService,
    private meta: MetaService,
    private blogPublish: BlogPublishService,
    private generator: ContentGeneratorService,
    private settings: SettingsService,
  ) {}

  private assertClientAccess(user: JwtPayload, clientId: string) {
    if (user.role === 'admin') return;
    if (user.clientId !== clientId) {
      throw new ForbiddenException();
    }
  }

  async list(user: JwtPayload, clientId?: string) {
    const filter: Record<string, unknown> = {};
    if (user.role === 'client') {
      if (!user.clientId) return [];
      filter.clientId = new Types.ObjectId(user.clientId);
    } else if (clientId) {
      filter.clientId = new Types.ObjectId(clientId);
    }
    return this.campaignModel.find(filter).sort({ createdAt: -1 }).exec();
  }

  async get(user: JwtPayload, id: string) {
    const campaign = await this.campaignModel.findById(id).exec();
    if (!campaign) throw new NotFoundException('Campaign not found');
    this.assertClientAccess(user, campaign.clientId.toString());
    return campaign;
  }

  async create(user: JwtPayload, input: { clientId?: string; topic: string }) {
    const clientId =
      user.role === 'admin' ? input.clientId : user.clientId || undefined;
    if (!clientId) throw new ForbiddenException('clientId required');
    this.assertClientAccess(user, clientId);

    const campaign = await this.campaignModel.create({
      clientId: new Types.ObjectId(clientId),
      topic: input.topic.trim(),
      status: 'draft',
    });
    return campaign;
  }

  async generate(user: JwtPayload, id: string) {
    const campaign = await this.get(user, id);
    campaign.status = 'generating';
    await campaign.save();

    try {
      const client = await this.clients.get(campaign.clientId.toString());
      const keywords = await this.dataforseo.keywordIdeas(campaign.topic);
      const content = this.generator.generate({
        topic: campaign.topic,
        keywords,
        client,
      });

      campaign.keywords = keywords;
      campaign.blog = content.blog;
      campaign.social = content.social;
      campaign.video = content.video;

      const heygen = await this.heygen.createShortVideo(
        content.video.heygenPrompt,
      );
      campaign.video = {
        ...campaign.video,
        heygenVideoId: heygen.videoId,
        videoUrl: heygen.videoUrl,
        status: heygen.status,
      };

      campaign.status = 'pending_approval';
      await campaign.save();

      if (client.autoPublish) {
        return this.publish(user, campaign.id);
      }
      return campaign;
    } catch (err) {
      campaign.status = 'failed';
      campaign.publishResult = {
        ...campaign.publishResult,
        error: String(err),
      };
      await campaign.save();
      throw err;
    }
  }

  async approve(user: JwtPayload, id: string) {
    const campaign = await this.get(user, id);
    campaign.status = 'approved';
    await campaign.save();
    return this.publish(user, id);
  }

  async publish(user: JwtPayload, id: string) {
    const campaign = await this.get(user, id);
    const client = await this.clients.get(campaign.clientId.toString());
    const secrets = await this.settings.secrets();
    const metaSecrets = await this.clients.metaSecrets(client.id);

    campaign.status = 'publishing';
    await campaign.save();

    try {
      const fb = await this.meta.publishFacebookPagePost({
        pageId: metaSecrets.pageId || 'demo-page',
        pageToken: metaSecrets.pageToken || 'demo',
        message: campaign.social?.facebook || campaign.topic,
      });

      const ig = await this.meta.publishInstagramCaptionOnlyNotice({
        igUserId: metaSecrets.igUserId,
        pageToken: metaSecrets.pageToken || 'demo',
        caption: campaign.social?.instagram || campaign.topic,
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
      await campaign.save();
      return campaign;
    } catch (err) {
      campaign.status = 'failed';
      campaign.publishResult = {
        ...campaign.publishResult,
        error: String(err),
      };
      await campaign.save();
      throw err;
    }
  }
}
