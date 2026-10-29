import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { SettingsService } from './settings.service';

class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  heygenApiKey?: string;

  @IsOptional()
  @IsString()
  googleFlowApiKey?: string;

  @IsOptional()
  @IsString()
  googleFlowModel?: string;

  @IsOptional()
  @IsIn(['auto', 'heygen', 'google_flow'])
  videoProvider?: 'auto' | 'heygen' | 'google_flow';

  @IsOptional()
  @IsString()
  cursorApiKey?: string;

  @IsOptional()
  @IsString()
  cursorModel?: string;

  @IsOptional()
  @IsString()
  dataforseoLogin?: string;

  @IsOptional()
  @IsString()
  dataforseoPassword?: string;

  @IsOptional()
  @IsBoolean()
  dryRunPublish?: boolean;

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  scheduleHours?: number[];

  @IsOptional()
  @IsNumber()
  generateLeadDays?: number;
}

@Controller('settings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private settings: SettingsService) {}

  @Get()
  @Roles('admin')
  get() {
    return this.settings.publicView();
  }

  @Put()
  @Roles('admin')
  update(@Body() body: UpdateSettingsDto) {
    return this.settings.update(body);
  }
}
