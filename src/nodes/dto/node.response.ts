import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NodePositionResponse {
  @ApiProperty({ type: Number, nullable: true, example: 37.1234567, description: 'Decimal degrees.' })
  latitude!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: -122.1234567, description: 'Decimal degrees.' })
  longitude!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 371234567, description: 'Raw 1e-7 degrees, as sent.' })
  latitudeI!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: -1221234567, description: 'Raw 1e-7 degrees, as sent.' })
  longitudeI!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 812, description: 'Metres above mean sea level.' })
  altitude!: number | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 16,
    description:
      'Bits of precision the sender kept. Anything below 32 is a blurred fix — do not present it as exact.',
  })
  precisionBits!: number | null;
}

export class NodeSignalResponse {
  @ApiProperty({ type: Number, nullable: true, example: -8.5, description: 'dB.' })
  snr!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: -96, description: 'dBm.' })
  rssi!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 2, description: 'Hops travelled to reach the reporter.' })
  hopsAway!: number | null;

  @ApiProperty({ example: false, description: 'Heard via MQTT rather than over the air.' })
  viaMqtt!: boolean;
}

export class HeardNodeResponse {
  @ApiProperty({ example: 123456789 })
  nodeNum!: number;

  @ApiProperty({ example: '!075bcd15' })
  nodeId!: string;

  @ApiProperty({ type: String, nullable: true, example: 'Ridgeline Repeater' })
  longName!: string | null;

  @ApiProperty({ type: String, nullable: true, example: 'RDGE' })
  shortName!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'HELTEC_V3',
    description: "Model name, or 'Unknown' when only the raw enum value is known.",
  })
  hwModel!: string | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 43,
    description: 'Raw HardwareModel enum value, retained so a name can be resolved later.',
  })
  hwModelNum!: number | null;

  @ApiProperty({ type: String, nullable: true, example: 'ROUTER' })
  role!: string | null;


  @ApiProperty({
    type: String,
    nullable: true,
    example: '2026-08-23T22:38:13.294Z',
    description: 'When the node was last heard, per the reporting device.',
  })
  lastHeardAt!: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '!075bcd15',
    description: 'Node id of the gateway that reported hearing it.',
  })
  lastHeardBy!: string | null;

  @ApiProperty({ type: NodeSignalResponse })
  signal!: NodeSignalResponse;

  @ApiProperty({ type: NodePositionResponse })
  position!: NodePositionResponse;

  @ApiProperty({ type: Number, nullable: true, example: 84, description: 'Above 100 means externally powered.' })
  batteryLevel!: number | null;

  @ApiProperty({ type: Number, nullable: true, example: 3.98 })
  voltage!: number | null;

  @ApiProperty({ example: '2026-08-01T09:12:00.000Z', description: 'First time this service heard of the node.' })
  firstHeardAt!: string;

  @ApiProperty({ example: '2026-08-23T22:38:13.294Z', description: 'Last time this record changed.' })
  updatedAt!: string;
}

export class HeardNodesResponse {
  @ApiProperty({ type: [HeardNodeResponse] })
  nodes!: HeardNodeResponse[];

  @ApiProperty({ example: 12, description: 'Number of nodes in this response.' })
  count!: number;

  @ApiPropertyOptional({
    example: '2026-08-23T00:00:00.000Z',
    description: 'Echo of the `since` filter, when one was given.',
  })
  since?: string;
}

/**
 * The POST response: a node plus whether that report brought it into existence.
 * Separate from `HeardNodeResponse` because `created` describes the *write*, not
 * the node — a listing has no meaningful value for it.
 */
export class RecordedNodeResponse extends HeardNodeResponse {
  @ApiProperty({
    example: false,
    description:
      'True when this report created the node rather than updating one. Lets a reporting ' +
      'device keep a running total of stored nodes without re-querying — it can otherwise ' +
      'only tell that a node is new to itself.',
  })
  created!: boolean;
}

export class NodeCountResponse {
  /** Nodes currently stored. */
  @ApiProperty({ example: 42 })
  count!: number;
}
