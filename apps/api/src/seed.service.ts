import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { UsersService } from './users/users.service';
import { ClientsService } from './clients/clients.service';
import { SettingsService } from './settings/settings.service';
import { CampaignsService } from './campaigns/campaigns.service';

@Injectable()
export class SeedService implements OnModuleInit {
  private readonly log = new Logger(SeedService.name);

  constructor(
    private users: UsersService,
    private clients: ClientsService,
    private settings: SettingsService,
    private campaigns: CampaignsService,
  ) {}

  async onModuleInit() {
    if (process.env.SEED_ON_BOOT === 'false') return;
    await this.seed();
  }

  async seed() {
    await this.settings.getOrCreate();
    await this.settings.update({
      dryRunPublish: process.env.DRY_RUN_PUBLISH !== 'false',
    });

    let client = await this.clients.getBySlug('ecom-risers');
    if (!client) {
      client = await this.clients.create({
        slug: 'ecom-risers',
        name: 'Ecom Risers',
        websiteUrl: 'https://www.ecomrisers.com',
        autoPublish: false,
        blogPublishMode: 'git',
        niche: 'Amazon FBA / FBM growth, PPC, listing conversion',
        brandVoice:
          'Direct Amazon operator voice. No hype. Rank without sales is a conversion problem.',
        git: {
          repoUrl: 'https://github.com/ShAliAfzal/ecomrisers',
          branch: 'main',
          contentPath: 'content/posts',
          usePullRequest: true,
        },
      });
    }

    const adminEmail =
      process.env.SEED_ADMIN_EMAIL || 'admin@socialmediamanager.app';
    const adminPass = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
    const clientEmail =
      process.env.SEED_CLIENT_EMAIL || 'client@ecomrisers.com';
    const clientPass = process.env.SEED_CLIENT_PASSWORD || 'Ecom@12345';

    if (!(await this.users.findByEmail(adminEmail))) {
      await this.users.create({
        email: adminEmail,
        name: 'Platform Admin',
        role: 'admin',
        passwordHash: await bcrypt.hash(adminPass, 10),
        clientId: null,
      });
    }

    if (!(await this.users.findByEmail(clientEmail))) {
      await this.users.create({
        email: clientEmail,
        name: 'Ecom Risers Client',
        role: 'client',
        passwordHash: await bcrypt.hash(clientPass, 10),
        clientId: client._id,
      });
    }

    await this.clients.connectMeta(client.id, {
      pageId: 'DEMO_PAGE_ID',
      pageName: 'Ecom Risers Demo Page',
      pageToken: 'demo',
      igUserId: 'DEMO_IG_USER',
    });

    const adminUser = {
      sub: 'seed',
      email: adminEmail,
      role: 'admin' as const,
      clientId: null,
    };

    const existing = await this.campaigns.list(adminUser, client.id);
    const topic =
      'Amazon product ranking but no sales — high competition, listing ranks, zero conversion';
    if (!existing.some((c) => c.topic.includes('ranking but no sales'))) {
      const created = await this.campaigns.create(adminUser, {
        clientId: client.id,
        topic,
      });
      await this.campaigns.generate(adminUser, created.id);
      this.log.log('Seeded Ecom Risers ranking campaign (pending approval)');
    }

    this.log.log(`Admin: ${adminEmail} / ${adminPass}`);
    this.log.log(`Client: ${clientEmail} / ${clientPass}`);
  }
}
