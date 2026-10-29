import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { Client, ClientDocument } from './client.schema';
import {
  decryptSecret,
  encryptSecret,
  maskSecret,
} from '../common/crypto.util';
import { UsersService } from '../users/users.service';
import { MetaService } from '../integrations/meta.service';

export type MetaConnectionStatus =
  | 'not_connected'
  | 'demo'
  | 'live'
  | 'invalid'
  | 'saved';

@Injectable()
export class ClientsService {
  constructor(
    @InjectModel(Client.name) private clientModel: Model<ClientDocument>,
    private users: UsersService,
    private meta: MetaService,
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

  slugify(input: string) {
    return input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60);
  }

  async createWorkspace(input: {
    name: string;
    slug?: string;
    websiteUrl?: string;
    niche?: string;
    brandVoice?: string;
    blogPublishMode?: Client['blogPublishMode'];
    autoPublish?: boolean;
    loginEmail: string;
    loginPassword: string;
    loginName?: string;
  }) {
    const slug = this.slugify(input.slug || input.name);
    if (!slug) throw new BadRequestException('Invalid slug');
    if (await this.getBySlug(slug)) {
      throw new ConflictException(`Client slug "${slug}" already exists`);
    }

    const email = input.loginEmail.trim().toLowerCase();
    if (await this.users.findByEmail(email)) {
      throw new ConflictException(`Login email "${email}" already exists`);
    }
    if (!input.loginPassword || input.loginPassword.length < 6) {
      throw new BadRequestException('Password must be at least 6 characters');
    }

    const client = await this.clientModel.create({
      slug,
      name: input.name.trim(),
      websiteUrl: input.websiteUrl?.trim() || '',
      niche: input.niche?.trim() || 'General business',
      brandVoice:
        input.brandVoice?.trim() ||
        'Clear, helpful, on-brand. No hype.',
      blogPublishMode: input.blogPublishMode || 'none',
      autoPublish: Boolean(input.autoPublish),
    });

    const user = await this.users.create({
      email,
      name: input.loginName?.trim() || `${client.name} Client`,
      role: 'client',
      passwordHash: await bcrypt.hash(input.loginPassword, 10),
      clientId: client._id,
    });

    return {
      client: this.toPublic(client),
      login: {
        email: user.email,
        name: user.name,
        role: user.role,
        temporaryPassword: input.loginPassword,
      },
    };
  }

  private readPageToken(client: ClientDocument) {
    return client.meta?.pageTokenEncrypted
      ? decryptSecret(client.meta.pageTokenEncrypted)
      : '';
  }

  private classifyMeta(client: ClientDocument): {
    connectionStatus: MetaConnectionStatus;
    connectionLabel: string;
    connectionMessage: string;
    tokenConfigured: boolean;
    isDemo: boolean;
  } {
    const pageToken = this.readPageToken(client);
    const pageId = client.meta?.pageId || '';
    const hasToken = Boolean(pageToken);
    const isDemo = this.meta.isDemoCredentials({ pageId, pageToken });

    if (!hasToken || isDemo) {
      return {
        connectionStatus: 'not_connected',
        connectionLabel: 'Not connected',
        connectionMessage: '',
        tokenConfigured: false,
        isDemo: isDemo && hasToken,
      };
    }

    const last = client.meta?.lastVerifyStatus;
    if (last === 'live') {
      return {
        connectionStatus: 'live',
        connectionLabel: 'Connected',
        connectionMessage: '',
        tokenConfigured: true,
        isDemo: false,
      };
    }

    if (last === 'invalid') {
      return {
        connectionStatus: 'invalid',
        connectionLabel: 'Invalid token',
        connectionMessage: 'Saved token was rejected by Meta.',
        tokenConfigured: false,
        isDemo: false,
      };
    }

    // Saved but not verified yet — not connected until Meta confirms
    return {
      connectionStatus: 'not_connected',
      connectionLabel: 'Not connected',
      connectionMessage: '',
      tokenConfigured: false,
      isDemo: false,
    };
  }

