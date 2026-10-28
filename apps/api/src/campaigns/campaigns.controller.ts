import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsOptional, IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { JwtPayload } from '../auth/jwt.strategy';
import { CampaignsService } from './campaigns.service';

class CreateCampaignDto {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsString()
  @MinLength(4)
  topic!: string;
}

@Controller('campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CampaignsController {
  constructor(private campaigns: CampaignsService) {}

  @Get()
  list(
    @Req() req: { user: JwtPayload },
    @Query('clientId') clientId?: string,
  ) {
    return this.campaigns.list(req.user, clientId);
  }

  @Get(':id')
  one(@Req() req: { user: JwtPayload }, @Param('id') id: string) {
    return this.campaigns.get(req.user, id);
  }

  @Post()
  create(@Req() req: { user: JwtPayload }, @Body() body: CreateCampaignDto) {
    return this.campaigns.create(req.user, body);
  }

  @Post(':id/generate')
  generate(@Req() req: { user: JwtPayload }, @Param('id') id: string) {
    return this.campaigns.generate(req.user, id);
  }

  @Post(':id/approve')
  approve(@Req() req: { user: JwtPayload }, @Param('id') id: string) {
    return this.campaigns.approve(req.user, id);
  }

  @Post(':id/publish')
  publish(@Req() req: { user: JwtPayload }, @Param('id') id: string) {
    return this.campaigns.publish(req.user, id);
  }
}
