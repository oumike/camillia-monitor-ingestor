import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, Max, Min } from 'class-validator';

export const DEFAULT_HEARD_NODES_LIMIT = 100;
export const MAX_HEARD_NODES_LIMIT = 1000;

export class HeardNodesQueryDto {
  @ApiPropertyOptional({
    example: '2026-08-23T00:00:00.000Z',
    description: 'Only return nodes heard at or after this instant.',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  since?: Date;

  @ApiPropertyOptional({
    default: DEFAULT_HEARD_NODES_LIMIT,
    minimum: 1,
    maximum: MAX_HEARD_NODES_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_HEARD_NODES_LIMIT)
  limit: number = DEFAULT_HEARD_NODES_LIMIT;
}
