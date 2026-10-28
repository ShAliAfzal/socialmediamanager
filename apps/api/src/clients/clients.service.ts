import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Client, ClientDocument } from './client.schema';
import {
  decryptSecret,
  encryptSecret,
  maskSecret,
} from '../common/crypto.util';

@Injectable()
export class ClientsService {
  constructor(
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
  ) {}

  list() {
    return this.clientModel.find().sort({ name: 1 }).exec();
  }

  async get(id: string) {
    const client = await this.clientModel.findById(id).exec();
    if (!client) throw new NotFoundException('Client not found');
    return client;
  }

  async getBySlug(slug: string) {
    return this.clientModel.findOne({ slug }).exec();
  }

  create(data: Partial<Client>) {
    return this.clientModel.create(data);
  }

  toPublic(client: ClientDocument) {
    return {
      id: client.id,
      slug: client.slug,
      name: client.name,
      websiteUrl: client.websiteUrl,
      autoPublish: client.autoPublish,
      blogPublishMode: client.blogPublishMode,
      niche: client.niche,
      brandVoice: client.brandVoice,
      git: {
        repoUrl: client.git?.repoUrl || '',
        branch: client.git?.branch || 'main',
        contentPath: client.git?.contentPath || '',
        usePullRequest: Boolean(client.git?.usePullRequest),
        tokenConfigured: Boolean(client.git?.tokenEncrypted),
      },
      webhook: {
        url: client.webhook?.url || '',
        secretConfigured: Boolean(client.webhook?.secretEncrypted),
      },
      meta: {
        pageId: client.meta?.pageId || '',
        pageName: client.meta?.pageName || '',
        igUserId: client.meta?.igUserId || '',
        tokenConfigured: Boolean(client.meta?.pageTokenEncrypted),
        tokenMasked: client.meta?.pageTokenEncrypted
          ? maskSecret(decryptSecret(client.meta.pageTokenEncrypted))
          : '',
        connectedAt: client.meta?.connectedAt || null,
      },
    };
  }

  async updateProfile(
    id: string,
    input: Partial<{
      name: string;
      websiteUrl: string;
      autoPublish: boolean;
      blogPublishMode: Client['blogPublishMode'];
      niche: string;
      brandVoice: string;
      git: {
        repoUrl?: string;
        branch?: string;
        token?: string;
        contentPath?: string;
        usePullRequest?: boolean;
      };
      webhook: { url?: string; secret?: string };
    }>,
  ) {
    const client = await this.get(id);
    if (input.name) client.name = input.name;
    if (input.websiteUrl !== undefined) client.websiteUrl = input.websiteUrl;
    if (typeof input.autoPublish === 'boolean')
      client.autoPublish = input.autoPublish;
    if (input.blogPublishMode) client.blogPublishMode = input.blogPublishMode;
    if (input.niche) client.niche = input.niche;
    if (input.brandVoice) client.brandVoice = input.brandVoice;

    if (input.git) {
      client.git = {
        ...client.git,
        repoUrl: input.git.repoUrl ?? client.git?.repoUrl,
        branch: input.git.branch ?? client.git?.branch,
        contentPath: input.git.contentPath ?? client.git?.contentPath,
        usePullRequest:
          input.git.usePullRequest ?? client.git?.usePullRequest ?? true,
        tokenEncrypted: input.git.token?.trim()
          ? encryptSecret(input.git.token.trim())
          : client.git?.tokenEncrypted,
      };
    }

    if (input.webhook) {
      client.webhook = {
        ...client.webhook,
        url: input.webhook.url ?? client.webhook?.url,
        secretEncrypted: input.webhook.secret?.trim()
          ? encryptSecret(input.webhook.secret.trim())
          : client.webhook?.secretEncrypted,
      };
    }

    await client.save();
    return this.toPublic(client);
  }

  async connectMeta(
    id: string,
    input: {
      pageId: string;
      pageName?: string;
      pageToken: string;
      igUserId?: string;
    },
  ) {
    const client = await this.get(id);
    client.meta = {
      pageId: input.pageId.trim(),
      pageName: input.pageName?.trim() || client.meta?.pageName || '',
      pageTokenEncrypted: encryptSecret(input.pageToken.trim()),
      igUserId: input.igUserId?.trim() || client.meta?.igUserId || '',
      connectedAt: new Date(),
    };
    await client.save();
    return this.toPublic(client);
  }

  async metaSecrets(id: string) {
    const client = await this.get(id);
    return {
      pageId: client.meta?.pageId || '',
      pageName: client.meta?.pageName || '',
      igUserId: client.meta?.igUserId || '',
      pageToken: client.meta?.pageTokenEncrypted
        ? decryptSecret(client.meta.pageTokenEncrypted)
        : '',
      gitToken: client.git?.tokenEncrypted
        ? decryptSecret(client.git.tokenEncrypted)
        : '',
      webhookSecret: client.webhook?.secretEncrypted
        ? decryptSecret(client.webhook.secretEncrypted)
        : '',
      git: client.git,
      webhook: client.webhook,
      blogPublishMode: client.blogPublishMode,
      autoPublish: client.autoPublish,
    };
  }
}
