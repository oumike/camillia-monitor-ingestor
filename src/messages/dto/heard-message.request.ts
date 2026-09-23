import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MESHTASTIC_PRESET_NAMES, MeshtasticPresetName } from '../../meshtastic-presets';

/**
 * One packet the firmware heard. Field names follow the Meshtastic protobufs so
 * the firmware forwards what it already holds.
 *
 * Everything except the identity and address fields is optional: a packet on a
 * channel the listener has no key for yields nothing but a header.
 */
export class HeardMessageRequest {
  @ApiProperty({
    example: 2864434397,
    description: 'Meshtastic packet id. Unique per sender, not across the mesh.',
  })
  @IsInt()
  @Min(0)
  @Max(0xffffffff)
  packetId!: number;

  @ApiPropertyOptional({
    enum: MESHTASTIC_PRESET_NAMES,
    example: 'LongFast',
    description: 'Modem preset on which the reporting monitor received this packet.',
  })
  @IsOptional()
  @IsIn(MESHTASTIC_PRESET_NAMES)
  preset?: MeshtasticPresetName;

  @ApiProperty({ example: 123456789, description: 'Sending node number.' })
  @IsInt()
  @Min(1)
  @Max(0xfffffffe)
  fromNum!: number;

  @ApiProperty({
    example: 4294967295,
    description: 'Destination node number. 4294967295 is the broadcast address.',
  })
  @IsInt()
  @Min(0)
  @Max(0xffffffff)
  toNum!: number;

  @ApiPropertyOptional({ example: 8, description: 'On-air channel hash.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(255)
  channel?: number;

  @ApiPropertyOptional({ example: 1, description: 'Meshtastic PortNum.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  portnum?: number;

  @ApiPropertyOptional({ example: 'TEXT_MESSAGE_APP', description: 'PortNum enum name.' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  portName?: string;

  @ApiPropertyOptional({
    example: false,
    description:
      'True when the listener held no key for the payload, so only the header is known. ' +
      'A later report that decodes the same packet replaces the unknown content.',
  })
  @IsOptional()
  @IsBoolean()
  encrypted?: boolean;

  @ApiPropertyOptional({ example: 'Net check, anyone up?', maxLength: 250 })
  @IsOptional()
  @IsString()
  @MaxLength(250)
  text?: string;

  @ApiPropertyOptional({ example: 1755990000, description: 'Reception time, epoch seconds.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  rxTime?: number;

  @ApiPropertyOptional({ example: '!075bcd15', description: 'Reporting gateway node id.' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  heardBy?: string;

  @ApiPropertyOptional({ example: -8.5 })
  @IsOptional()
  @IsNumber()
  snr?: number;

  @ApiPropertyOptional({ example: -96 })
  @IsOptional()
  @IsInt()
  rssi?: number;

  @ApiPropertyOptional({ example: 2, minimum: 0, maximum: 7 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(7)
  hopsAway?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  viaMqtt?: boolean;

  // ── Telemetry, when the packet was a telemetry frame ──────────────────────
  @ApiPropertyOptional({ example: 84, minimum: 0, maximum: 255 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(255)
  batteryLevel?: number;

  @ApiPropertyOptional({ example: 3.98 })
  @IsOptional()
  @IsNumber()
  voltage?: number;

  @ApiPropertyOptional({ example: 3.2, description: 'Channel utilisation, percent.' })
  @IsOptional()
  @IsNumber()
  channelUtilization?: number;

  @ApiPropertyOptional({ example: 0.4, description: 'Transmit airtime, percent.' })
  @IsOptional()
  @IsNumber()
  airUtilTx?: number;

  @ApiPropertyOptional({ example: 22.4, description: 'Degrees celsius.' })
  @IsOptional()
  @IsNumber()
  temperature?: number;

  @ApiPropertyOptional({ example: 41.2, description: 'Relative humidity, percent.' })
  @IsOptional()
  @IsNumber()
  humidity?: number;

  @ApiPropertyOptional({ example: 1013.2, description: 'Barometric pressure, hPa.' })
  @IsOptional()
  @IsNumber()
  pressure?: number;
}
