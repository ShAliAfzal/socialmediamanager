import { Injectable, Logger } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';

type LroStart = {
  name?: string;
  error?: { message?: string };
};

type LroStatus = {
  name?: string;
  done?: boolean;
  error?: { message?: string };
  response?: {
    generateVideoResponse?: {
      generatedSamples?: Array<{
        video?: { uri?: string; videoBytes?: string };
      }>;
    };
    generatedVideos?: Array<{
      video?: { uri?: string; videoBytes?: string };
    }>;
  };
};

@Injectable()
export class GoogleFlowService {
  private readonly log = new Logger(GoogleFlowService.name);
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(private settings: SettingsService) {}

  async createShortVideo(prompt: string): Promise<{
    videoId?: string;
    videoUrl?: string;
    status: string;
    dryRun?: boolean;
    provider: 'google_flow';
    error?: string;
  }> {
    const secrets = await this.settings.secrets();
    if (!secrets.googleFlowApiKey) {
      return {
        status: 'simulated',
        dryRun: true,
        videoUrl: '',
        provider: 'google_flow',
      };
    }

    const model =
      secrets.googleFlowModel ||
      process.env.GOOGLE_FLOW_MODEL ||
      'gemini-omni-1.1-flash';

    try {
      const start = await fetch(
        `${this.baseUrl}/models/${encodeURIComponent(model)}:predictLongRunning`,
        {
          method: 'POST',
          headers: {
            'x-goog-api-key': secrets.googleFlowApiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            instances: [{ prompt }],
            parameters: {
              aspectRatio: '9:16',
            },
          }),
        },
      );
      const started = (await start.json()) as LroStart;
      if (!start.ok || !started.name) {
        const message =
          started.error?.message ||
          `Google Flow start failed (${start.status})`;
        this.log.warn(message);
        return {
          status: 'failed',
          provider: 'google_flow',
          error: message,
        };
      }

      const polled = await this.pollUntilDone(
        started.name,
        secrets.googleFlowApiKey,
      );
      if (polled.error) {
        return {
          status: 'failed',
          videoId: started.name,
          provider: 'google_flow',
          error: polled.error,
        };
      }
      if (!polled.done) {
        return {
          status: 'processing',
          videoId: started.name,
          provider: 'google_flow',
        };
      }

      const videoUrl = this.extractVideoUri(polled);
      if (!videoUrl) {
        this.log.warn(`Google Flow done without URI: ${JSON.stringify(polled)}`);
        return {
          status: 'failed',
          videoId: started.name,
          provider: 'google_flow',
          error: 'No video URI in response',
        };
      }

      return {
        status: 'ready',
        videoId: started.name,
        videoUrl,
        provider: 'google_flow',
      };
    } catch (err) {
      this.log.error(`Google Flow error: ${String(err)}`);
      return {
        status: 'failed',
        provider: 'google_flow',
        error: String(err),
      };
    }
  }

  private async pollUntilDone(
    operationName: string,
    apiKey: string,
  ): Promise<{
    done?: boolean;
    name?: string;
    error?: string;
    response?: LroStatus['response'];
  }> {
    const maxAttempts = 18;
    const delayMs = 10_000;

    for (let i = 0; i < maxAttempts; i++) {
      const res = await fetch(`${this.baseUrl}/${operationName}`, {
        headers: { 'x-goog-api-key': apiKey },
      });
      const json = (await res.json()) as LroStatus;
      if (!res.ok) {
        return {
          name: operationName,
          error: json.error?.message || `Poll failed (${res.status})`,
        };
      }
      if (json.error?.message) {
        return { name: operationName, error: json.error.message };
      }
      if (json.done) {
        return {
          done: true,
          name: operationName,
          response: json.response,
        };
      }
      await new Promise((r) => setTimeout(r, delayMs));
    }

    return { name: operationName, done: false };
  }

  private extractVideoUri(status: {
    response?: LroStatus['response'];
  }): string | undefined {
    const samples =
      status.response?.generateVideoResponse?.generatedSamples || [];
    const fromSamples = samples[0]?.video?.uri;
    if (fromSamples) return fromSamples;

    const videos = status.response?.generatedVideos || [];
    return videos[0]?.video?.uri;
  }
}
