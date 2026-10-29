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
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { JwtPayload } from '../auth/jwt.strategy';
import { AgentService } from './agent.service';
import { AgentTaskType } from './agent-run.schema';

class CreateAgentRunDto {
  @IsString()
  clientId!: string;

  @IsIn(['image_post', 'content_pack', 'custom'])
  taskType!: AgentTaskType;

  @IsString()
  @MinLength(4)
  instructions!: string;

  @IsOptional()
  @IsString()
  topic?: string;
}

@Controller('agent')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AgentController {
  constructor(private agent: AgentService) {}

  @Get('runs')
  list(@Query('clientId') clientId?: string) {
    return this.agent.list(clientId);
  }

  @Get('runs/:id')
  one(@Param('id') id: string) {
    return this.agent.get(id);
  }

  @Post('runs')
  create(@Body() body: CreateAgentRunDto) {
    return this.agent.create(body);
  }

  @Post('runs/:id/to-campaign')
  toCampaign(
    @Req() req: { user: JwtPayload },
    @Param('id') id: string,
  ) {
    return this.agent.toCampaign(req.user, id);
  }
}
