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
import { MqttCaptureRequest } from './dto/mqtt-capture.request';
import {
  MqttCaptureAcceptedResponse,
  MqttCaptureCountResponse,
  MqttCapturesResponse,
  ChannelsResponse,
  MqttChannelCountResponse,
} from './dto/mqtt-capture.response';
import { MqttCapturesQueryDto } from './dto/mqtt-captures.query';
import { MqttService } from './mqtt.service';

@ApiTags('mqtt')
@Controller('mqtt')
export class MqttController {
  constructor(private readonly mqttService: MqttService) {}

  @Get('captures')
  @ApiOperation({
    summary: 'List MQTT topics seen',
    description: 'Topics traffic has been observed on, most recently seen first.',
  })
  @ApiOkResponse({ type: MqttCapturesResponse })
  listRecent(@Query() query: MqttCapturesQueryDto): Promise<MqttCapturesResponse> {
    return this.mqttService.listRecent(query);
  }

  @Get('captures/count')
  @ApiOperation({ summary: 'Count MQTT topics stored' })
  @ApiOkResponse({ type: MqttCaptureCountResponse })
  countTopics(): Promise<MqttCaptureCountResponse> {
    return this.mqttService.countTopics();
  }

  @Get('channels')
  @ApiOperation({
    summary: 'List channels with topic counts',
    description:
      'Every channel and how many distinct topics it holds. A monitor fetches this when its ' +
      'census screen opens, so the screen shows what the store already knows rather than ' +
      'starting from zero on every open.',
  })
  @ApiOkResponse({ type: ChannelsResponse })
  listChannels(): Promise<ChannelsResponse> {
    return this.mqttService.listChannels();
  }

  @Get('channels/count')
  @ApiOperation({
    summary: 'Count distinct MQTT channels',
    description:
      'How many distinct channels traffic has been seen on. Topics that carried no channel ' +
      'are excluded rather than counted as one anonymous channel.',
  })
  @ApiOkResponse({ type: MqttChannelCountResponse })
  countChannels(): Promise<MqttChannelCountResponse> {
    return this.mqttService.countChannels();
  }

  @Post('captures')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity(API_KEY_SCHEME)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Report MQTT captures',
    description:
      'Records a batch of topics observed on a broker. One row per topic, with when it was ' +
      'first and last seen \u2014 payloads are never decoded and individual messages are not ' +
      'stored, so this is a census of the topic space rather than a log.',
  })
  @ApiOkResponse({ type: MqttCaptureAcceptedResponse })
  @ApiBadRequestResponse({ description: 'Malformed batch.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid API key.' })
  record(@Body() request: MqttCaptureRequest): Promise<MqttCaptureAcceptedResponse> {
    return this.mqttService.record(request);
  }
}
