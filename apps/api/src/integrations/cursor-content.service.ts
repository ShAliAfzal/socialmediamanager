import { Injectable, Logger } from '@nestjs/common';
import { Agent } from '@cursor/sdk';
import { SettingsService } from '../settings/settings.service';
import { ClientDocument } from '../clients/client.schema';

export type GeneratedPack = {
  blog: {
    title: string;
    slug: string;
    excerpt: string;
    focusKeyword: string;
    bodyMarkdown: string;
  };
  social: {
    facebook: string;
    instagram: string;
    hashtags: string[];
  };
  video: {
    heygenPrompt: string;
    script: string;
    status: string;
  };
  source: 'cursor' | 'template';
};

@Injectable()
export class CursorContentService {
  private readonly log = new Logger(CursorContentService.name);

  constructor(private settings: SettingsService) {}

  async generateWithCursor(input: {
    topic: string;
    keywords: string[];
    client: ClientDocument;
  }): Promise<GeneratedPack | null> {
    const secrets = await this.settings.secrets();
    if (!secrets.cursorApiKey) {
      return null;
    }

    const focus =
      input.keywords[0] ||
      'amazon product ranking but no sales';
    const prompt = this.buildPrompt({
      topic: input.topic,
      keywords: input.keywords,
      focus,
      brand: input.client.name,
      websiteUrl: input.client.websiteUrl || 'https://www.ecomrisers.com',
      voice: input.client.brandVoice,
      niche: input.client.niche,
    });

    try {
      const result = await Agent.prompt(prompt, {
        apiKey: secrets.cursorApiKey,
        model: { id: secrets.cursorModel || 'composer-2.5' },
        cloud: { repos: [] },
      });

      const text = result.result?.trim() || '';
      if (!text) {
        this.log.warn('Cursor returned empty result');
        return null;
      }

      const parsed = this.parseJsonPack(text);
      if (!parsed) {
        this.log.warn('Cursor response was not valid JSON pack');
        return null;
      }

      return {
        ...parsed,
        source: 'cursor',
        video: {
          ...parsed.video,
          status: parsed.video.status || 'ready',
        },
      };
    } catch (err) {
      this.log.error(`Cursor content generation failed: ${String(err)}`);
      return null;
    }
  }

  private buildPrompt(input: {
    topic: string;
    keywords: string[];
    focus: string;
    brand: string;
    websiteUrl: string;
    voice: string;
    niche: string;
  }) {
    return `You are an SEO content operator for ${input.brand} (${input.niche}).
Brand voice: ${input.voice}
Website: ${input.websiteUrl}

Write a full content pack for this campaign topic:
TOPIC: ${input.topic}

Use these researched keywords (prioritize the first ones):
${input.keywords.map((k, i) => `${i + 1}. ${k}`).join('\n')}
Primary focus keyword: ${input.focus}

Requirements:
- SEO blog in Markdown with H1 + H2s, practical operator advice, primary keyword in title/H1/intro naturally
- Facebook caption ready to post
- Instagram caption with hashtags
- 30s vertical Reel script + HeyGen video prompt
- No hype, no emojis unless brand voice asks
- Do not invent fake statistics

Return ONLY valid JSON (no markdown fences, no commentary) with this exact shape:
{
  "blog": {
    "title": "string",
    "slug": "kebab-case-slug",
    "excerpt": "string under 180 chars",
    "focusKeyword": "string",
    "bodyMarkdown": "full markdown blog starting with # title"
  },
  "social": {
    "facebook": "string",
    "instagram": "string",
    "hashtags": ["AmazonFBA", "AmazonSeller"]
  },
  "video": {
    "heygenPrompt": "string prompt for HeyGen Video Agent portrait 30s",
    "script": "hook/beats/CTA script",
    "status": "ready"
  }
}`;
  }

  private parseJsonPack(text: string): Omit<GeneratedPack, 'source'> | null {
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start < 0 || end <= start) return null;

    try {
      const json = JSON.parse(cleaned.slice(start, end + 1)) as GeneratedPack;
      if (
        !json?.blog?.title ||
        !json?.blog?.bodyMarkdown ||
        !json?.social?.facebook ||
        !json?.video?.heygenPrompt
      ) {
        return null;
      }
      return {
        blog: {
          title: String(json.blog.title),
          slug: String(
            json.blog.slug ||
              json.blog.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)/g, ''),
          ),
          excerpt: String(json.blog.excerpt || ''),
          focusKeyword: String(json.blog.focusKeyword || ''),
          bodyMarkdown: String(json.blog.bodyMarkdown),
        },
        social: {
          facebook: String(json.social.facebook),
          instagram: String(json.social.instagram || ''),
          hashtags: Array.isArray(json.social.hashtags)
            ? json.social.hashtags.map(String)
            : [],
        },
        video: {
          heygenPrompt: String(json.video.heygenPrompt),
          script: String(json.video.script || ''),
          status: String(json.video.status || 'ready'),
        },
      };
    } catch {
      return null;
    }
  }
}
