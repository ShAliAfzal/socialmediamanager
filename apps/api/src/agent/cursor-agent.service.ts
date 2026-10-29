import { Injectable, Logger } from '@nestjs/common';
import { Agent } from '@cursor/sdk';
import { createWriteStream, promises as fs } from 'fs';
import { dirname, extname, join } from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { SettingsService } from '../settings/settings.service';
import { ClientDocument } from '../clients/client.schema';
import { AgentTaskType } from './agent-run.schema';

export type CursorAgentOutcome = {
  cursorAgentId: string;
  cursorRunId: string;
  summary: string;
  result: Record<string, unknown>;
  images: Array<{
    path: string;
    url: string;
    filename: string;
    mimeType?: string;
    sizeBytes?: number;
  }>;
  rawText: string;
};

@Injectable()
export class CursorAgentService {
  private readonly log = new Logger(CursorAgentService.name);

  constructor(private settings: SettingsService) {}

  uploadsRoot() {
    return (
      process.env.UPLOADS_DIR ||
      join(process.cwd(), 'uploads')
    );
  }

  async runTask(input: {
    runId: string;
    taskType: AgentTaskType;
    instructions: string;
    topic?: string;
    client: ClientDocument;
  }): Promise<CursorAgentOutcome> {
    const secrets = await this.settings.secrets();
    if (!secrets.cursorApiKey) {
      throw new Error(
        'Cursor API key is not configured. Add it in Admin → Settings.',
      );
    }

    const prompt = this.buildPrompt(input);
    await using agent = await Agent.create({
      apiKey: secrets.cursorApiKey,
      model: { id: secrets.cursorModel || 'composer-2.5' },
      cloud: {
        repos: [],
        metadata: {
          app: 'socialmediamanager',
          taskType: input.taskType,
          runId: input.runId,
          clientSlug: input.client.slug,
        },
      },
    });

    const run = await agent.send(prompt);
    const finished = await run.wait();
    if (finished.status === 'error' || finished.status === 'cancelled') {
      throw new Error(
        finished.error?.message ||
          `Cursor agent run ${finished.status}`,
      );
    }

    const rawText = finished.result?.trim() || '';
    const parsed = this.parseJsonResult(rawText) || {};
    const images = await this.collectImages(agent, input.runId);

    return {
      cursorAgentId: agent.agentId,
      cursorRunId: finished.id,
      summary:
        typeof parsed.summary === 'string'
          ? parsed.summary
          : rawText.slice(0, 400),
      result: parsed,
      images,
      rawText,
    };
  }

  private buildPrompt(input: {
    taskType: AgentTaskType;
    instructions: string;
    topic?: string;
    client: ClientDocument;
  }) {
    const brand = input.client.name;
    const voice = input.client.brandVoice;
    const niche = input.client.niche;
    const website =
      input.client.websiteUrl || 'https://www.ecomrisers.com';
    const topic = input.topic?.trim() || input.instructions.trim();
    const extra = input.instructions.trim();

    const common = `You are a social content operator for ${brand} (${niche}).
Brand voice: ${voice}
Website: ${website}
Topic / brief: ${topic}
Extra instructions: ${extra || '(none)'}

Rules:
- No hype, no fake statistics
- Match brand voice
- Prefer practical ecommerce / Amazon operator framing when relevant
`;

    if (input.taskType === 'image_post') {
      return `${common}
TASK: Create one social image post (Instagram/Facebook ready).

1. Use Cursor's built-in image generation tool to create a clean vertical or square marketing visual (no tiny unreadable text). Save it under assets/.
2. Write captions for Facebook and Instagram plus hashtags.
3. After tools finish, return ONLY valid JSON (no markdown fences) with this shape:
{
  "summary": "one sentence what you made",
  "imagePrompt": "the prompt used for the image",
  "social": {
    "facebook": "string",
    "instagram": "string",
    "hashtags": ["Tag1", "Tag2"]
  },
  "altText": "accessibility description of the image"
}`;
    }

    if (input.taskType === 'content_pack') {
      return `${common}
TASK: Write a full content pack (blog + social + short video brief).
Optionally generate one supporting social image with Cursor image generation and save under assets/.

Return ONLY valid JSON (no markdown fences) with this shape:
{
  "summary": "one sentence",
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
    "heygenPrompt": "string prompt for vertical 30s video",
    "script": "hook/beats/CTA script",
    "status": "ready"
  }
}`;
    }

    return `${common}
TASK: Follow the admin's custom instructions for social/content work.
If a visual is useful, generate an image with Cursor image generation and save under assets/.

Return ONLY valid JSON (no markdown fences) with this shape when possible:
{
  "summary": "one sentence",
  "social": {
    "facebook": "string",
    "instagram": "string",
    "hashtags": ["string"]
  },
  "blog": {
    "title": "string",
    "slug": "kebab-case",
    "excerpt": "string",
    "focusKeyword": "string",
    "bodyMarkdown": "string"
  },
  "notes": "any extra freeform notes"
}`;
  }

  private parseJsonResult(text: string): Record<string, unknown> | null {
    if (!text) return null;
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(cleaned.slice(start, end + 1)) as Record<
        string,
        unknown
      >;
    } catch {
      this.log.warn('Failed to parse Cursor JSON payload');
      return null;
    }
  }

  private async collectImages(
    agent: {
      listArtifacts: () => Promise<
        Array<{ path: string; sizeBytes?: number }>
      >;
      downloadArtifact: (path: string) => Promise<Buffer>;
    },
    runId: string,
  ) {
    let artifacts: Array<{ path: string; sizeBytes?: number }> = [];
    try {
      artifacts = await agent.listArtifacts();
    } catch (err) {
      this.log.warn(`listArtifacts failed: ${String(err)}`);
      return [];
    }

    const imageExts = new Set([
      '.png',
      '.jpg',
      '.jpeg',
      '.webp',
      '.gif',
    ]);
    const images: CursorAgentOutcome['images'] = [];
    const destDir = join(this.uploadsRoot(), 'agent', runId);
    await fs.mkdir(destDir, { recursive: true });

    for (const art of artifacts) {
      const ext = extname(art.path).toLowerCase();
      if (!imageExts.has(ext) && !/assets\//i.test(art.path)) {
        continue;
      }
      if (!imageExts.has(ext)) continue;

      try {
        const buf = await agent.downloadArtifact(art.path);
        const base =
          art.path.split(/[/\\]/).pop() || `image${ext || '.png'}`;
        const safeName = base.replace(/[^a-zA-Z0-9._-]/g, '_');
        const dest = join(destDir, safeName);
        await fs.mkdir(dirname(dest), { recursive: true });
        await pipeline(Readable.from(buf), createWriteStream(dest));
        const rel = `agent/${runId}/${safeName}`.replace(/\\/g, '/');
        images.push({
          path: rel,
          url: `/uploads/${rel}`,
          filename: safeName,
          mimeType: this.mimeForExt(ext),
          sizeBytes: art.sizeBytes ?? buf.length,
        });
      } catch (err) {
        this.log.warn(
          `downloadArtifact ${art.path} failed: ${String(err)}`,
        );
      }
    }

    return images;
  }

  private mimeForExt(ext: string) {
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.webp':
        return 'image/webp';
      case '.gif':
        return 'image/gif';
      default:
        return 'image/png';
    }
  }
}
