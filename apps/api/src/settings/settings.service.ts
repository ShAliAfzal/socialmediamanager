import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Settings, SettingsDocument } from './settings.schema';
import {
  decryptSecret,
  encryptSecret,
  maskSecret,
} from '../common/crypto.util';

export type VideoProvider = 'auto' | 'heygen' | 'google_flow';

@Injectable()
export class SettingsService {
  constructor(
    @InjectModel(Settings.name) private settingsModel: Model<SettingsDocument>,
  ) {}

  async getOrCreate() {
    let doc = await this.settingsModel.findOne({ key: 'global' }).exec();
    if (!doc) {
      doc = await this.settingsModel.create({
        key: 'global',
        dryRunPublish: process.env.DRY_RUN_PUBLISH !== 'false',
        cursorModel: process.env.CURSOR_MODEL || 'composer-2.5',
        googleFlowModel:
          process.env.GOOGLE_FLOW_MODEL || 'gemini-omni-1.1-flash',
        videoProvider: process.env.VIDEO_PROVIDER || 'auto',
      });
    }
    return doc;
  }

  async publicView() {
    const s = await this.getOrCreate();
    return {
      dryRunPublish: s.dryRunPublish,
      cursorModel: s.cursorModel || 'composer-2.5',
      googleFlowModel: s.googleFlowModel || 'gemini-omni-1.1-flash',
      videoProvider: (s.videoProvider || 'auto') as VideoProvider,
      cursorConfigured: Boolean(
        s.cursorApiKeyEncrypted || process.env.CURSOR_API_KEY,
      ),
      heygenConfigured: Boolean(
        s.heygenApiKeyEncrypted || process.env.HEYGEN_API_KEY,
      ),
      googleFlowConfigured: Boolean(
        s.googleFlowApiKeyEncrypted ||
          process.env.GOOGLE_FLOW_API_KEY ||
          process.env.GEMINI_API_KEY,
      ),
      dataforseoConfigured: Boolean(
        (s.dataforseoLoginEncrypted && s.dataforseoPasswordEncrypted) ||
          (process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD),
      ),
      cursorMasked: maskSecret(
        s.cursorApiKeyEncrypted
          ? decryptSecret(s.cursorApiKeyEncrypted)
          : process.env.CURSOR_API_KEY,
      ),
      heygenMasked: maskSecret(
        s.heygenApiKeyEncrypted
          ? decryptSecret(s.heygenApiKeyEncrypted)
          : process.env.HEYGEN_API_KEY,
      ),
      googleFlowMasked: maskSecret(
        s.googleFlowApiKeyEncrypted
          ? decryptSecret(s.googleFlowApiKeyEncrypted)
          : process.env.GOOGLE_FLOW_API_KEY || process.env.GEMINI_API_KEY,
      ),
      dataforseoLoginMasked: maskSecret(
        s.dataforseoLoginEncrypted
          ? decryptSecret(s.dataforseoLoginEncrypted)
          : process.env.DATAFORSEO_LOGIN,
      ),
      scheduleHours: s.scheduleHours?.length ? s.scheduleHours : [9, 21],
      generateLeadDays: s.generateLeadDays || 2,
    };
  }

  async update(input: {
    heygenApiKey?: string;
    googleFlowApiKey?: string;
    googleFlowModel?: string;
    videoProvider?: VideoProvider;
    cursorApiKey?: string;
    cursorModel?: string;
    dataforseoLogin?: string;
    dataforseoPassword?: string;
    dryRunPublish?: boolean;
    scheduleHours?: number[];
    generateLeadDays?: number;
  }) {
    const s = await this.getOrCreate();
    if (input.heygenApiKey?.trim()) {
      s.heygenApiKeyEncrypted = encryptSecret(input.heygenApiKey.trim());
    }
    if (input.googleFlowApiKey?.trim()) {
      s.googleFlowApiKeyEncrypted = encryptSecret(
        input.googleFlowApiKey.trim(),
      );
    }
    if (input.googleFlowModel?.trim()) {
      s.googleFlowModel = input.googleFlowModel.trim();
    }
    if (input.videoProvider) {
      s.videoProvider = input.videoProvider;
    }
    if (input.cursorApiKey?.trim()) {
      s.cursorApiKeyEncrypted = encryptSecret(input.cursorApiKey.trim());
    }
    if (input.cursorModel?.trim()) {
      s.cursorModel = input.cursorModel.trim();
    }
    if (input.dataforseoLogin?.trim()) {
      s.dataforseoLoginEncrypted = encryptSecret(input.dataforseoLogin.trim());
    }
    if (input.dataforseoPassword?.trim()) {
      s.dataforseoPasswordEncrypted = encryptSecret(
        input.dataforseoPassword.trim(),
      );
    }
    if (typeof input.dryRunPublish === 'boolean') {
      s.dryRunPublish = input.dryRunPublish;
    }
    if (Array.isArray(input.scheduleHours) && input.scheduleHours.length) {
      s.scheduleHours = input.scheduleHours
        .map(Number)
        .filter((h) => h >= 0 && h <= 23)
        .slice(0, 4);
    }
    if (typeof input.generateLeadDays === 'number' && input.generateLeadDays >= 0) {
      s.generateLeadDays = Math.min(14, Math.floor(input.generateLeadDays));
    }
    await s.save();
    return this.publicView();
  }

  async secrets() {
    const s = await this.getOrCreate();
    return {
      dryRunPublish: s.dryRunPublish,
      cursorModel: s.cursorModel || process.env.CURSOR_MODEL || 'composer-2.5',
      googleFlowModel:
        s.googleFlowModel ||
        process.env.GOOGLE_FLOW_MODEL ||
        'gemini-omni-1.1-flash',
      videoProvider: (s.videoProvider ||
        process.env.VIDEO_PROVIDER ||
        'auto') as VideoProvider,
      cursorApiKey:
        (s.cursorApiKeyEncrypted && decryptSecret(s.cursorApiKeyEncrypted)) ||
        process.env.CURSOR_API_KEY ||
        '',
      heygenApiKey:
        (s.heygenApiKeyEncrypted && decryptSecret(s.heygenApiKeyEncrypted)) ||
        process.env.HEYGEN_API_KEY ||
        '',
      googleFlowApiKey:
        (s.googleFlowApiKeyEncrypted &&
          decryptSecret(s.googleFlowApiKeyEncrypted)) ||
        process.env.GOOGLE_FLOW_API_KEY ||
        process.env.GEMINI_API_KEY ||
        '',
      dataforseoLogin:
        (s.dataforseoLoginEncrypted &&
          decryptSecret(s.dataforseoLoginEncrypted)) ||
        process.env.DATAFORSEO_LOGIN ||
        '',
      dataforseoPassword:
        (s.dataforseoPasswordEncrypted &&
          decryptSecret(s.dataforseoPasswordEncrypted)) ||
        process.env.DATAFORSEO_PASSWORD ||
        '',
    };
  }

  resolveVideoProvider(secrets: {
    videoProvider: VideoProvider;
    heygenApiKey: string;
    googleFlowApiKey: string;
  }): 'heygen' | 'google_flow' {
    if (secrets.videoProvider === 'heygen') return 'heygen';
    if (secrets.videoProvider === 'google_flow') return 'google_flow';
    if (secrets.googleFlowApiKey) return 'google_flow';
    if (secrets.heygenApiKey) return 'heygen';
    return 'heygen';
  }
}
