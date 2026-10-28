import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Settings, SettingsDocument } from './settings.schema';
import {
  decryptSecret,
  encryptSecret,
  maskSecret,
} from '../common/crypto.util';

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
      });
    }
    return doc;
  }

  async publicView() {
    const s = await this.getOrCreate();
    return {
      dryRunPublish: s.dryRunPublish,
      heygenConfigured: Boolean(s.heygenApiKeyEncrypted || process.env.HEYGEN_API_KEY),
      dataforseoConfigured: Boolean(
        (s.dataforseoLoginEncrypted && s.dataforseoPasswordEncrypted) ||
          (process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD),
      ),
      heygenMasked: maskSecret(
        s.heygenApiKeyEncrypted
          ? decryptSecret(s.heygenApiKeyEncrypted)
          : process.env.HEYGEN_API_KEY,
      ),
      dataforseoLoginMasked: maskSecret(
        s.dataforseoLoginEncrypted
          ? decryptSecret(s.dataforseoLoginEncrypted)
          : process.env.DATAFORSEO_LOGIN,
      ),
    };
  }

  async update(input: {
    heygenApiKey?: string;
    dataforseoLogin?: string;
    dataforseoPassword?: string;
    dryRunPublish?: boolean;
  }) {
    const s = await this.getOrCreate();
    if (input.heygenApiKey?.trim()) {
      s.heygenApiKeyEncrypted = encryptSecret(input.heygenApiKey.trim());
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
    await s.save();
    return this.publicView();
  }

  async secrets() {
    const s = await this.getOrCreate();
    return {
      dryRunPublish: s.dryRunPublish,
      heygenApiKey:
        (s.heygenApiKeyEncrypted && decryptSecret(s.heygenApiKeyEncrypted)) ||
        process.env.HEYGEN_API_KEY ||
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
}