  toPublic(client: ClientDocument) {
    const metaStatus = this.classifyMeta(client);
    return {
      id: client.id,
      slug: client.slug,
      name: client.name,
      websiteUrl: client.websiteUrl,
      autoPublish: client.autoPublish,
      blogPublishMode: client.blogPublishMode,
      niche: client.niche,
      brandVoice: client.brandVoice,
      generateLeadDays: client.generateLeadDays ?? 2,
      maxGenerationsPerDay: client.maxGenerationsPerDay ?? 2,
      postTimes: client.postTimes?.length
        ? client.postTimes
        : ['10:00', '18:00'],
      timezone: client.timezone || 'Asia/Karachi',
      postWeekdays: client.postWeekdays?.length
        ? client.postWeekdays
        : [1, 2, 3, 4, 5],
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
        pageId: metaStatus.isDemo ? '' : client.meta?.pageId || '',
        pageName: metaStatus.isDemo ? '' : client.meta?.pageName || '',
        igUserId: metaStatus.isDemo ? '' : client.meta?.igUserId || '',
        tokenConfigured: metaStatus.tokenConfigured,
        tokenMasked:
          metaStatus.tokenConfigured && client.meta?.pageTokenEncrypted
            ? maskSecret(decryptSecret(client.meta.pageTokenEncrypted))
            : '',
        connectedAt: client.meta?.connectedAt || null,
        connectionStatus: metaStatus.connectionStatus,
        connectionLabel: metaStatus.connectionLabel,
        connectionMessage: metaStatus.connectionMessage,
        lastVerifiedAt: client.meta?.lastVerifiedAt || null,
      },
    };
  }

  async verifyAndPersistMeta(client: ClientDocument) {
    const pageToken = this.readPageToken(client);
    const pageId = client.meta?.pageId || '';
    const result = await this.meta.verifyPageConnection({ pageId, pageToken });
    client.meta = {
      ...client.meta,
      lastVerifiedAt: new Date(),
      lastVerifyStatus: result.status,
      lastVerifyMessage: result.message,
      pageName: result.pageName || client.meta?.pageName,
    };
    await client.save();
    return this.toPublic(client);
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
      generateLeadDays: number;
      maxGenerationsPerDay: number;
      postTimes: string[];
      timezone: string;
      postWeekdays: number[];
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
    if (typeof input.generateLeadDays === 'number') {
      client.generateLeadDays = Math.min(
        14,
        Math.max(0, Math.floor(input.generateLeadDays)),
      );
    }
    if (typeof input.maxGenerationsPerDay === 'number') {
      client.maxGenerationsPerDay = Math.min(
        10,
        Math.max(1, Math.floor(input.maxGenerationsPerDay)),
      );
    }
    if (Array.isArray(input.postTimes)) {
      client.postTimes = input.postTimes
        .map((t) => String(t).trim())
        .filter((t) => /^\d{1,2}:\d{2}$/.test(t))
        .slice(0, 4)
        .map((t) => {
          const [h, m] = t.split(':').map(Number);
          return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
        });
      if (!client.postTimes.length) client.postTimes = ['10:00', '18:00'];
    }
    if (input.timezone?.trim()) {
      client.timezone = input.timezone.trim();
    }
    if (Array.isArray(input.postWeekdays)) {
      client.postWeekdays = input.postWeekdays
        .map(Number)
        .filter((d) => d >= 0 && d <= 6);
    }

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
    const pageId = input.pageId.trim();
    const pageToken = input.pageToken.trim();
    if (!pageId || !pageToken) {
      throw new BadRequestException('Page ID and access token are required');
    }
    if (this.meta.isDemoCredentials({ pageId, pageToken })) {
      throw new BadRequestException(
        'Demo credentials are not a real connection. Paste a live Page ID and Page access token from Meta.',
      );
    }

    const check = await this.meta.verifyPageConnection({ pageId, pageToken });
    if (!check.ok) {
      throw new BadRequestException(
        check.message || 'Could not verify Meta connection',
      );
    }

    client.meta = {
      pageId,
      pageName:
        check.pageName ||
        input.pageName?.trim() ||
        client.meta?.pageName ||
        '',
      pageTokenEncrypted: encryptSecret(pageToken),
      igUserId: input.igUserId?.trim() || client.meta?.igUserId || '',
      connectedAt: new Date(),
      lastVerifiedAt: new Date(),
      lastVerifyStatus: check.status,
      lastVerifyMessage: check.message,
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
