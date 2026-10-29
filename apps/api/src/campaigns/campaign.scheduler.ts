import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CampaignsService } from './campaigns.service';
import { SettingsService } from '../settings/settings.service';

/**
 * Light hourly tick; heavy work only runs at configured hours (default 09:00 & 21:00).
 * Keeps the process idle most of the time while still supporting twice-daily batches.
 */
@Injectable()
export class CampaignScheduler {
  private readonly log = new Logger(CampaignScheduler.name);
  private running = false;

  constructor(
    private campaigns: CampaignsService,
    private settings: SettingsService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async hourlyTick() {
    const s = await this.settings.getOrCreate();
    const hours = (s.scheduleHours?.length ? s.scheduleHours : [9, 21]).map(
      Number,
    );
    const hour = new Date().getHours();
    if (!hours.includes(hour)) return;
    await this.runBatch(`scheduled-hour-${hour}`);
  }

  /** Manual trigger for admins / ops */
  async runBatch(reason = 'manual') {
    if (this.running) {
      this.log.warn('Batch already running; skip');
      return { skipped: true };
    }
    this.running = true;
    this.log.log(`Schedule batch start (${reason})`);
    try {
      const generated = await this.campaigns.processDueGenerations();
      const published = await this.campaigns.processDuePublishes();
      this.log.log(
        `Batch done: generated=${generated.length} published=${published.length}`,
      );
      return { generated, published };
    } finally {
      this.running = false;
    }
  }
}
