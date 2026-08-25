import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';

import {
  HeardNodesQuery,
  MeshNode,
  NodeHeardReport,
  NodeRepository,
  RecordHeardResult,
} from '../repositories';
import { NodeEntity } from './entities/node.entity';

@Injectable()
export class SqliteNodeRepository implements NodeRepository {
  constructor(
    @InjectRepository(NodeEntity)
    private readonly nodes: Repository<NodeEntity>,
  ) {}

  count(): Promise<number> {
    return this.nodes.count();
  }

  async findLastHeardAt(): Promise<Date | null> {
    const newest = await this.nodes.find({
      order: { lastHeardAt: 'DESC' },
      take: 1,
    });
    return newest[0]?.lastHeardAt ?? null;
  }

  async findRecentlyHeard(query: HeardNodesQuery): Promise<MeshNode[]> {
    const rows = await this.nodes.find({
      where: query.since ? { lastHeardAt: MoreThanOrEqual(query.since) } : {},
      order: { lastHeardAt: 'DESC' },
      take: query.limit,
    });
    return rows.map((row) => this.toDomain(row));
  }

  async recordHeard(report: NodeHeardReport): Promise<RecordHeardResult> {
    const existing = await this.nodes.findOne({ where: { nodeId: report.nodeId } });
    const merged = this.nodes.merge(existing ?? this.blank(report), this.toEntityPatch(report));

    // A late-arriving report must not drag `lastHeardAt` backwards.
    if (existing?.lastHeardAt && existing.lastHeardAt > report.lastHeardAt) {
      merged.lastHeardAt = existing.lastHeardAt;
    }

    return {
      node: this.toDomain(await this.nodes.save(merged)),
      created: existing === null,
    };
  }

  private blank(report: NodeHeardReport): NodeEntity {
    return this.nodes.create({
      nodeId: report.nodeId,
      nodeNum: report.nodeNum,
      longName: null,
      shortName: null,
      hwModel: null,
      hwModelNum: null,
      role: null,
      lastHeardBy: null,
      snr: null,
      rssi: null,
      hopsAway: null,
      viaMqtt: false,
      latitudeI: null,
      longitudeI: null,
      altitude: null,
      precisionBits: null,
      batteryLevel: null,
      voltage: null,
    });
  }

  /**
   * Drops `undefined` fields so an observation that carries only signal metrics
   * does not erase names learned from an earlier NodeInfo packet. An explicit
   * `null` is kept and does clear the field.
   */
  private toEntityPatch(report: NodeHeardReport): Partial<NodeEntity> {
    const patch: Partial<NodeEntity> = {};
    for (const [key, value] of Object.entries(report)) {
      if (value !== undefined) {
        patch[key as keyof NodeEntity] = value as never;
      }
    }
    return patch;
  }

  private toDomain(entity: NodeEntity): MeshNode {
    return {
      nodeNum: entity.nodeNum,
      nodeId: entity.nodeId,
      longName: entity.longName,
      shortName: entity.shortName,
      hwModel: entity.hwModel,
      hwModelNum: entity.hwModelNum,
      role: entity.role,
      lastHeardAt: entity.lastHeardAt,
      lastHeardBy: entity.lastHeardBy,
      snr: entity.snr,
      rssi: entity.rssi,
      hopsAway: entity.hopsAway,
      viaMqtt: entity.viaMqtt,
      latitudeI: entity.latitudeI,
      longitudeI: entity.longitudeI,
      altitude: entity.altitude,
      precisionBits: entity.precisionBits,
      batteryLevel: entity.batteryLevel,
      voltage: entity.voltage,
      firstHeardAt: entity.firstHeardAt,
      updatedAt: entity.updatedAt,
    };
  }
}
