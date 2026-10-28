import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
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
  dataforseoLogin?: string;

  @IsOptional()
  @IsString()
  dataforseoPassword?: string;

  @IsOptional()
  @IsBoolean()
  dryRunPublish?: boolean;
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
