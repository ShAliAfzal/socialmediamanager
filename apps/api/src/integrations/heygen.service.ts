import { Injectable, Logger } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class HeyGenService {
  private readonly log = new Logger(HeyGenService.name);

  constructor(private settings: SettingsService) {}

  async createShortVideo(prompt: string): Promise<{
    videoId?: string;
    videoUrl?: string;
    status: string;
    dryRun?: boolean;
  }> {
    const secrets = await this.settings.secrets();
    if (!secrets.heygenApiKey) {
      return {
        status: 'simulated',
        dryRun: true,
        videoUrl: '',
      };
    }

    try {
      const res = await fetch('https://api.heygen.com/v3/video-agents', {
        method: 'POST',
        headers: {
          'X-Api-Key': secrets.heygenApiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          mode: 'generate',
          orientation: 'portrait',
        }),
      });
      const json = (await res.json()) as {
        data?: { video_id?: string };
        error?: unknown;
      };
      const videoId = json.data?.video_id;
      if (!videoId) {
        this.log.warn(`HeyGen response: ${JSON.stringify(json)}`);
        return { status: 'failed', dryRun: false };
      }
      return { videoId, status: 'processing' };
    } catch (err) {
      this.log.error(`HeyGen error: ${String(err)}`);
      return { status: 'failed' };
    }
  }
}
