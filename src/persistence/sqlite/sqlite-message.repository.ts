import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';

import {
  MeshMessage,
  MessageHeardReport,
  MessageRepository,
  RecentMessagesQuery,
  RecordMessageResult,
} from '../repositories';
import { MessageEntity } from './entities/message.entity';

@Injectable()
export class SqliteMessageRepository implements MessageRepository {
  constructor(
    @InjectRepository(MessageEntity)
    private readonly messages: Repository<MessageEntity>,
  ) {}

  count(): Promise<number> {
    return this.messages.count();
  }

  async findRecent(query: RecentMessagesQuery): Promise<MeshMessage[]> {
    const where: Record<string, unknown> = {};
    if (query.since) where.heardAt = MoreThanOrEqual(query.since);
    if (query.fromId) where.fromId = query.fromId;

    const rows = await this.messages.find({
      where,
      order: { heardAt: 'DESC' },
      take: query.limit,
    });
    return rows.map((row) => this.toDomain(row));
  }

  async recordHeard(report: MessageHeardReport): Promise<RecordMessageResult> {
    const existing = await this.messages.findOne({ where: { id: report.id } });

    if (!existing) {
      const created = this.messages.create({ ...report, receptions: 1 });
      return { message: this.toDomain(await this.messages.save(created)), created: true };
    }

    // A second copy of a packet already stored. Its content cannot have changed
    // — it is the same packet — so only the reception is merged: the count goes
    // up, and the signal details follow whichever copy arrived latest.
    existing.receptions += 1;
    if (report.heardAt > existing.heardAt) {
      existing.heardAt = report.heardAt;
      existing.heardBy = report.heardBy;
      existing.preset = report.preset;
      existing.snr = report.snr;
      existing.rssi = report.rssi;
      existing.hopsAway = report.hopsAway;
      existing.viaMqtt = report.viaMqtt;
    }

    // A later copy may decode where the first did not: a listener that has since
    // been given the channel key can read a packet it originally logged as
    // encrypted. Never the reverse — decoded content is not discarded.
    if (existing.encrypted && !report.encrypted) {
      existing.encrypted = false;
      existing.portnum = report.portnum;
      existing.portName = report.portName;
      existing.text = report.text;
      existing.batteryLevel = report.batteryLevel;
      existing.voltage = report.voltage;
      existing.channelUtilization = report.channelUtilization;
      existing.airUtilTx = report.airUtilTx;
      existing.temperature = report.temperature;
      existing.humidity = report.humidity;
      existing.pressure = report.pressure;
    }

    return { message: this.toDomain(await this.messages.save(existing)), created: false };
  }

  private toDomain(entity: MessageEntity): MeshMessage {
    return { ...entity };
  }
}
