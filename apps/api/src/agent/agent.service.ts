import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  AgentRun,
  AgentRunDocument,
  AgentTaskType,
} from './agent-run.schema';
import { ClientsService } from '../clients/clients.service';
import { CursorAgentService } from './cursor-agent.service';
import { CampaignsService } from '../campaigns/campaigns.service';
import { JwtPayload } from '../auth/jwt.strategy';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class AgentService {
  constructor(
    @InjectModel(AgentRun.name)
    private agentRunModel: Model<AgentRunDocument>,
    private clients: ClientsService,
    private cursorAgent: CursorAgentService,
    private campaigns: CampaignsService,
    private settings: SettingsService,
  ) {}

  list(clientId?: string) {
    const filter: Record<string, unknown> = {};
    if (clientId) filter.clientId = new Types.ObjectId(clientId);
    return this.agentRunModel.find(filter).sort({ createdAt: -1 }).limit(50).exec();
  }

  async get(id: string) {
    const run = await this.agentRunModel.findById(id).exec();
    if (!run) throw new NotFoundException('Agent run not found');
    return run;
  }

  async create(input: {
    clientId: string;
    taskType: AgentTaskType;
    instructions: string;
    topic?: string;
  }) {
    if (!input.clientId) throw new BadRequestException('clientId required');
    if (!input.instructions?.trim() && !input.topic?.trim()) {
      throw new BadRequestException('instructions or topic required');
    }

    const secrets = await this.settings.secrets();
    if (!secrets.cursorApiKey) {
      throw new BadRequestException(
        'Cursor API key is not configured. Add it in Admin → Settings.',
      );
    }

    const client = await this.clients.get(input.clientId);
    const run = await this.agentRunModel.create({
      clientId: new Types.ObjectId(input.clientId),
      taskType: input.taskType,
      instructions: (input.instructions || input.topic || '').trim(),
      topic: (input.topic || '').trim(),
      status: 'running',
    });

    try {
      const outcome = await this.cursorAgent.runTask({
        runId: run.id,
        taskType: input.taskType,
        instructions: run.instructions,
        topic: run.topic || undefined,
        client,
      });

      run.status = 'succeeded';
      run.cursorAgentId = outcome.cursorAgentId;
      run.cursorRunId = outcome.cursorRunId;
      run.summary = outcome.summary;
      run.result = outcome.result?.summary
        ? outcome.result
        : {
            ...outcome.result,
            rawText: outcome.rawText || undefined,
          };
      run.images = outcome.images;
      await run.save();
      return run;
    } catch (err) {
      run.status = 'failed';
      run.error = err instanceof Error ? err.message : String(err);
      await run.save();
      return run;
    }
  }

  async toCampaign(user: JwtPayload, runId: string) {
    const run = await this.get(runId);
    if (run.status !== 'succeeded') {
      throw new BadRequestException('Only succeeded runs can become campaigns');
    }

    const result = run.result || {};
    const blog = (result.blog || {}) as Record<string, string>;
    const social = (result.social || {}) as Record<string, unknown>;
    const video = (result.video || {}) as Record<string, string>;
    const topic =
      run.topic ||
      blog.title ||
      run.instructions.slice(0, 120) ||
      'Agent content';

    const campaign = await this.campaigns.create(user, {
      clientId: run.clientId.toString(),
      topic,
    });

    const imageNote = run.images?.length
      ? `agent_images=${run.images.map((i) => i.url).join(',')}`
      : '';

    campaign.status = 'pending_approval';
    campaign.blog = {
      title: blog.title || topic,
      slug: blog.slug || undefined,
      excerpt: blog.excerpt || undefined,
      focusKeyword: blog.focusKeyword || undefined,
      bodyMarkdown: blog.bodyMarkdown || undefined,
    };
    campaign.social = {
      facebook: typeof social.facebook === 'string' ? social.facebook : '',
      instagram:
        typeof social.instagram === 'string' ? social.instagram : '',
      hashtags: Array.isArray(social.hashtags)
        ? social.hashtags.map(String)
        : [],
    };
    campaign.video = {
      heygenPrompt: video.heygenPrompt || '',
      script: video.script || '',
      status: video.status || 'ready',
      videoUrl: run.images?.[0]?.url || '',
    };
    campaign.notes = [
      `source=cursor_agent`,
      `agent_run=${run.id}`,
      imageNote,
    ]
      .filter(Boolean)
      .join(';');
    await campaign.save();

    run.campaignId = campaign._id;
    await run.save();

    return { run, campaign };
  }
}
