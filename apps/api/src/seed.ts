import { NestFactory } from '@nestjs/core';
import * as bcrypt from 'bcryptjs';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { ClientsService } from './clients/clients.service';
import { SettingsService } from './settings/settings.service';
import { CampaignsService } from './campaigns/campaigns.service';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const users = app.get(UsersService);
  const clients = app.get(ClientsService);
  const settings = app.get(SettingsService);
  const campaigns = app.get(CampaignsService);

  await settings.getOrCreate();
  await settings.update({
    dryRunPublish: process.env.DRY_RUN_PUBLISH !== 'false',
  });

  let client = await clients.getBySlug('ecom-risers');
  if (!client) {
    client = await clients.create({
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

  if (!(await users.findByEmail(adminEmail))) {
    await users.create({
      email: adminEmail,
      name: 'Platform Admin',
      role: 'admin',
      passwordHash: await bcrypt.hash(adminPass, 10),
      clientId: null,
    });
  }

  if (!(await users.findByEmail(clientEmail))) {
    await users.create({
      email: clientEmail,
      name: 'Ecom Risers Client',
      role: 'client',
      passwordHash: await bcrypt.hash(clientPass, 10),
      clientId: client._id,
    });
  }

  // Demo Meta connect placeholder (dry-run)
  await clients.connectMeta(client.id, {
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

  const existing = await campaigns.list(adminUser, client.id);
  const topic =
    'Amazon product ranking but no sales — high competition, listing ranks, zero conversion';
  if (!existing.some((c) => c.topic.includes('ranking but no sales'))) {
    const created = await campaigns.create(adminUser, {
      clientId: client.id,
      topic,
    });
    await campaigns.generate(adminUser, created.id);
  }

  console.log('\nSeed complete\n');
  console.log('Admin login');
  console.log(`  email:    ${adminEmail}`);
  console.log(`  password: ${adminPass}`);
  console.log('\nEcom Risers client login');
  console.log(`  email:    ${clientEmail}`);
  console.log(`  password: ${clientPass}`);
  console.log('\nOpen http://localhost:5173\n');

  await app.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
