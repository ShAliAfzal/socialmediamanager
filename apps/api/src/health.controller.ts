import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  health() {
    return { ok: true, service: 'socialmediamanager', ts: new Date().toISOString() };
  }
}
