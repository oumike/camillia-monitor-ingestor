import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppConfig } from '../config/configuration';
import {
  NODE_REPOSITORY,
  NodeRepository,
  STORAGE_HEALTH_INDICATOR,
  StorageHealthIndicator,
} from '../persistence/repositories';
import { MeshStatusResponse, StatusResponse } from './dto/status.response';

const SERVICE_NAME = 'camillia-monitor-ingestor';

@Injectable()
export class StatusService {
  private readonly logger = new Logger(StatusService.name);
  private readonly version: string = process.env.npm_package_version ?? '0.1.0';

  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    @Inject(NODE_REPOSITORY) private readonly nodes: NodeRepository,
    @Inject(STORAGE_HEALTH_INDICATOR)
    private readonly storage: StorageHealthIndicator,
  ) {}

  async getStatus(): Promise<StatusResponse> {
    const storage = await this.storage.check();
    const mesh = storage.connected
      ? await this.readMeshStats()
      : { knownNodes: 0, lastHeardAt: null };

    return {
      status: storage.connected ? 'ok' : 'degraded',
      service: SERVICE_NAME,
      version: this.version,
      environment: this.config.get('environment', { infer: true }),
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      storage,
      mesh,
    };
  }

  private async readMeshStats(): Promise<MeshStatusResponse> {
    try {
      const [knownNodes, lastHeardAt] = await Promise.all([
        this.nodes.count(),
        this.nodes.findLastHeardAt(),
      ]);
      return { knownNodes, lastHeardAt: lastHeardAt?.toISOString() ?? null };
    } catch (error) {
      this.logger.warn(
        `Failed to read mesh stats: ${error instanceof Error ? error.message : String(error)}`,
      );
      return { knownNodes: 0, lastHeardAt: null };
    }
  }
}
