import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  MeshMessage,
  MESSAGE_REPOSITORY,
  MessageHeardReport,
  MessageRepository,
} from '../persistence/repositories';
import { BROADCAST_NODE_NUM, toNodeId } from '../nodes/node-id.util';
import { HeardMessageRequest } from './dto/heard-message.request';
import { RecentMessagesQueryDto } from './dto/recent-messages.query';
import {
  MessageCountResponse,
  MessageResponse,
  MessagesResponse,
  RecordedMessageResponse,
} from './dto/message.response';

/** Devices frequently report an unset or badly skewed clock. */
const EARLIEST_PLAUSIBLE_RX_TIME_MS = Date.UTC(2020, 0, 1);
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

@Injectable()
export class MessagesService {
  private readonly logger = new Logger(MessagesService.name);

  constructor(@Inject(MESSAGE_REPOSITORY) private readonly messages: MessageRepository) {}

  async recordHeard(request: HeardMessageRequest): Promise<RecordedMessageResponse> {
    const fromId = toNodeId(request.fromNum);

    const report: MessageHeardReport = {
      // Per-sender, not global: two nodes can and do pick the same packet id.
      id: `${fromId}:${request.packetId}`,
      packetId: request.packetId,
      fromNum: request.fromNum,
      fromId,
      toNum: request.toNum,
      toId: toNodeId(request.toNum),
      broadcast: request.toNum === BROADCAST_NODE_NUM,
      preset: request.preset ?? null,

      portnum: request.portnum ?? null,
      portName: request.portName ?? null,
      channel: request.channel ?? null,
      encrypted: request.encrypted ?? false,
      text: request.text ?? null,

      batteryLevel: request.batteryLevel ?? null,
      voltage: request.voltage ?? null,
      channelUtilization: request.channelUtilization ?? null,
      airUtilTx: request.airUtilTx ?? null,
      temperature: request.temperature ?? null,
      humidity: request.humidity ?? null,
      pressure: request.pressure ?? null,

      heardAt: this.resolveHeardAt(request),
      heardBy: request.heardBy ?? null,
      snr: request.snr ?? null,
      rssi: request.rssi ?? null,
      hopsAway: request.hopsAway ?? null,
      viaMqtt: request.viaMqtt ?? false,
    };

    const { message, created } = await this.messages.recordHeard(report);
    return { ...this.toResponse(message), created };
  }

  async listRecent(query: RecentMessagesQueryDto): Promise<MessagesResponse> {
    const messages = await this.messages.findRecent({
      since: query.since,
      limit: query.limit,
      fromId: query.fromId,
    });
    return { messages: messages.map((m) => this.toResponse(m)), count: messages.length };
  }

  async countMessages(): Promise<MessageCountResponse> {
    return { count: await this.messages.count() };
  }

  /**
   * Trusts the reporting device's clock only when it lands in a plausible
   * window; otherwise arrival time is the better estimate.
   */
  private resolveHeardAt(request: HeardMessageRequest): Date {
    const now = Date.now();
    if (request.rxTime === undefined) return new Date(now);

    const reported = request.rxTime * 1000;
    if (reported < EARLIEST_PLAUSIBLE_RX_TIME_MS || reported > now + MAX_CLOCK_SKEW_MS) {
      this.logger.warn(
        `Packet ${toNodeId(request.fromNum)}:${request.packetId} reported implausible rxTime ${request.rxTime}; using arrival time.`,
      );
      return new Date(now);
    }
    return new Date(reported);
  }

  private toResponse(m: MeshMessage): MessageResponse {
    return {
      id: m.id,
      packetId: m.packetId,
      fromId: m.fromId,
      fromNum: m.fromNum,
      toId: m.toId,
      toNum: m.toNum,
      broadcast: m.broadcast,
      preset: m.preset,
      portnum: m.portnum,
      portName: m.portName,
      channel: m.channel,
      encrypted: m.encrypted,
      text: m.text,
      telemetry: {
        batteryLevel: m.batteryLevel,
        voltage: m.voltage,
        channelUtilization: m.channelUtilization,
        airUtilTx: m.airUtilTx,
        temperature: m.temperature,
        humidity: m.humidity,
        pressure: m.pressure,
      },
      reception: {
        heardAt: m.heardAt.toISOString(),
        heardBy: m.heardBy,
        snr: m.snr,
        rssi: m.rssi,
        hopsAway: m.hopsAway,
        viaMqtt: m.viaMqtt,
        receptions: m.receptions,
      },
      firstHeardAt: m.firstHeardAt.toISOString(),
    };
  }
}
