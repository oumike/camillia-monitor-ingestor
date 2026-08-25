import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StorageStatusResponse {
  @ApiProperty({ example: 'sqlite', description: 'Datastore backing the repositories.' })
  driver!: string;

  @ApiProperty({ example: true, description: 'Result of the datastore liveness probe.' })
  connected!: boolean;

  @ApiPropertyOptional({
    example: 'SQLITE_CANTOPEN: unable to open database file',
    description: 'Failure reason. Present only when `connected` is false.',
  })
  error?: string;
}

export class MeshStatusResponse {
  @ApiProperty({ example: 12, description: 'Nodes currently known to the ingestor.' })
  knownNodes!: number;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '2026-08-23T22:38:13.294Z',
    description: 'ISO timestamp of the most recent packet heard from any node.',
  })
  lastHeardAt!: string | null;
}

export class StatusResponse {
  @ApiProperty({
    enum: ['ok', 'degraded'],
    example: 'ok',
    description: '`degraded` when the datastore fails its liveness probe.',
  })
  status!: 'ok' | 'degraded';

  @ApiProperty({ example: 'camillia-monitor-ingestor' })
  service!: string;

  @ApiProperty({ example: '0.1.0' })
  version!: string;

  @ApiProperty({ example: 'development' })
  environment!: string;

  @ApiProperty({ example: 3600, description: 'Process uptime in seconds.' })
  uptimeSeconds!: number;

  @ApiProperty({ example: '2026-08-23T22:38:13.294Z', description: 'Time the status was sampled.' })
  timestamp!: string;

  @ApiProperty({ type: StorageStatusResponse })
  storage!: StorageStatusResponse;

  @ApiProperty({ type: MeshStatusResponse })
  mesh!: MeshStatusResponse;
}
