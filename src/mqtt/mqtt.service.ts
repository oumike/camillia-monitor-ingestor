import { Inject, Injectable } from '@nestjs/common';

import {
  MQTT_CAPTURE_REPOSITORY,
  MqttCapture,
  MqttCaptureRepository,
} from '../persistence/repositories';
import { MqttCaptureRequest } from './dto/mqtt-capture.request';
import {
  MqttCaptureAcceptedResponse,
  MqttCaptureCountResponse,
  MqttCaptureResponse,
  MqttCapturesResponse,
  ChannelsResponse,
  MqttChannelCountResponse,
} from './dto/mqtt-capture.response';
import { MqttCapturesQueryDto } from './dto/mqtt-captures.query';
import { parseTopic } from './topic.util';

@Injectable()
export class MqttService {
  constructor(
    @Inject(MQTT_CAPTURE_REPOSITORY) private readonly captures: MqttCaptureRepository,
  ) {}

  async record(request: MqttCaptureRequest): Promise<MqttCaptureAcceptedResponse> {
    const seenAt = new Date();
    let created = 0;

    // Duplicates within one batch are possible and harmless; the second simply
    // refreshes the last-seen time the first just set.
    for (const topic of request.topics) {
      const { channel } = parseTopic(topic);
      const result = await this.captures.record({ topic, channel, seenAt });
      if (result.created) created++;
    }

    // The running total comes back so a reporting device can show what the
    // store holds without a second round trip.
    return {
      accepted: request.topics.length,
      created,
      total: await this.captures.count(),
      channels: await this.captures.countChannels(),
    };
  }

  async listRecent(query: MqttCapturesQueryDto): Promise<MqttCapturesResponse> {
    const rows = await this.captures.findRecent({
      limit: query.limit,
      channel: query.channel,
    });
    return { captures: rows.map((r) => this.toResponse(r)), count: rows.length };
  }

  async countTopics(): Promise<MqttCaptureCountResponse> {
    return { count: await this.captures.count() };
  }

  async listChannels(): Promise<ChannelsResponse> {
    const channels = await this.captures.channelTopicCounts();
    return {
      channels,
      count: channels.length,
      topics: channels.reduce((sum, c) => sum + c.topics, 0),
    };
  }

  async countChannels(): Promise<MqttChannelCountResponse> {
    return { count: await this.captures.countChannels() };
  }

  private toResponse(c: MqttCapture): MqttCaptureResponse {
    return {
      topic: c.topic,
      channel: c.channel,
      firstSeenAt: c.firstSeenAt.toISOString(),
      lastSeenAt: c.lastSeenAt.toISOString(),
    };
  }
}
