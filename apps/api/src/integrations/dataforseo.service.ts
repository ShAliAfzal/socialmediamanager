import { Injectable, Logger } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class DataForSeoService {
  private readonly log = new Logger(DataForSeoService.name);

  constructor(private settings: SettingsService) {}

  async keywordIdeas(topic: string): Promise<string[]> {
    const secrets = await this.settings.secrets();
    if (!secrets.dataforseoLogin || !secrets.dataforseoPassword) {
      return this.fallbackKeywords(topic);
    }

    try {
      const auth = Buffer.from(
        `${secrets.dataforseoLogin}:${secrets.dataforseoPassword}`,
      ).toString('base64');
      const res = await fetch(
        'https://api.dataforseo.com/v3/keywords_data/google_ads/search_volume/live',
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([
            {
              keywords: this.seedPhrases(topic).slice(0, 12),
              location_code: 2840,
              language_code: 'en',
            },
          ]),
        },
      );
      const json = (await res.json()) as {
        tasks?: Array<{
          result?: Array<{ keyword?: string; search_volume?: number }>;
        }>;
      };
      const rows = json.tasks?.[0]?.result ?? [];
      const sorted = [...rows]
        .filter((r) => r.keyword)
        .sort((a, b) => (b.search_volume ?? 0) - (a.search_volume ?? 0))
        .map((r) => r.keyword as string);
      if (sorted.length) return sorted.slice(0, 12);
    } catch (err) {
      this.log.warn(`DataForSEO failed, using fallback: ${String(err)}`);
    }
    return this.fallbackKeywords(topic);
  }

  private seedPhrases(topic: string) {
    const base = topic.toLowerCase().replace(/[^\w\s]/g, '').trim();
    return [
      base,
      `${base} amazon`,
      `amazon ${base}`,
      'amazon product ranking but no sales',
      'amazon ranking but not selling',
      'amazon listing not converting',
      'high sessions low conversion amazon',
      'unit session percentage',
      'amazon conversion rate',
      'buy box percentage',
      'amazon listing optimization',
      'search query performance amazon',
    ];
  }

  private fallbackKeywords(topic: string) {
    const seeds = this.seedPhrases(topic);
    return Array.from(new Set(seeds)).slice(0, 12);
  }
}
