import { ApiProperty } from '@nestjs/swagger';
import { MESHTASTIC_PRESET_NAMES, MeshtasticPresetName } from '../../meshtastic-presets';

export class MessageResponse {
  @ApiProperty({ example: '!075bcd15:2864434397' })
  id!: string;

  @ApiProperty({ example: 2864434397 })
  packetId!: number;

  @ApiProperty({ example: '!075bcd15' })
  fromId!: string;

  @ApiProperty({ example: 123456789 })
  fromNum!: number;

  @ApiProperty({ example: '!ffffffff' })
  toId!: string;

  @ApiProperty({ example: 4294967295 })
  toNum!: number;

  @ApiProperty({ example: true })
  broadcast!: boolean;

  @ApiProperty({ enum: MESHTASTIC_PRESET_NAMES, nullable: true, example: 'LongFast' })
  preset!: MeshtasticPresetName | null;

  @ApiProperty({ type: Number, nullable: true, example: 1 })
  portnum!: number | null;

  @ApiProperty({ type: String, nullable: true, example: 'TEXT_MESSAGE_APP' })
  portName!: string | null;

  @ApiProperty({ type: Number, nullable: true, example: 8 })
  channel!: number | null;

  @ApiProperty({ example: false, description: 'Payload could not be read.' })
  encrypted!: boolean;

  @ApiProperty({ type: String, nullable: true, example: 'Net check, anyone up?' })
  text!: string | null;

  @ApiProperty({
    description: 'Telemetry carried by the packet; all null unless it was a telemetry frame.',
  })
  telemetry!: {
    batteryLevel: number | null;
    voltage: number | null;
    channelUtilization: number | null;
    airUtilTx: number | null;
    temperature: number | null;
    humidity: number | null;
    pressure: number | null;
  };

  @ApiProperty({ description: 'Details of the most recent copy heard.' })
  reception!: {
    heardAt: string;
    heardBy: string | null;
    snr: number | null;
    rssi: number | null;
    hopsAway: number | null;
    viaMqtt: boolean;
    /** Copies reported — a mesh rebroadcasts heavily. */
    receptions: number;
  };

  @ApiProperty({ example: '2026-08-23T23:34:36.000Z' })
  firstHeardAt!: string;
}

export class MessagesResponse {
  @ApiProperty({ type: [MessageResponse] })
  messages!: MessageResponse[];

  @ApiProperty({ example: 25 })
  count!: number;
}

export class RecordedMessageResponse extends MessageResponse {
  @ApiProperty({
    example: true,
    description:
      'True when this report stored a new packet rather than adding a reception to one ' +
      'already held. Lets a reporting device keep a running total without re-querying.',
  })
  created!: boolean;
}

export class MessageCountResponse {
  @ApiProperty({ example: 1284 })
  count!: number;
}
