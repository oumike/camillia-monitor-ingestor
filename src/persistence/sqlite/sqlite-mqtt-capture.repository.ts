import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import {
  ChannelTopicCount,
  MqttCapture,
  MqttCaptureReport,
  MqttCaptureRepository,
  MqttCapturesQuery,
  RecordCaptureResult,
} from '../repositories';
import { MqttCaptureEntity } from './entities/mqtt-capture.entity';

/**
 * Turns the driver's raw datetime text into a Date.
 *
 * TypeORM's better-sqlite3 driver writes datetimes as `YYYY-MM-DD HH:MM:SS.mmm`
 * in UTC, with no zone marker. `new Date()` parses that shape as *local* time,
 * so west of UTC every timestamp lands in the future and every age computed
 * from it comes out negative. Entity-mapped reads are unaffected — TypeORM
 * converts those itself — but a raw query returns the string untouched.
 */
function parseSqliteUtc(value: string | Date): Date {
  if (value instanceof Date) return value;
  return new Date(value.replace(' ', 'T') + 'Z');
}

@Injectable()
export class SqliteMqttCaptureRepository implements MqttCaptureRepository {
  constructor(
    @InjectRepository(MqttCaptureEntity)
    private readonly captures: Repository<MqttCaptureEntity>,
  ) {}

  count(): Promise<number> {
    return this.captures.count();
  }

  async countChannels(): Promise<number> {
    // COUNT(DISTINCT channel) rather than loading rows: the answer is one
    // integer and the table grows without bound.
    const row = await this.captures
      .createQueryBuilder('c')
      .select('COUNT(DISTINCT c.channel)', 'count')
      .where('c.channel IS NOT NULL')
      .getRawOne<{ count: number }>();
    return Number(row?.count ?? 0);
  }

  async channelTopicCounts(): Promise<ChannelTopicCount[]> {
    const rows = await this.captures
      .createQueryBuilder('c')
      .select('c.channel', 'channel')
      .addSelect('COUNT(*)', 'topics')
      .addSelect('MAX(c.last_seen_at)', 'lastSeenAt')
      .where('c.channel IS NOT NULL')
      .groupBy('c.channel')
      .orderBy('topics', 'DESC')
      .getRawMany<{ channel: string; topics: number; lastSeenAt: string }>();
    return rows.map((r) => ({
      channel: r.channel,
      topics: Number(r.topics),
      lastSeenAt: parseSqliteUtc(r.lastSeenAt),
    }));
  }

  async findRecent(query: MqttCapturesQuery): Promise<MqttCapture[]> {
    const rows = await this.captures.find({
      where: query.channel ? { channel: query.channel } : {},
      order: { lastSeenAt: 'DESC' },
      take: query.limit,
    });
    return rows.map((row) => this.toDomain(row));
  }

  async record(report: MqttCaptureReport): Promise<RecordCaptureResult> {
    const existing = await this.captures.findOne({ where: { topic: report.topic } });

    if (!existing) {
      const created = this.captures.create({
        topic: report.topic,
        channel: report.channel,
        lastSeenAt: report.seenAt,
      });
      return { capture: this.toDomain(await this.captures.save(created)), created: true };
    }

    // A late-arriving batch must not drag the last-seen time backwards.
    if (report.seenAt > existing.lastSeenAt) existing.lastSeenAt = report.seenAt;
    // Fill in a channel an earlier report could not parse, but never blank one out.
    existing.channel = existing.channel ?? report.channel;

    return { capture: this.toDomain(await this.captures.save(existing)), created: false };
  }

  private toDomain(entity: MqttCaptureEntity): MqttCapture {
    return { ...entity };
  }
}
