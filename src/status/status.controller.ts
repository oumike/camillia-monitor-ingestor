import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { StatusResponse } from './dto/status.response';
import { StatusService } from './status.service';

@ApiTags('status')
@Controller('status')
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @Get()
  @ApiOperation({
    summary: 'Service status',
    description:
      'Liveness and readiness of the ingestor: process uptime, the datastore behind it, and what it currently knows about the mesh.',
  })
  @ApiOkResponse({ type: StatusResponse })
  getStatus(): Promise<StatusResponse> {
    return this.statusService.getStatus();
  }
}
