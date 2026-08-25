import { ApiProperty } from '@nestjs/swagger';

export class MqttCaptureResponse {
  @ApiProperty({ example: 'msh/US/MI/2/e/KAM-NET/!699c90c8' })
  topic!: string;

  @ApiProperty({ type: String, nullable: true, example: 'KAM-NET' })
  channel!: string | null;

  @ApiProperty({ example: '2026-08-23T23:34:36.000Z' })
  firstSeenAt!: string;

  @ApiProperty({ example: '2026-08-24T01:12:04.000Z' })
  lastSeenAt!: string;
}

export class MqttCapturesResponse {
  @ApiProperty({ type: [MqttCaptureResponse] })
  captures!: MqttCaptureResponse[];

  @ApiProperty({ example: 12 })
  count!: number;
}

export class MqttCaptureAcceptedResponse {
  @ApiProperty({ example: 12, description: 'Topics in the batch that were accepted.' })
  accepted!: number;

  @ApiProperty({ example: 3, description: 'Topics stored for the first time.' })
  created!: number;

  @ApiProperty({ example: 47, description: 'Distinct topics now stored in total.' })
  total!: number;

  @ApiProperty({
    example: 9,
    description:
      'Distinct channels now stored. Returned with every batch so a reporting device can ' +
      'keep the figure current without a second round trip.',
  })
  channels!: number;
}

export class MqttCaptureCountResponse {
  @ApiProperty({ example: 47, description: 'Distinct topics stored.' })
  count!: number;
}

export class MqttChannelCountResponse {
  @ApiProperty({ example: 9, description: 'Distinct channels stored.' })
  count!: number;
}

export class ChannelTopicCountResponse {
  @ApiProperty({ example: 'KAM-NET' })
  channel!: string;

  @ApiProperty({ example: 3, description: 'Distinct topics stored on this channel.' })
  topics!: number;
}

export class ChannelsResponse {
  @ApiProperty({ type: [ChannelTopicCountResponse] })
  channels!: ChannelTopicCountResponse[];

  @ApiProperty({ example: 9, description: 'Distinct channels.' })
  count!: number;

  @ApiProperty({ example: 47, description: 'Distinct topics across all channels.' })
  topics!: number;
}
