import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class RecentMessagesQueryDto {
  @ApiPropertyOptional({
    format: 'date-time',
    example: '2026-08-23T00:00:00.000Z',
    description: 'Only messages heard at or after this instant.',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  since?: Date;

  @ApiPropertyOptional({ minimum: 1, maximum: 1000, default: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit: number = 100;

  @ApiPropertyOptional({ example: '!075bcd15', description: 'Only packets sent by this node.' })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  fromId?: string;
}
