import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { JwtPayload } from '../auth/jwt.strategy';
import { CampaignsService } from './campaigns.service';
import { CampaignScheduler } from './campaign.scheduler';

class CreateCampaignDto {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsString()
  @MinLength(4)
  topic!: string;

  @IsOptional()
  @IsString()
  publishAt?: string;

  @IsOptional()
  @IsBoolean()
  generateNow?: boolean;
}

class SocialDto {
  @IsOptional() @IsString() facebook?: string;
  @IsOptional() @IsString() instagram?: string;
  @IsOptional() @IsArray() hashtags?: string[];
}

class BlogDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() slug?: string;
  @IsOptional() @IsString() excerpt?: string;
  @IsOptional() @IsString() focusKeyword?: string;
  @IsOptional() @IsString() bodyMarkdown?: string;
}

class MediaDto {
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() videoUrl?: string;
  @IsOptional() @IsString() imagePrompt?: string;
  @IsOptional() @IsString() altText?: string;
}

class UpdateCampaignDto {
  @IsOptional() @IsString() topic?: string;
  @IsOptional() @IsString() publishAt?: string | null;
  @IsOptional() @ValidateNested() @Type(() => SocialDto) social?: SocialDto;
  @IsOptional() @ValidateNested() @Type(() => BlogDto) blog?: BlogDto;
  @IsOptional() @ValidateNested() @Type(() => MediaDto) media?: MediaDto;
  @IsOptional()
  @ValidateNested()
  @Type(() => MediaDto)
  video?: { videoUrl?: string; script?: string };
}

class ApproveDto {
  @IsOptional()
  @IsBoolean()
  publishNow?: boolean;
}

@Controller('campaigns')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CampaignsController {
  constructor(
    private campaigns: CampaignsService,
    private scheduler: CampaignScheduler,
  ) {}

  @Get()
  list(
    @Req() req: { user: JwtPayload },
    @Query('clientId') clientId?: string,
  ) {
    return this.campaigns.list(req.user, clientId);
  }

  @Post('ops/run-batch')
  @Roles('admin')
  runBatch() {
    return this.scheduler.runBatch('admin-manual');
  }

  @Get(':id')
  one(@Req() req: { user: JwtPayload }, @Param('id') id: string) {
    return this.campaigns.get(req.user, id);
  }

  @Post()
  create(@Req() req: { user: JwtPayload }, @Body() body: CreateCampaignDto) {
    return this.campaigns.create(req.user, body);
  }

  @Put(':id')
  update(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
    @Body() body: UpdateCampaignDto,
  ) {
    return this.campaigns.update(req.user, id, body);
  }

  @Post(':id/generate')
  generate(@Req() req: { user: JwtPayload }, @Param('id') id: string) {
    return this.campaigns.generate(req.user, id);
  }

  @Post(':id/approve')
  approve(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
    @Body() body: ApproveDto,
  ) {
    return this.campaigns.approve(req.user, id, Boolean(body?.publishNow));
  }

  @Post(':id/publish')
  publish(@Req() req: { user: JwtPayload }, @Param('id') id: string) {
    return this.campaigns.publish(req.user, id);
  }
}
