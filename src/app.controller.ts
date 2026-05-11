import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getStatus() {
    return { api: 'TramaCowork', version: '1.0' };
  }
}
