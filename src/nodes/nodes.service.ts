import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  MeshNode,
  NODE_REPOSITORY,
  NodeHeardReport,
  NodeRepository,
} from '../persistence/repositories';
import { HeardNodeRequest } from './dto/heard-node.request';
import { HeardNodesQueryDto } from './dto/heard-nodes.query';
import {
  HeardNodeResponse,
  HeardNodesResponse,
  NodeCountResponse,
  RecordedNodeResponse,
} from './dto/node.response';
import { normaliseNodeId, toNodeId } from './node-id.util';

/** Meshtastic devices frequently report an unset or badly skewed clock. */
const EARLIEST_PLAUSIBLE_RX_TIME_MS = Date.UTC(2020, 0, 1);
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;

const DEGREES_PER_UNIT = 1e-7;
/** 1e-7 degree units carry seven decimal places and no more. */
const DEGREE_DECIMALS = 7;

function toDegrees(units: number | null): number | null {
  return units === null ? null : Number((units * DEGREES_PER_UNIT).toFixed(DEGREE_DECIMALS));
}

@Injectable()
export class NodesService {
  private readonly logger = new Logger(NodesService.name);

  constructor(@Inject(NODE_REPOSITORY) private readonly nodes: NodeRepository) {}

  async recordHeard(request: HeardNodeRequest): Promise<RecordedNodeResponse> {
    const report: NodeHeardReport = {
      nodeNum: request.nodeNum,
      nodeId: this.resolveNodeId(request),
      longName: request.longName,
      shortName: request.shortName,
      hwModel: this.resolveHwModel(request),
      hwModelNum: request.hwModelNum,
      role: request.role,
      lastHeardAt: this.resolveHeardAt(request),
      lastHeardBy: request.heardBy,
      snr: request.snr,
      rssi: request.rssi,
      hopsAway: request.hopsAway,
      viaMqtt: request.viaMqtt,
      latitudeI: request.latitudeI,
      longitudeI: request.longitudeI,
      altitude: request.altitude,
      precisionBits: request.precisionBits,
      batteryLevel: request.batteryLevel,
      voltage: request.voltage,
    };

    const { node, created } = await this.nodes.recordHeard(report);

    // The store's own total, counted after the write, travels back with every
    // report. It is what the reporting device displays, so it must not be
    // something the device derives: only the store can see the nodes other
    // reporters have added since that device booted.
    const totalNodes = await this.nodes.count();

    return { ...this.toResponse(node), created, totalNodes };
  }

  /**
   * How many nodes the store knows about. Its own endpoint rather than a field
   * on /status because a reporting device fetches this on every boot and should
   * not have to parse a health payload to get one integer.
   */
  async countNodes(): Promise<NodeCountResponse> {
    return { count: await this.nodes.count() };
  }

  async listHeard(query: HeardNodesQueryDto): Promise<HeardNodesResponse> {
    const nodes = await this.nodes.findRecentlyHeard({
      since: query.since,
      limit: query.limit,
    });

    return {
      nodes: nodes.map((node) => this.toResponse(node)),
      count: nodes.length,
      since: query.since?.toISOString(),
    };
  }

  /**
   * The id an upsert matches on.
   *
   * A reported id is accepted only when it agrees with the one `nodeNum`
   * derives, which in Meshtastic it always should — `User.id` is by construction
   * the hex of the node number. A disagreement means a malformed or spoofed
   * NodeInfo, and honouring it would split one node across two rows: bare
   * receptions (which carry no id) would key on the derived value while its
   * NodeInfo packets keyed on the claimed one.
   */
  private resolveNodeId(request: HeardNodeRequest): string {
    const derived = toNodeId(request.nodeNum);
    const reported = normaliseNodeId(request.nodeId);

    if (reported && reported !== derived) {
      this.logger.warn(
        `Node ${derived} announced id ${reported}, which does not match its node number; using ${derived}.`,
      );
    }
    return derived;
  }

  /**
   * Falls back to 'Unknown' when the reporter recognised no name for the model
   * but did send its enum value. Storing the placeholder rather than null keeps
   * "we know there is a model, we just cannot name it" distinct from "we have
   * never heard a NodeInfo from this node" — and `hwModelNum` carries the value
   * a later lookup would resolve.
   */
  private resolveHwModel(request: HeardNodeRequest): string | undefined {
    if (request.hwModel) {
      return request.hwModel;
    }
    return request.hwModelNum === undefined ? undefined : 'Unknown';
  }

  /**
   * Trusts the device clock only when it lands in a plausible window; otherwise
   * the arrival time is the better estimate of when the node was heard.
   */
  private resolveHeardAt(request: HeardNodeRequest): Date {
    const now = Date.now();
    if (request.rxTime === undefined) {
      return new Date(now);
    }

    const reported = request.rxTime * 1000;
    if (reported < EARLIEST_PLAUSIBLE_RX_TIME_MS || reported > now + MAX_CLOCK_SKEW_MS) {
      this.logger.warn(
        `Node ${toNodeId(request.nodeNum)} reported implausible rxTime ${request.rxTime}; using arrival time.`,
      );
      return new Date(now);
    }

    return new Date(reported);
  }

  private toResponse(node: MeshNode): HeardNodeResponse {
    return {
      nodeNum: node.nodeNum,
      nodeId: node.nodeId,
      longName: node.longName,
      shortName: node.shortName,
      hwModel: node.hwModel,
      hwModelNum: node.hwModelNum,
      role: node.role,
      lastHeardAt: node.lastHeardAt?.toISOString() ?? null,
      lastHeardBy: node.lastHeardBy,
      signal: {
        snr: node.snr,
        rssi: node.rssi,
        hopsAway: node.hopsAway,
        viaMqtt: node.viaMqtt,
      },
      position: {
        latitude: toDegrees(node.latitudeI),
        longitude: toDegrees(node.longitudeI),
        latitudeI: node.latitudeI,
        longitudeI: node.longitudeI,
        altitude: node.altitude,
        precisionBits: node.precisionBits,
      },
      batteryLevel: node.batteryLevel,
      voltage: node.voltage,
      firstHeardAt: node.firstHeardAt.toISOString(),
      updatedAt: node.updatedAt.toISOString(),
    };
  }
}
