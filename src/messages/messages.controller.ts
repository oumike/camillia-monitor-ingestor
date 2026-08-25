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
import { HeardMessageRequest } from './dto/heard-message.request';
import { RecentMessagesQueryDto } from './dto/recent-messages.query';
import {
  MessageCountResponse,
  MessagesResponse,
  RecordedMessageResponse,
} from './dto/message.response';
import { MessagesService } from './messages.service';

@ApiTags('messages')
@Controller('messages')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  @ApiOperation({
    summary: 'List messages heard',
    description:
      'Packets heard on the air, most recent first. "Message" means any Meshtastic packet, ' +
      'not only text: telemetry and position frames are equally things that were said.',
  })
  @ApiOkResponse({ type: MessagesResponse })
  listRecent(@Query() query: RecentMessagesQueryDto): Promise<MessagesResponse> {
    return this.messagesService.listRecent(query);
  }

  @Get('count')
  @ApiOperation({
    summary: 'Count stored messages',
    description:
      'Distinct packets stored. Rebroadcast copies of one packet count once — see the ' +
      'reception count on each message.',
  })
  @ApiOkResponse({ type: MessageCountResponse })
  countMessages(): Promise<MessageCountResponse> {
    return this.messagesService.countMessages();
  }

  @Post('heard')
  @UseGuards(ApiKeyGuard)
  @ApiSecurity(API_KEY_SCHEME)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Report a message heard',
    description:
      'Records one packet reception. A mesh rebroadcasts heavily, so a packet already stored ' +
      'has its reception count raised and its signal details refreshed rather than being ' +
      'duplicated. A copy that decodes replaces one previously logged as encrypted.',
  })
  @ApiOkResponse({ type: RecordedMessageResponse })
  @ApiBadRequestResponse({ description: 'Malformed report.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid API key.' })
  recordHeard(@Body() request: HeardMessageRequest): Promise<RecordedMessageResponse> {
    return this.messagesService.recordHeard(request);
  }
}
