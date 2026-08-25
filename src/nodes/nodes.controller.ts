import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiOkResponse,
  ApiOperation,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { API_KEY_SCHEME, ApiKeyGuard } from '../auth/api-key.guard';
import { HeardNodeRequest } from './dto/heard-node.request';
import { HeardNodesQueryDto } from './dto/heard-nodes.query';
import {
  HeardNodesResponse,
  NodeCountResponse,
  RecordedNodeResponse,
} from './dto/node.response';
import { NodesService } from './nodes.service';

@ApiTags('nodes')
@Controller('nodes')
export class NodesController {
  constructor(private readonly nodesService: NodesService) {}

  @Get('heard')
  @ApiOperation({
    summary: 'List nodes heard',
    description:
      'Nodes the mesh has been heard from, most recently heard first. A node missing from this list only means none of our gateways heard it — never that it is offline.',
  })
  @ApiOkResponse({ type: HeardNodesResponse })
  listHeard(@Query() query: HeardNodesQueryDto): Promise<HeardNodesResponse> {
    return this.nodesService.listHeard(query);
  }

  @Get('count')
  @ApiOperation({
    summary: 'Count stored nodes',
    description:
      'How many nodes the store knows about. Deliberately its own route rather than a field ' +
      'on /status: reporting devices fetch this at boot to seed a running total, and should ' +
      'not have to parse a health payload for one integer.',
  })
  @ApiOkResponse({ type: NodeCountResponse })
  countNodes(): Promise<NodeCountResponse> {
    return this.nodesService.countNodes();
  }

  @Post('heard')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity(API_KEY_SCHEME)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Report a node heard',
    description:
      'Records one reception reported by our firmware. Upserts by node number: fields left out keep their previously known values, so a bare signal report will not erase names learned earlier.',
  })
  @ApiOkResponse({ type: RecordedNodeResponse, description: 'The node as it now stands.' })
  @ApiBadRequestResponse({ description: 'Malformed report, or a node number that is not a real node.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid API key.' })
  recordHeard(@Body() request: HeardNodeRequest): Promise<RecordedNodeResponse> {
    return this.nodesService.recordHeard(request);
  }
}
