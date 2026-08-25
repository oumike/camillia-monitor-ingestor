import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsString, MaxLength } from 'class-validator';

export class MqttCaptureRequest {
  @ApiProperty({
    type: [String],
    example: ['msh/US/MI/2/e/KAM-NET/!699c90c8', 'msh/US/MI/2/e/CFW/!b2a77a48'],
    description:
      'Topics observed since the last report. Sent as a batch because a census produces ' +
      'many topics at once and one request per topic would be mostly HTTP overhead. ' +
      'Re-reporting a known topic is harmless — it just refreshes its last-seen time.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(64)
  @IsString({ each: true })
  @MaxLength(255, { each: true })
  topics!: string[];
}
