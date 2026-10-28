import { Injectable, Logger } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class MetaService {
  private readonly log = new Logger(MetaService.name);

  constructor(private settings: SettingsService) {}

  private version() {
    return process.env.META_GRAPH_VERSION || 'v21.0';
  }

  async publishFacebookPagePost(input: {
    pageId: string;
    pageToken: string;
    message: string;
  }) {
    const secrets = await this.settings.secrets();
    if (secrets.dryRunPublish || !input.pageToken || input.pageToken === 'demo') {
      return {
        dryRun: true,
        id: `dryrun_fb_${Date.now()}`,
      };
    }

    const url = new URL(
      `https://graph.facebook.com/${this.version()}/${input.pageId}/feed`,
    );
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: input.message,
        access_token: input.pageToken,
      }),
    });
    const json = (await res.json()) as { id?: string; error?: { message: string } };
    if (!res.ok || !json.id) {
      throw new Error(json.error?.message || 'Facebook publish failed');
    }
    return { dryRun: false, id: json.id };
  }

  async publishInstagramCaptionOnlyNotice(input: {
    igUserId?: string;
    pageToken: string;
    caption: string;
  }) {
    // Full IG media publish needs a public image/video URL container flow.
    // For v1 we record intent + dry-run unless media URL pipeline is added.
    const secrets = await this.settings.secrets();
    if (
      secrets.dryRunPublish ||
      !input.igUserId ||
      !input.pageToken ||
      input.pageToken === 'demo'
    ) {
      return {
        dryRun: true,
        id: `dryrun_ig_${Date.now()}`,
        note: 'IG container publish requires hosted media URL; dry-run logged caption.',
        caption: input.caption,
      };
    }
    this.log.warn(
      'Live IG publish skipped in v1 without media host — enable media CDN next.',
    );
    return {
      dryRun: true,
      id: `pending_ig_${Date.now()}`,
      note: 'Add public media URL pipeline for live IG publish.',
    };
  }
}
