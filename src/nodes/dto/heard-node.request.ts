import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MESHTASTIC_PRESET_NAMES, MeshtasticPresetName } from '../../meshtastic-presets';

/**
 * A single "I heard this node" report from our firmware. Field names follow the
 * Meshtastic protobufs so the firmware can forward what it already has.
 */
export class HeardNodeRequest {
  @ApiProperty({
    example: 123456789,
    minimum: 1,
    maximum: 0xfffffffe,
    description:
      'Meshtastic node number. The broadcast address (4294967295) and 0 are rejected — neither is a real node.',
  })
  @IsInt()
  @Min(1)
  @Max(0xfffffffe)
  nodeNum!: number;

  @ApiPropertyOptional({
    enum: MESHTASTIC_PRESET_NAMES,
    example: 'LongFast',
    description: 'Modem preset on which the reporting monitor heard this node.',
  })
  @IsOptional()
  @IsIn(MESHTASTIC_PRESET_NAMES)
  preset?: MeshtasticPresetName;

  @ApiPropertyOptional({
    example: '!075bcd15',
    description:
      "The node's own id as it announced it in a NodeInfo packet. Optional: it is " +
      'derived from `nodeNum` when absent, which is what a bare reception carries.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^!?[0-9a-fA-F]{8}$/, { message: 'nodeId must be 8 hex digits, optionally prefixed with "!".' })
  nodeId?: string;

  @ApiPropertyOptional({ example: 'Ridgeline Repeater', maxLength: 40 })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  longName?: string;

  @ApiPropertyOptional({ example: 'RDGE', maxLength: 8 })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  shortName?: string;

  @ApiPropertyOptional({ example: 'HELTEC_V3', description: 'HardwareModel enum name.' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  hwModel?: string;

  @ApiPropertyOptional({ example: 'ROUTER', description: 'Device role enum name.' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  role?: string;

  @ApiPropertyOptional({
    example: 43,
    minimum: 0,
    maximum: 255,
    description:
      'Raw HardwareModel enum value. Firmware sends this even when it has no name for the ' +
      'model, because the number is the part that cannot be recovered later — a name can be ' +
      'resolved from it whenever one becomes known.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(255)
  hwModelNum?: number;

  @ApiPropertyOptional({
    example: 1755990000,
    description:
      'Reception time in epoch seconds, from the reporting device (Meshtastic `rx_time`). Device clocks are often unset or wrong; the server falls back to its own clock when this is absent, and always records its own ingest time separately.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  rxTime?: number;

  @ApiPropertyOptional({
    example: '!075bcd15',
    description: 'Node id of the reporting gateway. Defaults to the caller-supplied value only.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  heardBy?: string;

  @ApiPropertyOptional({ example: -8.5, description: 'Signal-to-noise ratio, dB.' })
  @IsOptional()
  @IsNumber()
  snr?: number;

  @ApiPropertyOptional({ example: -96, description: 'Received signal strength, dBm.' })
  @IsOptional()
  @IsInt()
  rssi?: number;

  @ApiPropertyOptional({
    example: 2,
    minimum: 0,
    maximum: 7,
    description: 'Hops travelled, i.e. `hop_start - hop_limit`.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(7)
  hopsAway?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'True when heard via MQTT rather than over the air — RF metrics are then not the mesh’s.',
  })
  @IsOptional()
  @IsBoolean()
  viaMqtt?: boolean;

  @ApiPropertyOptional({ example: 371234567, description: 'Latitude in 1e-7 degrees.' })
  @IsOptional()
  @IsInt()
  @Min(-900000000)
  @Max(900000000)
  latitudeI?: number;

  @ApiPropertyOptional({ example: -1221234567, description: 'Longitude in 1e-7 degrees.' })
  @IsOptional()
  @IsInt()
  @Min(-1800000000)
  @Max(1800000000)
  longitudeI?: number;

  @ApiPropertyOptional({ example: 812, description: 'Metres above mean sea level.' })
  @IsOptional()
  @IsInt()
  altitude?: number;

  @ApiPropertyOptional({
    example: 16,
    minimum: 0,
    maximum: 32,
    description: 'Bits of position precision the sender kept. Low values mean a deliberately blurred fix.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(32)
  precisionBits?: number;

  @ApiPropertyOptional({
    example: 84,
    minimum: 0,
    maximum: 255,
    description: 'Battery percentage. Values above 100 mean the node is externally powered.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(255)
  batteryLevel?: number;

  @ApiPropertyOptional({ example: 3.98, description: 'Battery voltage, volts.' })
  @IsOptional()
  @IsNumber()
  voltage?: number;
}
