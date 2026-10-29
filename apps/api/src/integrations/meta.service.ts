import { Injectable, Logger } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class MetaService {
  private readonly log = new Logger(MetaService.name);

  constructor(private settings: SettingsService) {}

  private version() {
    return process.env.META_GRAPH_VERSION || 'v21.0';
  }

  isDemoCredentials(input: { pageId?: string; pageToken?: string }) {
    const pageId = (input.pageId || '').trim().toUpperCase();
    const token = (input.pageToken || '').trim().toLowerCase();
    return (
      !token ||
      token === 'demo' ||
      pageId === 'DEMO_PAGE_ID' ||
      pageId.startsWith('DEMO_')
    );
  }

  /** Live check against Meta Graph: confirms Page token works for this Page ID. */
  async verifyPageConnection(input: {
    pageId: string;
    pageToken: string;
  }): Promise<{
    ok: boolean;
    status: 'live' | 'invalid' | 'demo';
    pageName?: string;
    message: string;
  }> {
    if (this.isDemoCredentials(input)) {
      return {
        ok: false,
        status: 'demo',
        message:
          'Demo credentials only — not linked to a real Facebook Page.',
      };
    }

    try {
      const url = new URL(
        `https://graph.facebook.com/${this.version()}/${encodeURIComponent(input.pageId)}`,
      );
      url.searchParams.set('fields', 'id,name');
      url.searchParams.set('access_token', input.pageToken);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      const json = (await res.json()) as {
        id?: string;
        name?: string;
        error?: { message?: string };
      };

      if (!res.ok || json.error || !json.id) {
        return {
          ok: false,
          status: 'invalid',
          message:
            json.error?.message ||
            'Meta rejected this Page ID or access token.',
        };
      }

      return {
        ok: true,
        status: 'live',
        pageName: json.name,
        message: `Live connection to ${json.name || input.pageId}`,
      };
    } catch (err) {
      this.log.warn(`Meta verify failed: ${String(err)}`);
      return {
        ok: false,
        status: 'invalid',
        message: 'Could not reach Meta to verify the connection.',
      };
    }
  }

  private absolutePublicUrl(url?: string) {
    if (!url) return undefined;
    if (/^https?:\/\//i.test(url)) return url;
    const base =
      process.env.PUBLIC_BASE_URL ||
      process.env.API_PUBLIC_URL ||
      `http://localhost:${process.env.PORT || 4100}`;
    if (url.startsWith('/')) return `${base.replace(/\/$/, '')}${url}`;
    return `${base.replace(/\/$/, '')}/${url}`;
  }

  async publishFacebookPagePost(input: {
    pageId: string;
    pageToken: string;
    message: string;
    imageUrl?: string;
  }) {
    const secrets = await this.settings.secrets();
    if (secrets.dryRunPublish || !input.pageToken || input.pageToken === 'demo') {
      return {
        dryRun: true,
        id: `dryrun_fb_${Date.now()}`,
      };
    }

    const imageUrl = this.absolutePublicUrl(input.imageUrl);
    if (imageUrl) {
      const url = new URL(
        `https://graph.facebook.com/${this.version()}/${input.pageId}/photos`,
      );
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: imageUrl,
          caption: input.message,
          access_token: input.pageToken,
        }),
      });
      const json = (await res.json()) as {
        id?: string;
        post_id?: string;
        error?: { message: string };
      };
      if (!res.ok || !(json.id || json.post_id)) {
        throw new Error(json.error?.message || 'Facebook photo publish failed');
      }
      return { dryRun: false, id: json.post_id || json.id! };
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

  async publishInstagramMedia(input: {
    igUserId?: string;
    pageToken: string;
    caption: string;
    imageUrl?: string;
    videoUrl?: string;
  }) {
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
        note: 'Dry-run IG publish',
        caption: input.caption,
      };
    }

    const mediaUrl = this.absolutePublicUrl(input.videoUrl || input.imageUrl);
    if (!mediaUrl) {
      this.log.warn('IG publish skipped — no public media URL');
      return {
        dryRun: true,
        id: `pending_ig_${Date.now()}`,
        note: 'Add an image or video URL before live IG publish.',
      };
    }

    const isVideo = Boolean(input.videoUrl);
    const createUrl = new URL(
      `https://graph.facebook.com/${this.version()}/${input.igUserId}/media`,
    );
    const createBody: Record<string, string> = {
      caption: input.caption,
      access_token: input.pageToken,
    };
    if (isVideo) {
      createBody.media_type = 'REELS';
      createBody.video_url = mediaUrl;
    } else {
      createBody.image_url = mediaUrl;
    }

    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createBody),
    });
    const created = (await createRes.json()) as {
      id?: string;
      error?: { message: string };
    };
    if (!createRes.ok || !created.id) {
      throw new Error(created.error?.message || 'IG media container failed');
    }

    const publishUrl = new URL(
      `https://graph.facebook.com/${this.version()}/${input.igUserId}/media_publish`,
    );
    const pubRes = await fetch(publishUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        creation_id: created.id,
        access_token: input.pageToken,
      }),
    });
    const published = (await pubRes.json()) as {
      id?: string;
      error?: { message: string };
    };
    if (!pubRes.ok || !published.id) {
      throw new Error(published.error?.message || 'IG media publish failed');
    }
    return { dryRun: false, id: published.id };
  }
}
