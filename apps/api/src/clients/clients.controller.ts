import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Post,
  Req,
  ForbiddenException,
  UseGuards,
} from '@nestjs/common';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsNumber,
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
import { ClientsService } from './clients.service';

class GitDto {
  @IsOptional() @IsString() repoUrl?: string;
  @IsOptional() @IsString() branch?: string;
  @IsOptional() @IsString() token?: string;
  @IsOptional() @IsString() contentPath?: string;
  @IsOptional() @IsBoolean() usePullRequest?: boolean;
}

class WebhookDto {
  @IsOptional() @IsString() url?: string;
  @IsOptional() @IsString() secret?: string;
}

class CreateClientDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  websiteUrl?: string;

  @IsOptional()
  @IsString()
  niche?: string;

  @IsOptional()
  @IsString()
  brandVoice?: string;

  @IsOptional()
  @IsIn(['git', 'webhook', 'both', 'none'])
  blogPublishMode?: 'git' | 'webhook' | 'both' | 'none';

  @IsOptional()
  @IsBoolean()
  autoPublish?: boolean;

  @IsEmail()
  loginEmail!: string;

  @IsString()
  @MinLength(6)
  loginPassword!: string;

  @IsOptional()
  @IsString()
  loginName?: string;
}

class UpdateClientDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() websiteUrl?: string;
  @IsOptional() @IsBoolean() autoPublish?: boolean;
  @IsOptional()
  @IsIn(['git', 'webhook', 'both', 'none'])
  blogPublishMode?: 'git' | 'webhook' | 'both' | 'none';
  @IsOptional() @IsString() niche?: string;
  @IsOptional() @IsString() brandVoice?: string;
  @IsOptional() @IsNumber() generateLeadDays?: number;
  @IsOptional() @IsNumber() maxGenerationsPerDay?: number;
  @IsOptional() @IsArray() @IsString({ each: true }) postTimes?: string[];
  @IsOptional() @IsString() timezone?: string;
  @IsOptional() @IsArray() @IsNumber({}, { each: true }) postWeekdays?: number[];
  @IsOptional() @ValidateNested() @Type(() => GitDto) git?: GitDto;
  @IsOptional() @ValidateNested() @Type(() => WebhookDto) webhook?: WebhookDto;
}

class ConnectMetaDto {
  @IsString() @MinLength(3) pageId!: string;
  @IsOptional() @IsString() pageName?: string;
  @IsString() @MinLength(10) pageToken!: string;
  @IsOptional() @IsString() igUserId?: string;
}

@Controller('clients')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientsController {
  constructor(private clients: ClientsService) {}

  private assertAccess(user: JwtPayload, clientId: string) {
    if (user.role === 'admin') return;
    if (user.clientId !== clientId) {
      throw new ForbiddenException('Not your client workspace');
    }
  }

  @Get()
  @Roles('admin')
  async list() {
    const rows = await this.clients.list();
    return rows.map((c) => this.clients.toPublic(c));
  }

  @Post()
  @Roles('admin')
  create(@Body() body: CreateClientDto) {
    return this.clients.createWorkspace(body);
  }

  @Get('me')
  @Roles('client')
  async me(@Req() req: { user: JwtPayload }) {
    if (!req.user.clientId) throw new ForbiddenException();
    const client = await this.clients.get(req.user.clientId);
    return this.clients.toPublic(client);
  }

  @Get(':id')
  async one(@Param('id') id: string, @Req() req: { user: JwtPayload }) {
    this.assertAccess(req.user, id);
    const client = await this.clients.get(id);
    return this.clients.toPublic(client);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() body: UpdateClientDto,
    @Req() req: { user: JwtPayload },
  ) {
    this.assertAccess(req.user, id);
    return this.clients.updateProfile(id, body);
  }

  @Post(':id/meta/connect')
  async connectMeta(
    @Param('id') id: string,
    @Body() body: ConnectMetaDto,
    @Req() req: { user: JwtPayload },
  ) {
    this.assertAccess(req.user, id);
    return this.clients.connectMeta(id, body);
  }

  @Post(':id/meta/verify')
  async verifyMeta(
    @Param('id') id: string,
    @Req() req: { user: JwtPayload },
  ) {
    this.assertAccess(req.user, id);
    const client = await this.clients.get(id);
    return this.clients.verifyAndPersistMeta(client);
  }
}
