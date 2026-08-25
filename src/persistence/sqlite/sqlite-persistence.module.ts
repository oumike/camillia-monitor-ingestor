import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppConfig } from '../../config/configuration';
import {
  MESSAGE_REPOSITORY,
  MQTT_CAPTURE_REPOSITORY,
  NODE_REPOSITORY,
  STORAGE_HEALTH_INDICATOR,
} from '../repositories';
import { MessageEntity } from './entities/message.entity';
import { MqttCaptureEntity } from './entities/mqtt-capture.entity';
import { NodeEntity } from './entities/node.entity';
import { SqliteMessageRepository } from './sqlite-message.repository';
import { SqliteMqttCaptureRepository } from './sqlite-mqtt-capture.repository';
import { SqliteNodeRepository } from './sqlite-node.repository';
import { SqliteStorageHealthIndicator } from './sqlite-storage-health.indicator';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => ({
        type: 'better-sqlite3' as const,
        database: config.get('database', { infer: true }).sqlite.database,
        entities: [NodeEntity, MessageEntity, MqttCaptureEntity],
        // Fine while the schema is young; swap for migrations before this
        // service holds anything worth keeping.
        synchronize: true,
      }),
    }),
    TypeOrmModule.forFeature([NodeEntity, MessageEntity, MqttCaptureEntity]),
  ],
  providers: [
    { provide: NODE_REPOSITORY, useClass: SqliteNodeRepository },
    { provide: MESSAGE_REPOSITORY, useClass: SqliteMessageRepository },
    { provide: MQTT_CAPTURE_REPOSITORY, useClass: SqliteMqttCaptureRepository },
    { provide: STORAGE_HEALTH_INDICATOR, useClass: SqliteStorageHealthIndicator },
  ],
  exports: [
    NODE_REPOSITORY,
    MESSAGE_REPOSITORY,
    MQTT_CAPTURE_REPOSITORY,
    STORAGE_HEALTH_INDICATOR,
  ],
})
export class SqlitePersistenceModule {}
