import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { configuration } from './config/configuration';
import { MessagesModule } from './messages/messages.module';
import { MqttModule } from './mqtt/mqtt.module';
import { NodesModule } from './nodes/nodes.module';
import { PersistenceModule } from './persistence/persistence.module';
import { StatusModule } from './status/status.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    PersistenceModule.forRoot(),
    NodesModule,
    MessagesModule,
    MqttModule,
    StatusModule,
  ],
})
export class AppModule {}
